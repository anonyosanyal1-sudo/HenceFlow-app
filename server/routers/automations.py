from fastapi import APIRouter, Depends, HTTPException
from server.auth import get_current_user
from server.database import db
from server.models import AutomationRuleOut, CreateAutomationRuleIn, UpdateAutomationRuleIn

router = APIRouter(prefix="/automations", tags=["automations"])


def _map(row: dict) -> AutomationRuleOut:
    return AutomationRuleOut(
        id=row["id"],
        projectId=row["project_id"],
        name=row["name"],
        triggerType=row["trigger_type"],
        triggerValue=row.get("trigger_value"),
        actionType=row["action_type"],
        actionValue=row.get("action_value"),
        isActive=row.get("is_active", True),
        createdAt=row["created_at"],
    )


def _require_project_member(project_id: str, user_id: str):
    res = db.table("projects").select("members").eq("id", project_id).single().execute()
    members = res.data.get("members") or [] if res.data else []
    if user_id not in members:
        raise HTTPException(403, "Not a member of this project")


@router.get("", response_model=list[AutomationRuleOut])
def list_automations(project_id: str, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("automation_rules").select("*").eq("project_id", project_id).order("created_at").execute()
    return [_map(r) for r in res.data]


@router.post("", response_model=AutomationRuleOut)
def create_automation(project_id: str, body: CreateAutomationRuleIn, user=Depends(get_current_user)):
    _require_project_member(project_id, user["id"])
    res = db.table("automation_rules").insert({
        "project_id": project_id,
        "name": body.name,
        "trigger_type": body.triggerType,
        "trigger_value": body.triggerValue,
        "action_type": body.actionType,
        "action_value": body.actionValue,
        "is_active": body.isActive,
    }).select().single().execute()
    return _map(res.data)


@router.patch("/{rule_id}", response_model=AutomationRuleOut)
def update_automation(rule_id: str, body: UpdateAutomationRuleIn, user=Depends(get_current_user)):
    existing = db.table("automation_rules").select("*").eq("id", rule_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Rule not found")
    _require_project_member(existing.data["project_id"], user["id"])
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.triggerType is not None:
        updates["trigger_type"] = body.triggerType
    if body.triggerValue is not None:
        updates["trigger_value"] = body.triggerValue
    if body.actionType is not None:
        updates["action_type"] = body.actionType
    if body.actionValue is not None:
        updates["action_value"] = body.actionValue
    if body.isActive is not None:
        updates["is_active"] = body.isActive
    res = db.table("automation_rules").update(updates).eq("id", rule_id).select().single().execute()
    return _map(res.data)


@router.delete("/{rule_id}", status_code=204)
def delete_automation(rule_id: str, user=Depends(get_current_user)):
    existing = db.table("automation_rules").select("project_id").eq("id", rule_id).single().execute()
    if not existing.data:
        raise HTTPException(404, "Rule not found")
    _require_project_member(existing.data["project_id"], user["id"])
    db.table("automation_rules").delete().eq("id", rule_id).execute()
