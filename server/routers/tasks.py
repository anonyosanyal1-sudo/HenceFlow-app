from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import (
    TaskOut, CreateTaskIn, UpdateTaskIn, SubtaskModel,
    BulkUpdateTasksIn, BulkDeleteTasksIn,
)
from server.realtime import manager
import uuid

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _map(row: dict) -> TaskOut:
    raw_subtasks = row.get("subtasks") or []
    subtasks = [SubtaskModel(**s) if isinstance(s, dict) else s for s in raw_subtasks]
    return TaskOut(
        id=row["id"],
        projectId=row["project_id"],
        title=row["title"],
        description=row.get("description"),
        status=row["status"],
        priority=row["priority"],
        assigneeId=row.get("assignee_id"),
        creatorId=row["creator_id"],
        dueDate=str(row["due_date"]) if row.get("due_date") else None,
        tags=row.get("tags") or [],
        subtasks=subtasks,
        recurrenceRule=row.get("recurrence_rule"),
        recurrenceParentId=row.get("recurrence_parent_id"),
        milestoneId=row.get("milestone_id"),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def _get_project_members(project_id: str) -> list[str]:
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    return res.data.get("members") or [] if res.data else []


def _require_project_member(project_id: str, user_id: str):
    members = _get_project_members(project_id)
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


def _log_activity(task_id: str, project_id: str, user_id: str, action: str,
                  field: str = None, old_value: str = None, new_value: str = None):
    db.table("activity_logs").insert({
        "task_id": task_id,
        "project_id": project_id,
        "user_id": user_id,
        "action": action,
        "field": field,
        "old_value": old_value,
        "new_value": new_value,
    }).execute()


def _create_notification(user_id: str, type_: str, title: str, message: str,
                          task_id: str = None, project_id: str = None):
    try:
        db.table("notifications").insert({
            "user_id": user_id,
            "type": type_,
            "title": title,
            "message": message,
            "task_id": task_id,
            "project_id": project_id,
            "is_read": False,
        }).execute()
    except Exception:
        pass


def _notify_watchers(task_id: str, project_id: str, actor_id: str, title: str, message: str):
    try:
        watchers = db.table("task_watchers").select("user_id").eq("task_id", task_id).execute().data or []
        for w in watchers:
            if w["user_id"] != actor_id:
                _create_notification(w["user_id"], "task_update", title, message, task_id, project_id)
    except Exception:
        pass


def _run_automations(project_id: str, task: dict, trigger_type: str, trigger_value: str, actor_id: str):
    try:
        rules = db.table("automation_rules").select("*").eq("project_id", project_id).eq("is_active", True).eq("trigger_type", trigger_type).execute().data or []
        for rule in rules:
            rule_trigger_val = rule.get("trigger_value")
            if rule_trigger_val and rule_trigger_val != trigger_value:
                continue
            action_type = rule.get("action_type")
            action_value = rule.get("action_value")
            task_id = task["id"]
            if action_type == "set_assignee" and action_value:
                db.table("tasks").update({"assignee_id": action_value, "updated_at": "now()"}).eq("id", task_id).execute()
                _create_notification(action_value, "task_assigned", "Task assigned to you (automation)", f"Task '{task.get('title')}' was assigned to you by an automation rule.", task_id, project_id)
            elif action_type == "set_priority" and action_value:
                db.table("tasks").update({"priority": action_value, "updated_at": "now()"}).eq("id", task_id).execute()
            elif action_type == "set_status" and action_value:
                db.table("tasks").update({"status": action_value, "updated_at": "now()"}).eq("id", task_id).execute()
            elif action_type == "notify_watchers":
                _notify_watchers(task_id, project_id, actor_id, "Task update", f"Task '{task.get('title')}' was updated.")
    except Exception:
        pass


def _spawn_recurrence(task: dict, project_id: str, user_id: str):
    """Create the next recurring instance when a task is closed."""
    rule = task.get("recurrence_rule")
    if not rule:
        return
    due = task.get("due_date")
    if due:
        d = date.fromisoformat(str(due))
        if rule == "daily":
            d += timedelta(days=1)
        elif rule == "weekly":
            d += timedelta(weeks=1)
        elif rule == "monthly":
            month = d.month + 1
            year = d.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            d = d.replace(year=year, month=month)
        new_due = d.isoformat()
    else:
        new_due = None

    db.table("tasks").insert({
        "project_id": project_id,
        "title": task["title"],
        "description": task.get("description"),
        "status": "todo",
        "priority": task["priority"],
        "assignee_id": task.get("assignee_id"),
        "creator_id": user_id,
        "due_date": new_due,
        "tags": task.get("tags") or [],
        "subtasks": [],
        "recurrence_rule": rule,
        "recurrence_parent_id": task["id"],
        "milestone_id": task.get("milestone_id"),
    }).execute()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[TaskOut])
