import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from server.auth import verify_token_param
from server.realtime import manager
from server.routers import (
    users, companies, projects, tasks, comments,
    milestones, time_entries, activity_logs, custom_fields, templates, dependencies,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(users.router,        prefix=API_PREFIX)
app.include_router(companies.router,    prefix=API_PREFIX)
app.include_router(projects.router,     prefix=API_PREFIX)
app.include_router(tasks.router,        prefix=API_PREFIX)
app.include_router(comments.router,     prefix=API_PREFIX)
app.include_router(milestones.router,   prefix=API_PREFIX)
app.include_router(time_entries.router, prefix=API_PREFIX)
app.include_router(activity_logs.router, prefix=API_PREFIX)
app.include_router(custom_fields.router, prefix=API_PREFIX)
app.include_router(templates.router,    prefix=API_PREFIX)
app.include_router(dependencies.router, prefix=API_PREFIX)


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
