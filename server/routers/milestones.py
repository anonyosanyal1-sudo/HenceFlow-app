from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import MilestoneOut, CreateMilestoneIn, UpdateMilestoneIn
from server.realtime import manager

router = APIRouter(prefix="/milestones", tags=["milestones"])


def _map(row: dict) -> MilestoneOut:
    return MilestoneOut(
        id=row["id"],
        projectId=row["project_id"],
        name=row["name"],
        dueDate=str(row["due_date"]) if row.get("due_date") else None,
        createdAt=row["created_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


def _require_project_owner(project_id: str, user_id: str):
    res = db.table("projects").select("owner_id").eq("id", project_id).single().execute()
    if not res.data or res.data["owner_id"] != user_id:
        raise HTTPException(403, "Only the project owner can manage milestones")


@router.get("", response_model=list[MilestoneOut])
def list_milestones(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("milestones").select("*").eq("project_id", project_id).order("due_date").execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=MilestoneOut)
async def create_milestone(project_id: str, body: CreateMilestoneIn, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("milestones").insert({
        "project_id": project_id,
        "name": body.name,
        "due_date": body.dueDate,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create milestone")
    out = _map(res.data)
    await manager.notify_project(project_id, "milestones:changed", {"projectId": project_id})
    return out


@router.patch("/{milestone_id}", response_model=MilestoneOut)
async def update_milestone(milestone_id: str, body: UpdateMilestoneIn, user=Depends(get_current_user)):
    existing = db.table("milestones").select("*").eq("id", milestone_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Milestone not found")
    project_id = existing.data["project_id"]
    _require_project_member(project_id, user["id"])

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.dueDate is not None:
        updates["due_date"] = body.dueDate or None

    res = db.table("milestones").update(updates).eq("id", milestone_id).select().single().execute()
    out = _map(res.data)
    await manager.notify_project(project_id, "milestones:changed", {"projectId": project_id})
    return out


@router.delete("/{milestone_id}", status_code=204)
async def delete_milestone(milestone_id: str, user=Depends(get_current_user)):
    existing = db.table("milestones").select("project_id").eq("id", milestone_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Milestone not found")
    project_id = existing.data["project_id"]
    _require_project_member(project_id, user["id"])
    db.table("milestones").delete().eq("id", milestone_id).execute()
    await manager.notify_project(project_id, "milestones:changed", {"projectId": project_id})
