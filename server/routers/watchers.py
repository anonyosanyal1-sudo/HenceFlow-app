from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import WatcherOut

router = APIRouter(prefix="/watchers", tags=["watchers"])


def _map(row: dict) -> WatcherOut:
    return WatcherOut(
        id=row["id"],
        taskId=row["task_id"],
        userId=row["user_id"],
        createdAt=row["created_at"],
    )


@router.get("", response_model=list[WatcherOut])
def list_watchers(task_id: str, user=Depends(get_current_user)):
    res = db.table("task_watchers").select("*").eq("task_id", task_id).execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=WatcherOut)
def watch_task(task_id: str, user=Depends(get_current_user)):
    existing = db.table("task_watchers").select("*").eq("task_id", task_id).eq("user_id", user["id"]).execute()
    if existing.data:
        return _map(existing.data[0])
    res = db.table("task_watchers").insert({"task_id": task_id, "user_id": user["id"]}).select().single().execute()
    return _map(res.data)


@router.delete("", status_code=204)
def unwatch_task(task_id: str, user=Depends(get_current_user)):
    db.table("task_watchers").delete().eq("task_id", task_id).eq("user_id", user["id"]).execute()
