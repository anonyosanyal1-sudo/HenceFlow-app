from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import ProjectOut, CreateProjectIn, UpdateProjectIn, StageModel
from server.realtime import manager

router = APIRouter(prefix="/projects", tags=["projects"])

DEFAULT_STAGES = [
    {"id": "todo",                  "label": "To Do",               "color": "bg-zinc-500/20 text-zinc-300 border-zinc-500/40"},
    {"id": "analysis-in-progress",  "label": "Analysis",            "color": "bg-violet-500/20 text-violet-300 border-violet-500/40"},
    {"id": "dev-in-progress",       "label": "Development",         "color": "bg-blue-500/20 text-blue-300 border-blue-500/40"},
    {"id": "dev-complete",          "label": "Dev Complete",        "color": "bg-sky-500/20 text-sky-300 border-sky-500/40"},
    {"id": "test-in-progress",      "label": "Testing",             "color": "bg-amber-500/20 text-amber-300 border-amber-500/40"},
    {"id": "test-passed",           "label": "Test Passed",         "color": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"},
    {"id": "ready-for-migration",   "label": "Ready for Migration", "color": "bg-rose-500/20 text-rose-300 border-rose-500/40"},
    {"id": "closed",                "label": "Closed",              "color": "bg-green-500/20 text-green-300 border-green-500/40"},
]


def _map(row: dict) -> ProjectOut:
    return ProjectOut(
        id=row["id"],
        companyId=row["company_id"],
        podId=row.get("pod_id"),
        name=row["name"],
        description=row.get("description"),
        ownerId=row["owner_id"],
        members=row.get("members") or [],
        color=row.get("color", "#6366f1"),
        stages=[StageModel(**s) for s in (row.get("stages") or [])],
        createdAt=row["created_at"],
    )


def _require_member(project: dict, user_id: str):
    if user_id not in (project.get("members") or []):
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[ProjectOut])
def list_projects(company_id: str, pod_id: str = None, user=Depends(get_current_user)):
    q = db.table("projects").select("*").eq("company_id", company_id)
    if pod_id:
        q = q.eq("pod_id", pod_id)
    res = q.execute()
    return [_map(r) for r in res.data if user["id"] in (r.get("members") or [])]


@router.post("", response_model=ProjectOut)
async def create_project(company_id: str, body: CreateProjectIn, user=Depends(get_current_user)):
    # Verify company membership
    comp = db.table("companies").select("member_ids").eq("id", company_id).single().execute()
    if not comp.data or user["id"] not in (comp.data.get("member_ids") or []):
        raise HTTPException(403, "Not a member of this company")

    members = body.members if body.members else [user["id"]]
    stages = [s.model_dump() for s in body.stages] if body.stages else DEFAULT_STAGES

    res = db.table("projects").insert({
        "company_id": company_id,
        "pod_id": body.podId,
        "name": body.name,
        "description": body.description,
        "owner_id": user["id"],
        "members": members,
        "color": body.color or "#6366f1",
        "stages": stages,
    }).select().single().execute()

    if not res.data:
        raise HTTPException(500, "Failed to create project")
    out = _map(res.data)
    for uid in members:
        await manager.notify_user(uid, "projects:changed", {"companyId": company_id})
    return out


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: UpdateProjectIn, user=Depends(get_current_user)):
    existing = db.table("projects").select("*").eq("id", project_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Project not found")
    if existing.data["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can update it")

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if body.members is not None:
        updates["members"] = body.members
    if body.color is not None:
        updates["color"] = body.color
    if body.stages is not None:
        updates["stages"] = [s.model_dump() for s in body.stages]

    res = db.table("projects").update(updates).eq("id", project_id).select().single().execute()
    out = _map(res.data)
    all_members = set((existing.data.get("members") or []) + (body.members or []))
    for uid in all_members:
        await manager.notify_user(uid, "projects:changed", {"companyId": existing.data["company_id"]})
    return out


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user=Depends(get_current_user)):
    existing = db.table("projects").select("*").eq("id", project_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Project not found")
    if existing.data["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the project owner can delete it")
    members = existing.data.get("members") or []
    db.table("projects").delete().eq("id", project_id).execute()
    for uid in members:
        await manager.notify_user(uid, "projects:changed", {"companyId": existing.data["company_id"]})
