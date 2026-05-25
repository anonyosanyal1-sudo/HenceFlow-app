from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import TaskTemplateOut, CreateTaskTemplateIn
from server.realtime import manager

router = APIRouter(prefix="/templates", tags=["templates"])


def _map(row: dict) -> TaskTemplateOut:
    return TaskTemplateOut(
        id=row["id"],
        projectId=row["project_id"],
        name=row["name"],
        template=row.get("template") or {},
        createdAt=row["created_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[TaskTemplateOut])
def list_templates(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("task_templates").select("*").eq("project_id", project_id).order("created_at").execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=TaskTemplateOut)
async def create_template(project_id: str, body: CreateTaskTemplateIn, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("task_templates").insert({
        "project_id": project_id,
        "name": body.name,
        "template": body.template,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to create template")
    out = _map(res.data)
    await manager.notify_project(project_id, "templates:changed", {"projectId": project_id})
    return out


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str, user=Depends(get_current_user)):
    existing = db.table("task_templates").select("project_id").eq("id", template_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Template not found")
    project_id = existing.data["project_id"]
    _require_project_member(project_id, user["id"])
    db.table("task_templates").delete().eq("id", template_id).execute()
    await manager.notify_project(project_id, "templates:changed", {"projectId": project_id})
