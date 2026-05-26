from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import PodOut, CreatePodIn, UpdatePodIn
from server.realtime import manager

router = APIRouter(prefix="/pods", tags=["pods"])


def _map(row: dict) -> PodOut:
    return PodOut(
        id=row["id"],
        companyId=row["company_id"],
        name=row["name"],
        description=row.get("description"),
        color=row.get("color", "#6366f1"),
        ownerId=row["owner_id"],
        members=row.get("members") or [],
        createdAt=row["created_at"],
    )


def _require_member(pod: dict, user_id: str):
    if user_id not in (pod.get("members") or []):
        raise HTTPException(403, "Not a member of this pod")


@router.get("", response_model=list[PodOut])
def list_pods(company_id: str, user=Depends(get_current_user)):
    res = db.table("pods").select("*").eq("company_id", company_id).execute()
    return [_map(r) for r in res.data if user["id"] in (r.get("members") or [])]


@router.post("", response_model=PodOut)
async def create_pod(company_id: str, body: CreatePodIn, user=Depends(get_current_user)):
    comp = db.table("companies").select("member_ids").eq("id", company_id).single().execute()
    if not comp.data or user["id"] not in (comp.data.get("member_ids") or []):
        raise HTTPException(403, "Not a member of this company")

    members = body.members if body.members else [user["id"]]
    res = db.table("pods").insert({
        "company_id": company_id,
        "name": body.name,
        "description": body.description,
        "color": body.color or "#6366f1",
        "owner_id": user["id"],
        "members": members,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create pod")
    out = _map(res.data)
    for uid in members:
        await manager.notify_user(uid, "pods:changed", {"companyId": company_id})
    return out


@router.patch("/{pod_id}", response_model=PodOut)
async def update_pod(pod_id: str, body: UpdatePodIn, user=Depends(get_current_user)):
    existing = db.table("pods").select("*").eq("id", pod_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Pod not found")
    if existing.data["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the pod owner can update it")

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if body.color is not None:
        updates["color"] = body.color
    if body.members is not None:
        updates["members"] = body.members

    res = db.table("pods").update(updates).eq("id", pod_id).select().single().execute()
    out = _map(res.data)
    all_members = set((existing.data.get("members") or []) + (body.members or []))
    for uid in all_members:
        await manager.notify_user(uid, "pods:changed", {"companyId": existing.data["company_id"]})
    return out


@router.delete("/{pod_id}", status_code=204)
async def delete_pod(pod_id: str, user=Depends(get_current_user)):
    existing = db.table("pods").select("*").eq("id", pod_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Pod not found")
    if existing.data["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the pod owner can delete it")
    members = existing.data.get("members") or []
    company_id = existing.data["company_id"]
    # Unlink projects from this pod
    db.table("projects").update({"pod_id": None}).eq("pod_id", pod_id).execute()
    db.table("pods").delete().eq("id", pod_id).execute()
    for uid in members:
        await manager.notify_user(uid, "pods:changed", {"companyId": company_id})
