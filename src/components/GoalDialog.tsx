import React from 'react';
import { Goal, Project } from '../types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Target, TrendingUp, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import { createGoal, updateGoal, deleteGoal } from '../services/api';
import { toast } from 'sonner';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projects: Project[];
  goals: Goal[];
  currentUserId: string;
  onGoalsChange: (goals: Goal[]) => void;
}

const STATUS_META = {
  active:   { label: 'Active',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: TrendingUp },
  achieved: { label: 'Achieved',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  missed:   { label: 'Missed',    color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle },
};

function GoalProgressBar({ goal }: { goal: Goal }) {
  const target = goal.targetValue ?? 100;
  const pct = Math.min(100, Math.round((goal.currentValue / target) * 100));
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] text-muted-foreground/60 mb-1">
        <span>{goal.currentValue}{goal.unit} / {target}{goal.unit}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const emptyForm = () => ({
  title: '',
  description: '',
  targetValue: '',
  currentValue: '0',
  unit: '%',
  dueDate: '',
  projectId: '',
  status: 'active' as Goal['status'],
});

export function GoalDialog({
  open,
  onOpenChange,
  companyId,
  projects,
  goals,
  currentUserId: _userId,
  onGoalsChange,
}: GoalDialogProps) {
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm());
  const [saving, setSaving] = React.useState(false);

  const patchForm = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const resetForm = () => { setForm(emptyForm()); setCreating(false); setEditingId(null); };

  const startEdit = (goal: Goal) => {
    setForm({
      title: goal.title,
      description: goal.description ?? '',
      targetValue: String(goal.targetValue ?? ''),
      currentValue: String(goal.currentValue),
      unit: goal.unit,
      dueDate: goal.dueDate ?? '',
      projectId: goal.projectId ?? '',
      status: goal.status,
    });
    setEditingId(goal.id);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      unit: form.unit || '%',
      dueDate: form.dueDate || undefined,
      projectId: form.projectId || undefined,
      status: form.status,
    };
    try {
      if (editingId) {
        await updateGoal(editingId, data);
        onGoalsChange(goals.map(g => g.id === editingId ? { ...g, ...data } : g));
        toast.success('Goal updated');
      } else {
        const newGoal = await createGoal(companyId, data);
        onGoalsChange([newGoal, ...goals]);
        toast.success('Goal created');
      }
      resetForm();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      onGoalsChange(goals.filter(g => g.id !== goalId));
      toast.success('Goal deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete goal');
    }
  };

  const handleProgressUpdate = async (goal: Goal, newValue: string) => {
    const num = parseFloat(newValue);
    if (isNaN(num)) return;
    try {
      await updateGoal(goal.id, { currentValue: num });
      onGoalsChange(goals.map(g => g.id === goal.id ? { ...g, currentValue: num } : g));
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update progress');
    }
  };

  const FormPanel = () => (
    <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-muted/20">
      <Input
        autoFocus
        placeholder="Goal title (e.g. Increase active users)"
        value={form.title}
        onChange={e => patchForm({ title: e.target.value })}
        className="h-9 bg-background border-border/50"
      />
      <Input
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => patchForm({ description: e.target.value })}
        className="h-9 bg-background border-border/50"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Target</label>
          <Input type="number" placeholder="100" value={form.targetValue} onChange={e => patchForm({ targetValue: e.target.value })} className="h-9 bg-background border-border/50" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Current</label>
          <Input type="number" placeholder="0" value={form.currentValue} onChange={e => patchForm({ currentValue: e.target.value })} className="h-9 bg-background border-border/50" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Unit</label>
          <Input placeholder="%" value={form.unit} onChange={e => patchForm({ unit: e.target.value })} className="h-9 bg-background border-border/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Due date</label>
          <Input type="date" value={form.dueDate} onChange={e => patchForm({ dueDate: e.target.value })} className="h-9 bg-background border-border/50" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Link to project</label>
          <select
            value={form.projectId}
            onChange={e => patchForm({ projectId: e.target.value })}
            className="w-full h-9 px-2 rounded-md border border-border/50 bg-background text-sm text-foreground"
          >
            <option value="">Company-wide</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      {editingId && (
        <div>
          <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Status</label>
          <select
            value={form.status}
            onChange={e => patchForm({ status: e.target.value as Goal['status'] })}
            className="w-full h-9 px-2 rounded-md border border-border/50 bg-background text-sm text-foreground"
          >
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!form.title.trim() || saving} className="h-8">
          {saving ? 'Saving…' : editingId ? 'Update goal' : 'Create goal'}
        </Button>
        <Button size="sm" variant="ghost" onClick={resetForm} className="h-8">Cancel</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goals & OKRs
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {(creating || editingId) ? (
            <FormPanel />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="h-8 gap-1.5 w-full border-dashed">
              <Plus className="w-3.5 h-3.5" /> New goal
            </Button>
          )}

          {goals.length === 0 && !creating && (
            <div className="text-center py-8 text-muted-foreground/50 text-sm">
              No goals yet. Create your first goal above.
            </div>
          )}

          {goals.map(goal => {
            const meta = STATUS_META[goal.status];
            const project = projects.find(p => p.id === goal.projectId);
            const [editingProgress, setEditingProgress] = React.useState(false);
            const [progressInput, setProgressInput] = React.useState(String(goal.currentValue));

            return (
              <div key={goal.id} className="border border-border/40 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <meta.icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{goal.title}</span>
                      <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-md", meta.color, meta.bg)}>
                        {meta.label}
                      </span>
                      {project && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted/40 text-muted-foreground/60" style={{ borderLeft: `3px solid ${project.color}` }}>
                          {project.name}
                        </span>
                      )}
                    </div>
                    {goal.description && <p className="text-xs text-muted-foreground/60 mt-0.5">{goal.description}</p>}
                    {goal.dueDate && (
                      <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                        Due {new Date(goal.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <GoalProgressBar goal={goal} />

                    {/* Quick progress update */}
                    {editingProgress ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={progressInput}
                          onChange={e => setProgressInput(e.target.value)}
                          className="h-7 w-24 text-xs bg-background border-border/50"
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">{goal.unit}</span>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => {
                          handleProgressUpdate(goal, progressInput);
                          setEditingProgress(false);
                        }}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingProgress(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <button onClick={() => { setProgressInput(String(goal.currentValue)); setEditingProgress(true); }}
                        className="mt-1 text-[11px] text-primary/60 hover:text-primary transition-colors">
                        Update progress
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                      onClick={() => startEdit(goal)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-red-400"
                      onClick={() => handleDelete(goal.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
