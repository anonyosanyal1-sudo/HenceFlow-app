import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutomationRule, UserProfile, Stage } from '../types';
import { createAutomation, updateAutomation, deleteAutomation } from '../services/api';
import { Plus, Trash2, Zap, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  automations: AutomationRule[];
  onAutomationsChange: (rules: AutomationRule[]) => void;
  users: UserProfile[];
  stages: Stage[];
}

const TRIGGER_LABELS: Record<string, string> = {
  status_changed: 'Status changed to',
  priority_changed: 'Priority changed to',
  assignee_changed: 'Assigned to',
};

const ACTION_LABELS: Record<string, string> = {
  set_assignee: 'Assign to',
  set_priority: 'Set priority to',
  set_status: 'Set status to',
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export function AutomationsDialog({ open, onOpenChange, projectId, automations, onAutomationsChange, users, stages }: AutomationsDialogProps) {
  const [name, setName] = React.useState('');
  const [triggerType, setTriggerType] = React.useState('status_changed');
  const [triggerValue, setTriggerValue] = React.useState('');
  const [actionType, setActionType] = React.useState('set_assignee');
  const [actionValue, setActionValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !triggerType || !actionType) return;
    setSaving(true);
    try {
      const rule = await createAutomation(projectId, {
        name: name.trim(), triggerType: triggerType as AutomationRule['triggerType'],
        triggerValue: triggerValue || undefined,
        actionType: actionType as AutomationRule['actionType'], actionValue: actionValue || undefined,
        isActive: true,
      });
      onAutomationsChange([...automations, rule]);
      setName(''); setTriggerValue(''); setActionValue('');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    const updated = await updateAutomation(rule.id, { isActive: !rule.isActive });
    onAutomationsChange(automations.map(r => r.id === updated.id ? updated : r));
  };

  const handleDelete = async (id: string) => {
    await deleteAutomation(id);
    onAutomationsChange(automations.filter(r => r.id !== id));
  };

  const TriggerValueSelect = () => {
    if (triggerType === 'status_changed') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={triggerValue} onChange={e => setTriggerValue(e.target.value)}>
          <option value="">Any status</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      );
    }
    if (triggerType === 'priority_changed') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={triggerValue} onChange={e => setTriggerValue(e.target.value)}>
          <option value="">Any priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      );
    }
    if (triggerType === 'assignee_changed') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={triggerValue} onChange={e => setTriggerValue(e.target.value)}>
          <option value="">Anyone</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
        </select>
      );
    }
    return <Input className="flex-1 h-9" placeholder="Value" value={triggerValue} onChange={e => setTriggerValue(e.target.value)} />;
  };

  // Resolve a stored trigger/action value (stage id, priority, or user uid) to a human label.
  const resolveValueLabel = (type: string, value?: string) => {
    if (!value) return '';
    if (type === 'status_changed' || type === 'set_status') {
      return stages.find(s => s.id === value)?.label ?? value;
    }
    if (type === 'assignee_changed' || type === 'set_assignee') {
      const u = users.find(u => u.uid === value);
      return u?.displayName || u?.email || value;
    }
    return value; // priority values are already human-readable
  };

  const ActionValueSelect = () => {
    if (actionType === 'set_assignee') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={actionValue} onChange={e => setActionValue(e.target.value)}>
          <option value="">Select user</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
        </select>
      );
    }
    if (actionType === 'set_priority') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={actionValue} onChange={e => setActionValue(e.target.value)}>
          <option value="">Select priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      );
    }
    if (actionType === 'set_status') {
      return (
        <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={actionValue} onChange={e => setActionValue(e.target.value)}>
          <option value="">Select status</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Automation Rules
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Existing rules */}
          {automations.length > 0 && (
            <div className="space-y-2">
              {automations.map(rule => (
                <div key={rule.id} className={cn("flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20", !rule.isActive && "opacity-50")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When {TRIGGER_LABELS[rule.triggerType] || rule.triggerType} {resolveValueLabel(rule.triggerType, rule.triggerValue) || '—'} → {ACTION_LABELS[rule.actionType] || rule.actionType} {resolveValueLabel(rule.actionType, rule.actionValue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(rule)}>
                      <Power className={cn("w-3.5 h-3.5", rule.isActive ? "text-emerald-400" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-500" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create new */}
          <div className="space-y-3 border border-border/50 rounded-xl p-4 bg-muted/10">
            <h4 className="text-sm font-bold text-foreground">New Rule</h4>
            <Input placeholder="Rule name" value={name} onChange={e => setName(e.target.value)} className="h-9" maxLength={80} />
            <div className="flex gap-2">
              <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <TriggerValueSelect />
            </div>
            <div className="flex gap-2">
              <select className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" value={actionType} onChange={e => setActionType(e.target.value)}>
                {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <ActionValueSelect />
            </div>
            <Button className="w-full h-9" onClick={handleCreate} disabled={saving || !name.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
