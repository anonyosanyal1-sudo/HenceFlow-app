from fastapi import APIRouter, Depends
from server.auth import get_current_user
from server.database import db
from server.models import NotificationOut, MarkReadIn

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _map(row: dict) -> NotificationOut:
    return NotificationOut(
        id=row["id"],
        userId=row["user_id"],
        type=row["type"],
        title=row["title"],
        message=row["message"],
        taskId=row.get("task_id"),
        projectId=row.get("project_id"),
        isRead=row.get("is_read", False),
        createdAt=row["created_at"],
    )


@router.get("", response_model=list[NotificationOut])
def list_notifications(user=Depends(get_current_user)):
    res = db.table("notifications").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(50).execute()
    return [_map(r) for r in res.data]


@router.post("/mark-read", status_code=200)
def mark_read(body: MarkReadIn, user=Depends(get_current_user)):
    q = db.table("notifications").update({"is_read": True}).eq("user_id", user["id"])
    if body.ids:
        q = q.in_("id", body.ids)
    q.execute()
    return {"ok": True}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: str, user=Depends(get_current_user)):
    db.table("notifications").delete().eq("id", notification_id).eq("user_id", user["id"]).execute()
