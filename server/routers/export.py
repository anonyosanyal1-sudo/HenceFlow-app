import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from server.auth import get_current_user
from server.database import db

router = APIRouter(prefix="/export", tags=["export"])


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        from fastapi import HTTPException
        raise HTTPException(403, "Not a member of this project")


@router.get("/tasks")
def export_tasks_csv(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    tasks = db.table("tasks").select("*").eq("project_id", project_id).execute().data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Description", "Status", "Priority", "Assignee", "Due Date", "Tags", "Created At", "Updated At"])
    for t in tasks:
        writer.writerow([
            t.get("id", ""),
            t.get("title", ""),
            t.get("description", ""),
            t.get("status", ""),
            t.get("priority", ""),
            t.get("assignee_id", ""),
            t.get("due_date", ""),
            ", ".join(t.get("tags") or []),
            t.get("created_at", ""),
            t.get("updated_at", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tasks_{project_id}.csv"},
    )