def list_tasks(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("tasks").select("*").eq("project_id", project_id).execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=TaskOut)
async def create_task(project_id: str, body: CreateTaskIn, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("tasks").insert({
        "project_id": project_id,
        "title": body.title,
        "description": body.description,
        "status": body.status or "todo",
        "priority": body.priority or "medium",
        "assignee_id": body.assigneeId,
        "creator_id": user["id"],
        "due_date": body.dueDate,
        "tags": body.tags or [],
        "subtasks": [s.model_dump() for s in body.subtasks] if body.subtasks else [],
        "recurrence_rule": body.recurrenceRule,
        "milestone_id": body.milestoneId,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create task")
    out = _map(res.data)
    _log_activity(out.id, project_id, user["id"], "task_created")
    if body.assigneeId and body.assigneeId != user["id"]:
        _create_notification(body.assigneeId, "task_assigned", "New task assigned to you",
                              f"You were assigned to '{body.title}'", out.id, project_id)
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
    return out


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, body: UpdateTaskIn, user=Depends(get_current_user)):
    existing = db.table("tasks").select("*").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Task not found")
    project_id = existing.data["project_id"]
    _require_project_member(project_id, user["id"])

    updates: dict = {"updated_at": "now()"}
    activity: list[tuple] = []

    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.status is not None and body.status != existing.data["status"]:
        updates["status"] = body.status
        activity.append(("status_changed", "status", existing.data["status"], body.status))
    if body.priority is not None and body.priority != existing.data["priority"]:
        updates["priority"] = body.priority
        activity.append(("priority_changed", "priority", existing.data["priority"], body.priority))
    if body.assigneeId is not None:
        updates["assignee_id"] = body.assigneeId
        activity.append(("assignee_changed", "assignee", existing.data.get("assignee_id"), body.assigneeId))
    if body.dueDate is not None:
        updates["due_date"] = body.dueDate
        activity.append(("due_date_changed", "due_date", str(existing.data.get("due_date") or ""), body.dueDate))
    if body.tags is not None:
        updates["tags"] = body.tags
    if body.subtasks is not None:
        updates["subtasks"] = [s.model_dump() for s in body.subtasks]
    if body.recurrenceRule is not None:
        updates["recurrence_rule"] = body.recurrenceRule or None
    if body.milestoneId is not None:
        updates["milestone_id"] = body.milestoneId or None
        activity.append(("milestone_changed", "milestone", existing.data.get("milestone_id"), body.milestoneId))

    res = db.table("tasks").update(updates).eq("id", task_id).select().single().execute()
    out = _map(res.data)

    for (action, field, old_v, new_v) in activity:
        _log_activity(task_id, project_id, user["id"], action, field, str(old_v or ""), str(new_v or ""))

    # Notify assignee
    if body.assigneeId and body.assigneeId != user["id"] and body.assigneeId != existing.data.get("assignee_id"):
        _create_notification(body.assigneeId, "task_assigned", "Task assigned to you",
                              f"You were assigned to '{existing.data['title']}'", task_id, project_id)

    # Notify watchers on status change
    if body.status and body.status != existing.data["status"]:
        _notify_watchers(task_id, project_id, user["id"], "Task status changed",
                         f"'{existing.data['title']}' moved to {body.status}")

    # Run automations
    if body.status and body.status != existing.data["status"]:
        _run_automations(project_id, existing.data, "status_changed", body.status, user["id"])
    if body.priority and body.priority != existing.data["priority"]:
        _run_automations(project_id, existing.data, "priority_changed", body.priority, user["id"])
    if body.assigneeId and body.assigneeId != existing.data.get("assignee_id"):
        _run_automations(project_id, existing.data, "assignee_changed", body.assigneeId or "", user["id"])

    if body.status and _is_closed_status(body.status, project_id) and existing.data.get("recurrence_rule"):
        _spawn_recurrence(existing.data, project_id, user["id"])

    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
    return out


def _is_closed_status(status: str, project_id: str) -> bool:
    if status == "closed":
        return True
    proj = db.table("projects").select("stages").eq("id", project_id).single().execute()
    if proj.data and proj.data.get("stages"):
        stages = proj.data["stages"]
        if stages and stages[-1]["id"] == status:
            return True
    return False


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, user=Depends(get_current_user)):
    existing = db.table("tasks").select("project_id, creator_id").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Task not found")
    project_id = existing.data["project_id"]
    proj = db.table("projects").select("owner_id, members").eq("id", project_id).single().execute()
    if not proj.data:
        raise HTTPException(404, "Project not found")
    is_creator = existing.data["creator_id"] == user["id"]
    is_owner = proj.data["owner_id"] == user["id"]
    if not is_creator and not is_owner:
        raise HTTPException(403, "Only the task creator or project owner can delete tasks")
    db.table("tasks").delete().eq("id", task_id).execute()
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})


@router.post("/bulk-update", status_code=200)
async def bulk_update(body: BulkUpdateTasksIn, user=Depends(get_current_user)):
    if not body.ids:
        return {"updated": 0}
    first = db.table("tasks").select("project_id").eq("id", body.ids[0]).single().execute()
    if not first.data:
        raise HTTPException(404, "Task not found")
    project_id = first.data["project_id"]
    _require_project_member(project_id, user["id"])

    updates: dict = {"updated_at": "now()"}
    if body.status is not None:
        updates["status"] = body.status
    if body.priority is not None:
        updates["priority"] = body.priority
    if body.assigneeId is not None:
        updates["assignee_id"] = body.assigneeId
    if body.milestoneId is not None:
        updates["milestone_id"] = body.milestoneId

    db.table("tasks").update(updates).in_("id", body.ids).execute()
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
    return {"updated": len(body.ids)}


@router.post("/bulk-delete", status_code=200)
async def bulk_delete(body: BulkDeleteTasksIn, user=Depends(get_current_user)):
    if not body.ids:
        return {"deleted": 0}
    first = db.table("tasks").select("project_id").eq("id", body.ids[0]).single().execute()
    if not first.data:
        raise HTTPException(404, "Task not found")
    project_id = first.data["project_id"]
    _require_project_member(project_id, user["id"])
    db.table("tasks").delete().in_("id", body.ids).execute()
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
    return {"deleted": len(body.ids)}
