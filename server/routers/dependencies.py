from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import TaskDependencyOut, AddDependencyIn
from server.realtime import manager

router = APIRouter(prefix="/dependencies", tags=["dependencies"])


def _map(row: dict) -> TaskDependencyOut:
    return TaskDependencyOut(
        id=row["id"],
        taskId=row["task_id"],
        dependsOnId=row["depends_on_id"],
        createdAt=row["created_at"],
    )


def _get_task_project(task_id: str) -> str:
    res = db.table("tasks").select("project_id").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Task not found")
    return res.data["project_id"]


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[TaskDependencyOut])
def list_dependencies(task_id: str, user=Depends(get_current_user)):
    project_id = _get_task_project(task_id)
    _require_project_member(project_id, user["id"])
    res = db.table("task_dependencies").select("*").eq("task_id", task_id).execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=TaskDependencyOut)
async def add_dependency(task_id: str, body: AddDependencyIn, user=Depends(get_current_user)):
    project_id = _get_task_project(task_id)
    _require_project_member(project_id, user["id"])

    if task_id == body.dependsOnId:
        raise HTTPException(400, "A task cannot depend on itself")

    dep_project_id = _get_task_project(body.dependsOnId)
    if dep_project_id != project_id:
        raise HTTPException(400, "Cannot create cross-project dependencies")

    existing = (
        db.table("task_dependencies")
        .select("id")
        .eq("task_id", task_id)
        .eq("depends_on_id", body.dependsOnId)
        .execute()
    )
    if existing.data:
        raise HTTPException(409, "Dependency already exists")

    res = db.table("task_dependencies").insert({
        "task_id": task_id,
        "depends_on_id": body.dependsOnId,
    }).select().single().execute()
    if not res.data:
        raise HTTPException(500, "Failed to add dependency")
    out = _map(res.data)
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
    return out


@router.delete("/{dependency_id}", status_code=204)
async def remove_dependency(dependency_id: str, user=Depends(get_current_user)):
    existing = db.table("task_dependencies").select("*").eq("id", dependency_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Dependency not found")
    project_id = _get_task_project(existing.data["task_id"])
    _require_project_member(project_id, user["id"])
    db.table("task_dependencies").delete().eq("id", dependency_id).execute()
    await manager.notify_project(project_id, "tasks:changed", {"projectId": project_id})
