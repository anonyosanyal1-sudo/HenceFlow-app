from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import SavedFilterOut, CreateSavedFilterIn

router = APIRouter(prefix="/saved-filters", tags=["saved-filters"])


def _map(row: dict) -> SavedFilterOut:
    return SavedFilterOut(
        id=row["id"],
        projectId=row["project_id"],
        userId=row["user_id"],
        name=row["name"],
        filters=row.get("filters") or {},
        createdAt=row["created_at"],
    )


@router.get("", response_model=list[SavedFilterOut])
def list_saved_filters(project_id: str, user=Depends(get_current_user)):
    res = db.table("saved_filters").select("*").eq("project_id", project_id).eq("user_id", user["id"]).order("created_at").execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=SavedFilterOut)
def create_saved_filter(project_id: str, body: CreateSavedFilterIn, user=Depends(get_current_user)):
    res = db.table("saved_filters").insert({
        "project_id": project_id,
        "user_id": user["id"],
        "name": body.name,
        "filters": body.filters,
    }).select().single().execute()
    return _map(res.data)


@router.delete("/{filter_id}", status_code=204)
def delete_saved_filter(filter_id: str, user=Depends(get_current_user)):
    db.table("saved_filters").delete().eq("id", filter_id).eq("user_id", user["id"]).execute()
