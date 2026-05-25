from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import TimeEntryOut, CreateTimeEntryIn
from server.realtime import manager

router = APIRouter(prefix="/time-entries", tags=["time-entries"])


def _map(row: dict) -> TimeEntryOut:
    return TimeEntryOut(
        id=row["id"],
        taskId=row["task_id"],
        projectId=row["project_id"],
        userId=row["user_id"],
        minutes=row["minutes"],
        note=row.get("note"),
        loggedAt=row["logged_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[TimeEntryOut])
def list_time_entries(task_id: str, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    _require_project_member(task.data["project_id"], user["id"])
    res = db.table("time_entries").select("*").eq("task_id", task_id).order("logged_at", desc=True).execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=TimeEntryOut)
async def create_time_entry(task_id: str, body: CreateTimeEntryIn, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    project_id = task.data["project_id"]
    _require_project_member(project_id, user["id"])

    if body.minutes <= 0:
        raise HTTPException(400, "Minutes must be greater than 0")

    res = db.table("time_entries").insert({
        "task_id": task_id,
        "project_id": project_id,
        "user_id": user["id"],
        "minutes": body.minutes,
        "note": body.note,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to log time")
    out = _map(res.data)
    await manager.notify_project(project_id, "time_entries:changed", {"taskId": task_id})
    return out


@router.delete("/{entry_id}", status_code=204)
async def delete_time_entry(entry_id: str, user=Depends(get_current_user)):
    existing = db.table("time_entries").select("*").eq("id", entry_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Time entry not found")
    if existing.data["user_id"] != user["id"]:
        raise HTTPException(403, "Only the entry owner can delete it")
    project_id = existing.data["project_id"]
    db.table("time_entries").delete().eq("id", entry_id).execute()
    await manager.notify_project(project_id, "time_entries:changed", {"taskId": existing.data["task_id"]})
