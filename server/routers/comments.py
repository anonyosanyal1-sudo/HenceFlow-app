from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import CommentOut, CreateCommentIn, UpdateCommentIn, ReactCommentIn
from server.realtime import manager

router = APIRouter(prefix="/comments", tags=["comments"])


def _map(row: dict) -> CommentOut:
    return CommentOut(
        id=row["id"],
        taskId=row["task_id"],
        projectId=row["project_id"],
        userId=row["user_id"],
        content=row["content"],
        attachments=row.get("attachments") or [],
        likes=row.get("likes") or [],
        dislikes=row.get("dislikes") or [],
        isEdited=row.get("is_edited") or False,
        createdAt=row["created_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[CommentOut])
def list_comments(task_id: str, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    _require_project_member(task.data["project_id"], user["id"])
    res = db.table("comments").select("*").eq("task_id", task_id).order("created_at").execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=CommentOut)
async def create_comment(task_id: str, body: CreateCommentIn, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id, title, assignee_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    project_id = task.data["project_id"]
    _require_project_member(project_id, user["id"])

    res = db.table("comments").insert({
        "task_id": task_id,
        "project_id": project_id,
        "user_id": user["id"],
        "content": body.content,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create comment")
    out = _map(res.data)

    # Extract @mentions from content and notify
    import re
    mentioned = re.findall(r'@(\S+)', body.content)
    if mentioned:
        all_users = db.table("user_profiles").select("uid, display_name, email").execute().data or []
        for mention in mentioned:
            matched = next((u for u in all_users if (u.get("display_name") or "").lower().replace(" ", "") == mention.lower() or u.get("email", "").split("@")[0].lower() == mention.lower()), None)
            if matched and matched["uid"] != user["id"]:
                try:
                    db.table("notifications").insert({
                        "user_id": matched["uid"],
                        "type": "mention",
                        "title": "You were mentioned",
                        "message": f"You were mentioned in a comment on task '{task.data.get('title', '')}'",
                        "task_id": task_id,
                        "project_id": project_id,
                        "is_read": False,
                    }).execute()
                except Exception:
                    pass

    # Notify watchers
    try:
        watchers = db.table("task_watchers").select("user_id").eq("task_id", task_id).execute().data or []
        for w in watchers:
            if w["user_id"] != user["id"]:
                db.table("notifications").insert({
                    "user_id": w["user_id"],
                    "type": "comment",
                    "title": "New comment on watched task",
                    "message": f"A new comment was added to '{task.data.get('title', '')}'",
                    "task_id": task_id,
                    "project_id": project_id,
                    "is_read": False,
                }).execute()
    except Exception:
        pass

    await manager.notify_project(project_id, "comments:changed", {"taskId": task_id})
    return out


@router.patch("/{comment_id}", response_model=CommentOut)
async def update_comment(comment_id: str, body: UpdateCommentIn, user=Depends(get_current_user)):
    existing = db.table("comments").select("*").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Comment not found")
    if existing.data["user_id"] != user["id"]:
        raise HTTPException(403, "Only the comment author can edit it")

    res = db.table("comments").update({
        "content": body.content,
        "is_edited": True,
    }).eq("id", comment_id).select().single().execute()
    out = _map(res.data)
    await manager.notify_project(existing.data["project_id"], "comments:changed", {"taskId": existing.data["task_id"]})
    return out


@router.post("/{comment_id}/react", response_model=CommentOut)
async def react_to_comment(comment_id: str, body: ReactCommentIn, user=Depends(get_current_user)):
    existing = db.table("comments").select("*").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Comment not found")
    _require_project_member(existing.data["project_id"], user["id"])

    likes = list(existing.data.get("likes") or [])
    dislikes = list(existing.data.get("dislikes") or [])
    uid = user["id"]

    if body.reaction == "like":
        if uid in likes:
            likes.remove(uid)
        else:
            likes.append(uid)
            if uid in dislikes:
                dislikes.remove(uid)
    elif body.reaction == "dislike":
        if uid in dislikes:
            dislikes.remove(uid)
        else:
            dislikes.append(uid)
            if uid in likes:
                likes.remove(uid)
    else:
        raise HTTPException(400, "reaction must be 'like' or 'dislike'")

    res = db.table("comments").update({"likes": likes, "dislikes": dislikes}).eq("id", comment_id).select().single().execute()
    out = _map(res.data)
    await manager.notify_project(existing.data["project_id"], "comments:changed", {"taskId": existing.data["task_id"]})
    return out


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(comment_id: str, user=Depends(get_current_user)):
    existing = db.table("comments").select("*").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Comment not found")
    project_id = existing.data["project_id"]
    proj = db.table("projects").select("owner_id").eq("id", project_id).single().execute()
    is_author = existing.data["user_id"] == user["id"]
    is_owner = proj.data and proj.data["owner_id"] == user["id"]
    if not is_author and not is_owner:
        raise HTTPException(403, "Only the comment author or project owner can delete it")
    db.table("comments").delete().eq("id", comment_id).execute()
    await manager.notify_project(project_id, "comments:changed", {"taskId": existing.data["task_id"]})
