from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import ActivityLogOut

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


def _map(row: dict) -> ActivityLogOut:
    return ActivityLogOut(
        id=row["id"],
        taskId=row["task_id"],
        projectId=row["project_id"],
        userId=row["user_id"],
        action=row["action"],
        field=row.get("field"),
        oldValue=row.get("old_value"),
        newValue=row.get("new_value"),
        createdAt=row["created_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[ActivityLogOut])
def list_activity_logs(task_id: str, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    _require_project_member(task.data["project_id"], user["id"])
    res = (
        db.table("activity_logs")
        .select("*")
        .eq("task_id", task_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_map(r) for r in res.data]


@router.get("/project", response_model=list[ActivityLogOut])
def list_project_activity(project_id: str, limit: int = 50, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = (
        db.table("activity_logs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [_map(r) for r in res.data]
