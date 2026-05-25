from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import (
    CustomFieldDefOut, CreateCustomFieldDefIn,
    CustomFieldValueOut, UpsertCustomFieldValueIn,
)
from server.realtime import manager

router = APIRouter(prefix="/custom-fields", tags=["custom-fields"])


def _map_def(row: dict) -> CustomFieldDefOut:
    return CustomFieldDefOut(
        id=row["id"],
        projectId=row["project_id"],
        name=row["name"],
        fieldType=row["field_type"],
        options=row.get("options") or [],
        createdAt=row["created_at"],
    )


def _map_val(row: dict) -> CustomFieldValueOut:
    return CustomFieldValueOut(
        id=row["id"],
        taskId=row["task_id"],
        fieldId=row["field_id"],
        value=row.get("value"),
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


# ── Field definitions ─────────────────────────────────────────────────────────

@router.get("/definitions", response_model=list[CustomFieldDefOut])
def list_definitions(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("custom_field_definitions").select("*").eq("project_id", project_id).order("created_at").execute()
    return [_map_def(r) for r in res.data]


@router.post("/definitions", response_model=CustomFieldDefOut)
async def create_definition(project_id: str, body: CreateCustomFieldDefIn, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("custom_field_definitions").insert({
        "project_id": project_id,
        "name": body.name,
        "field_type": body.fieldType,
        "options": body.options or [],
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create custom field")
    out = _map_def(res.data)
    await manager.notify_project(project_id, "custom_fields:changed", {"projectId": project_id})
    return out


@router.delete("/definitions/{field_id}", status_code=204)
async def delete_definition(field_id: str, user=Depends(get_current_user)):
    existing = db.table("custom_field_definitions").select("project_id").eq("id", field_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Custom field not found")
    project_id = existing.data["project_id"]
    _require_project_member(project_id, user["id"])
    # Cascade delete values
    db.table("custom_field_values").delete().eq("field_id", field_id).execute()
    db.table("custom_field_definitions").delete().eq("id", field_id).execute()
    await manager.notify_project(project_id, "custom_fields:changed", {"projectId": project_id})


# ── Field values ──────────────────────────────────────────────────────────────

@router.get("/values", response_model=list[CustomFieldValueOut])
def list_values(task_id: str, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    _require_project_member(task.data["project_id"], user["id"])
    res = db.table("custom_field_values").select("*").eq("task_id", task_id).execute()
    return [_map_val(r) for r in res.data]


@router.put("/values", response_model=CustomFieldValueOut)
async def upsert_value(task_id: str, body: UpsertCustomFieldValueIn, user=Depends(get_current_user)):
    task = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    project_id = task.data["project_id"]
    _require_project_member(project_id, user["id"])

    res = db.table("custom_field_values").upsert({
        "task_id": task_id,
        "field_id": body.fieldId,
        "value": body.value,
    }, on_conflict="task_id,field_id").select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to upsert value")
    out = _map_val(res.data)
    await manager.notify_project(project_id, "custom_fields:changed", {"taskId": task_id})
    return out
