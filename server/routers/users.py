from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import UserProfileOut, UpdateProfileIn
from server.realtime import manager

router = APIRouter(prefix="/users", tags=["users"])


def _map(row: dict) -> UserProfileOut:
    return UserProfileOut(
        uid=row["id"],
        email=row["email"],
        displayName=row.get("display_name"),
        photoURL=row.get("photo_url"),
        createdAt=row.get("updated_at"),
    )


@router.get("", response_model=list[UserProfileOut])
def list_users(user=Depends(get_current_user)):
    res = db.table("users").select("*").execute()
    return [_map(r) for r in res.data]


@router.get("/me", response_model=UserProfileOut)
def get_me(user=Depends(get_current_user)):
    res = db.table("users").select("*").eq("id", user["id"]).single().execute()
    if not res.data:
        raise HTTPException(404, "User not found")
    return _map(res.data)


@router.patch("/me", response_model=UserProfileOut)
async def update_me(body: UpdateProfileIn, user=Depends(get_current_user)):
    updates: dict = {"display_name": body.displayName}
    if body.photoURL is not None:
        updates["photo_url"] = body.photoURL
    res = db.table("users").update(updates).eq("id", user["id"]).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Update failed")
    await manager.notify_user(user["id"], "users:changed", {})
    return _map(res.data)


@router.post("/ensure-profile")
def ensure_profile(user=Depends(get_current_user)):
    """Called once after sign-in to upsert the user row."""
    db.table("users").upsert(
        {"id": user["id"], "uid": user["id"], "email": user["email"]},
        on_conflict="id",
    ).execute()
    return {"ok": True}
