"""Pydantic request/response models for all API endpoints."""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel


# ── Users ─────────────────────────────────────────────────────────────────────

class UserProfileOut(BaseModel):
    uid: str
    email: str
    displayName: Optional[str]
    photoURL: Optional[str]
    createdAt: Optional[str]


class UpdateProfileIn(BaseModel):
    displayName: str
    photoURL: Optional[str] = None


# ── Companies ─────────────────────────────────────────────────────────────────

class CompanyOut(BaseModel):
    id: str
    name: str
    ownerId: str
    adminIds: list[str]
    memberIds: list[str]
    location: Optional[str]
    website: Optional[str]
    industry: Optional[str]
    createdAt: str


class CreateCompanyIn(BaseModel):
    name: str
    location: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None


class UpdateCompanyIn(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    adminIds: Optional[list[str]] = None
    memberIds: Optional[list[str]] = None


# ── Projects ──────────────────────────────────────────────────────────────────

class StageModel(BaseModel):
    id: str
    label: str
    color: str


class ProjectOut(BaseModel):
    id: str
    companyId: str
    name: str
    description: Optional[str]
    ownerId: str
    members: list[str]
    color: str
    stages: list[StageModel]
    createdAt: str


class CreateProjectIn(BaseModel):
    name: str
    description: Optional[str] = None
    members: Optional[list[str]] = None
    color: Optional[str] = "#6366f1"
    stages: Optional[list[StageModel]] = None


class UpdateProjectIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    members: Optional[list[str]] = None
    color: Optional[str] = None
    stages: Optional[list[StageModel]] = None


# ── Tasks ─────────────────────────────────────────────────────────────────────

class SubtaskModel(BaseModel):
    id: str
    title: str
    completed: bool


class TaskOut(BaseModel):
    id: str
    projectId: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigneeId: Optional[str]
    creatorId: str
    dueDate: Optional[str]
    tags: list[str]
    subtasks: list[SubtaskModel]
    recurrenceRule: Optional[str]
    recurrenceParentId: Optional[str]
    milestoneId: Optional[str]
    createdAt: str
    updatedAt: str


class CreateTaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    assigneeId: Optional[str] = None
    dueDate: Optional[str] = None
    tags: Optional[list[str]] = None
    subtasks: Optional[list[SubtaskModel]] = None
    recurrenceRule: Optional[str] = None
    milestoneId: Optional[str] = None


class UpdateTaskIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigneeId: Optional[str] = None
    dueDate: Optional[str] = None
    tags: Optional[list[str]] = None
    subtasks: Optional[list[SubtaskModel]] = None
    recurrenceRule: Optional[str] = None
    milestoneId: Optional[str] = None


class BulkUpdateTasksIn(BaseModel):
    ids: list[str]
    status: Optional[str] = None
    priority: Optional[str] = None
    assigneeId: Optional[str] = None
    milestoneId: Optional[str] = None


class BulkDeleteTasksIn(BaseModel):
    ids: list[str]


# ── Comments ──────────────────────────────────────────────────────────────────

class CommentOut(BaseModel):
    id: str
    taskId: str
    projectId: str
    userId: str
    content: str
    attachments: list[str]
    likes: list[str]
    dislikes: list[str]
    isEdited: bool
    createdAt: str


class CreateCommentIn(BaseModel):
    content: str


class UpdateCommentIn(BaseModel):
    content: str


class ReactCommentIn(BaseModel):
    reaction: str  # "like" | "dislike"


# ── Milestones ────────────────────────────────────────────────────────────────

class MilestoneOut(BaseModel):
    id: str
    projectId: str
    name: str
    dueDate: Optional[str]
    createdAt: str


class CreateMilestoneIn(BaseModel):
    name: str
    dueDate: Optional[str] = None


class UpdateMilestoneIn(BaseModel):
    name: Optional[str] = None
    dueDate: Optional[str] = None


# ── Time Entries ──────────────────────────────────────────────────────────────

class TimeEntryOut(BaseModel):
    id: str
    taskId: str
    projectId: str
    userId: str
    minutes: int
    note: Optional[str]
    loggedAt: str


class CreateTimeEntryIn(BaseModel):
    minutes: int
    note: Optional[str] = None


# ── Activity Logs ─────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: str
    taskId: str
    projectId: str
    userId: str
    action: str
    field: Optional[str]
    oldValue: Optional[str]
    newValue: Optional[str]
    createdAt: str


# ── Custom Fields ─────────────────────────────────────────────────────────────

class CustomFieldDefOut(BaseModel):
    id: str
    projectId: str
    name: str
    fieldType: str
    options: list[str]
    createdAt: str


class CreateCustomFieldDefIn(BaseModel):
    name: str
    fieldType: str = "text"
    options: Optional[list[str]] = None


class CustomFieldValueOut(BaseModel):
    id: str
    taskId: str
    fieldId: str
    value: Optional[str]


class UpsertCustomFieldValueIn(BaseModel):
    fieldId: str
    value: str


# ── Task Dependencies ─────────────────────────────────────────────────────────

class TaskDependencyOut(BaseModel):
    id: str
    taskId: str
    dependsOnId: str
    createdAt: str


class AddDependencyIn(BaseModel):
    dependsOnId: str


# ── Templates ─────────────────────────────────────────────────────────────────

class TaskTemplateOut(BaseModel):
    id: str
    projectId: str
    name: str
    template: dict[str, Any]
    createdAt: str


class CreateTaskTemplateIn(BaseModel):
    name: str
    template: dict[str, Any]


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    message: str
    taskId: Optional[str]
    projectId: Optional[str]
    isRead: bool
    createdAt: str


class MarkReadIn(BaseModel):
    ids: Optional[list[str]] = None  # None = mark all


# ── Task Watchers ─────────────────────────────────────────────────────────────

class WatcherOut(BaseModel):
    id: str
    taskId: str
    userId: str
    createdAt: str


# ── Saved Filters ─────────────────────────────────────────────────────────────

class SavedFilterOut(BaseModel):
    id: str
    projectId: str
    userId: str
    name: str
    filters: dict[str, Any]
    createdAt: str


class CreateSavedFilterIn(BaseModel):
    name: str
    filters: dict[str, Any]


# ── Automation Rules ──────────────────────────────────────────────────────────

class AutomationRuleOut(BaseModel):
    id: str
    projectId: str
    name: str
    triggerType: str       # "status_changed" | "priority_changed" | "assignee_changed" | "due_date_overdue"
    triggerValue: Optional[str]   # e.g. "closed"
    actionType: str        # "set_assignee" | "set_priority" | "set_status" | "notify_watchers"
    actionValue: Optional[str]
    isActive: bool
    createdAt: str


class CreateAutomationRuleIn(BaseModel):
    name: str
    triggerType: str
    triggerValue: Optional[str] = None
    actionType: str
    actionValue: Optional[str] = None
    isActive: bool = True


class UpdateAutomationRuleIn(BaseModel):
    name: Optional[str] = None
    triggerType: Optional[str] = None
    triggerValue: Optional[str] = None
    actionType: Optional[str] = None
    actionValue: Optional[str] = None
    isActive: Optional[bool] = None
