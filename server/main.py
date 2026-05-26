import os
from contextlib import asynccontextmanager
from datetime import date, timedelta
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from server.auth import verify_token_param
from server.realtime import manager
from server.database import db
from server.routers import (
    users, companies, projects, tasks, comments,
    milestones, time_entries, activity_logs, custom_fields, templates, dependencies,
)
from server.routers import notifications, watchers, saved_filters, automations, export


def _spawn_due_recurring_tasks():
    """Called daily by scheduler: spawn next instance for overdue recurring tasks with no open instance."""
    try:
        today = date.today().isoformat()
        recurring = db.table("tasks").select("*").not_.is_("recurrence_rule", "null").lte("due_date", today).execute().data or []
        for task in recurring:
            rule = task.get("recurrence_rule")
            if not rule:
                continue
            due = task.get("due_date")
            if not due:
                continue
            existing = db.table("tasks").select("id").eq("recurrence_parent_id", task["id"]).eq("status", "todo").execute().data
            if existing:
                continue
            d = date.fromisoformat(str(due))
            if rule == "daily":
                d += timedelta(days=1)
            elif rule == "weekly":
                d += timedelta(weeks=1)
            elif rule == "monthly":
                month = d.month + 1
                year = d.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                d = d.replace(year=year, month=month)
            db.table("tasks").insert({
                "project_id": task["project_id"],
                "title": task["title"],
                "description": task.get("description"),
                "status": "todo",
                "priority": task["priority"],
                "assignee_id": task.get("assignee_id"),
                "creator_id": task["creator_id"],
                "due_date": d.isoformat(),
                "tags": task.get("tags") or [],
                "subtasks": [],
                "recurrence_rule": rule,
                "recurrence_parent_id": task["id"],
                "milestone_id": task.get("milestone_id"),
            }).execute()
    except Exception as e:
        print(f"Recurring task scheduler error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(_spawn_due_recurring_tasks, "cron", hour=0, minute=5)
        scheduler.start()
        yield
        scheduler.shutdown()
    except ImportError:
        yield


app = FastAPI(title="HenceFlow API", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────

API_PREFIX = "/api"

app.include_router(users.router,         prefix=API_PREFIX)
app.include_router(companies.router,     prefix=API_PREFIX)
app.include_router(projects.router,      prefix=API_PREFIX)
app.include_router(tasks.router,         prefix=API_PREFIX)
app.include_router(comments.router,      prefix=API_PREFIX)
app.include_router(milestones.router,    prefix=API_PREFIX)
app.include_router(time_entries.router,  prefix=API_PREFIX)
app.include_router(activity_logs.router, prefix=API_PREFIX)
app.include_router(custom_fields.router, prefix=API_PREFIX)
app.include_router(templates.router,     prefix=API_PREFIX)
app.include_router(dependencies.router,  prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(watchers.router,      prefix=API_PREFIX)
app.include_router(saved_filters.router, prefix=API_PREFIX)
app.include_router(automations.router,   prefix=API_PREFIX)
app.include_router(export.router,        prefix=API_PREFIX)


# ── SSE real-time events ──────────────────────────────────────────────────────

@app.get("/api/events")
async def events(
    token: str = Query(...),
    project_ids: str = Query(default=""),
):
    """Server-Sent Events endpoint. Token passed as query param (EventSource limitation)."""
    user = verify_token_param(token)
    conn_id, queue = manager.connect(user["id"])

    if project_ids:
        ids = [p.strip() for p in project_ids.split(",") if p.strip()]
        manager.subscribe_to_projects(conn_id, ids)

    return EventSourceResponse(manager.stream(conn_id, queue))


# ── Static files (React build) ────────────────────────────────────────────────

_dist = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
