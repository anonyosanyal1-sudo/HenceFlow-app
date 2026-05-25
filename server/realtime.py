"""
SSE-based real-time notification system.

Every write that goes through the Python API calls notify_project() or
notify_user() here. Connected browser clients receive the event and
re-fetch the affected resource — no Supabase Realtime on the client side.
"""
import asyncio
import json
import uuid
from typing import AsyncGenerator


class RealtimeManager:
    def __init__(self) -> None:
        # conn_id → (user_id, asyncio.Queue)
        self._connections: dict[str, tuple[str, asyncio.Queue]] = {}
        # project_id → set of conn_ids
        self._subscriptions: dict[str, set[str]] = {}

    # ── Connection lifecycle ──────────────────────────────────────────────────

    def connect(self, user_id: str) -> tuple[str, asyncio.Queue]:
        conn_id = str(uuid.uuid4())
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._connections[conn_id] = (user_id, queue)
        return conn_id, queue

    def disconnect(self, conn_id: str) -> None:
        self._connections.pop(conn_id, None)
        for subs in self._subscriptions.values():
            subs.discard(conn_id)

    def subscribe_to_project(self, conn_id: str, project_id: str) -> None:
        self._subscriptions.setdefault(project_id, set()).add(conn_id)

    def subscribe_to_projects(self, conn_id: str, project_ids: list[str]) -> None:
        for pid in project_ids:
            self.subscribe_to_project(conn_id, pid)

    # ── Notifications ─────────────────────────────────────────────────────────

    async def notify_project(self, project_id: str, event_type: str, data: dict) -> None:
        """Push an event to all connections subscribed to a project."""
        payload = json.dumps({"type": event_type, **data})
        for conn_id in list(self._subscriptions.get(project_id, set())):
            if conn_id in self._connections:
                _, queue = self._connections[conn_id]
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

    async def notify_user(self, user_id: str, event_type: str, data: dict) -> None:
        """Push an event directly to all connections owned by a user."""
        payload = json.dumps({"type": event_type, **data})
        for conn_id, (uid, queue) in list(self._connections.items()):
            if uid == user_id:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

    # ── SSE stream generator ──────────────────────────────────────────────────

    async def stream(
        self, conn_id: str, queue: asyncio.Queue
    ) -> AsyncGenerator[dict, None]:
        """Yields SSE-formatted dicts consumed by sse-starlette."""
        yield {"data": json.dumps({"type": "connected"})}
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield {"data": payload}
                except asyncio.TimeoutError:
                    # keepalive so the connection isn't closed by proxies/browsers
                    yield {"data": json.dumps({"type": "ping"})}
        finally:
            self.disconnect(conn_id)


# Module-level singleton used by all routers and main.py
manager = RealtimeManager()
