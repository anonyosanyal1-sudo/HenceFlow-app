from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import CompanyOut, CreateCompanyIn, UpdateCompanyIn
from server.realtime import manager

router = APIRouter(prefix="/companies", tags=["companies"])


def _map(row: dict) -> CompanyOut:
    return CompanyOut(
        id=row["id"],
        name=row["name"],
        ownerId=row["owner_id"],
        adminIds=row.get("admin_ids") or [],
        memberIds=row.get("member_ids") or [],
        location=row.get("location"),
        website=row.get("website"),
        industry=row.get("industry"),
        createdAt=row["created_at"],
    )


def _require_member(company: dict, user_id: str):
    if user_id not in (company.get("member_ids") or []):
        raise HTTPException(403, "Not a member of this company")


def _require_admin(company: dict, user_id: str):
    if user_id not in (company.get("admin_ids") or []):
        raise HTTPException(403, "Admin access required")


@router.get("", response_model=list[CompanyOut])
def list_companies(user=Depends(get_current_user)):
    res = db.table("companies").select("*").execute()
    user_companies = [_map(r) for r in res.data if user["id"] in (r.get("member_ids") or [])]
    return user_companies[:1]  # Only return the single company


@router.post("", response_model=CompanyOut)
async def create_company(body: CreateCompanyIn, user=Depends(get_current_user)):
    # Enforce one company per user — return existing if already has one
    existing_all = db.table("companies").select("*").execute()
    user_company = next((r for r in existing_all.data if user["id"] in (r.get("member_ids") or [])), None)
    if user_company:
        return _map(user_company)

    res = db.table("companies").insert({
        "name": body.name,
        "owner_id": user["id"],
        "admin_ids": [user["id"]],
        "member_ids": [user["id"]],
        "location": body.location,
        "website": body.website,
        "industry": body.industry,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create company")
    out = _map(res.data)
    await manager.notify_user(user["id"], "companies:changed", {})
    return out


@router.patch("/{company_id}", response_model=CompanyOut)
async def update_company(company_id: str, body: UpdateCompanyIn, user=Depends(get_current_user)):
    existing = db.table("companies").select("*").eq("id", company_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Company not found")
    _require_admin(existing.data, user["id"])

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.location is not None:
        updates["location"] = body.location
    if body.website is not None:
        updates["website"] = body.website
    if body.industry is not None:
        updates["industry"] = body.industry
    if body.adminIds is not None:
        updates["admin_ids"] = body.adminIds
    if body.memberIds is not None:
        updates["member_ids"] = body.memberIds

    res = db.table("companies").update(updates).eq("id", company_id).select().single().execute()
    out = _map(res.data)
    # Notify all members
    for uid in existing.data.get("member_ids") or []:
        await manager.notify_user(uid, "companies:changed", {})
    return out


@router.delete("/{company_id}", status_code=204)
async def delete_company(company_id: str, user=Depends(get_current_user)):
    existing = db.table("companies").select("*").eq("id", company_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Company not found")
    if existing.data["owner_id"] != user["id"]:
        raise HTTPException(403, "Only the owner can delete a company")
    member_ids = existing.data.get("member_ids") or []
    db.table("companies").delete().eq("id", company_id).execute()
    for uid in member_ids:
        await manager.notify_user(uid, "companies:changed", {})
