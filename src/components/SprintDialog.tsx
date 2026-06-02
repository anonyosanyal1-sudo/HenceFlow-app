import React from 'react';
import { Sprint, Task, UserProfile } from '../types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, parseLocalDate } from '@/lib/utils';
import { Plus, Play, CheckCircle2, Clock, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { createSprint, updateSprint, deleteSprint } from '../services/api';
import { toast } from 'sonner';

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sprints: Sprint[];
  tasks: Task[];
  onSprintsChange: (sprints: Sprint[]) => void;
  onAssignTaskToSprint: (taskId: string, sprintId: string | null) => void;
}

const STATUS_META = {
  planning:  { label: 'Planning',   color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    icon: Clock },
  active:    { label: 'Active',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: Play },
  completed: { label: 'Completed',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
};

function SprintProgressBar({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return null;
  const done = tasks.filter(t => t.status === 'closed').length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] text-muted-foreground/60 mb-1">
        <span>{done}/{tasks.length} tasks done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SprintDialog({
  open,
  onOpenChange,
  projectId,
  sprints,
  tasks,
  onSprintsChange,
  onAssignTaskToSprint,
}: SprintDialogProps) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newGoal, setNewGoal] = React.useState('');
  const [newStart, setNewStart] = React.useState('');
  const [newEnd, setNewEnd] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [expandedSprintId, setExpandedSprintId] = React.useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const sprint = await createSprint(projectId, {
        name: newName.trim(),
        goal: newGoal.trim() || undefined,
        startDate: newStart || undefined,
        endDate: newEnd || undefined,
        status: 'planning',
      });
      onSprintsChange([sprint, ...sprints]);
      setNewName(''); setNewGoal(''); setNewStart(''); setNewEnd('');
      setCreating(false);
      toast.success('Sprint created');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create sprint');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (sprint: Sprint, status: Sprint['status']) => {
    try {
      await updateSprint(sprint.id, { status });
      onSprintsChange(sprints.map(s => s.id === sprint.id ? { ...s, status } : s));
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update sprint');
    }
  };

  const handleDelete = async (sprintId: string) => {
    try {
      await deleteSprint(sprintId);
      onSprintsChange(sprints.filter(s => s.id !== sprintId));
      toast.success('Sprint deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete sprint');
    }
  };

  const getSprintTasks = (sprintId: string) => tasks.filter(t => t.sprintId === sprintId);
  const unassignedTasks = tasks.filter(t => !t.sprintId && t.status !== 'closed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Sprints / Cycles
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Create sprint form */}
          {creating ? (
            <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-muted/20">
              <Input
                autoFocus
                placeholder="Sprint name (e.g. Sprint 1)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-9 bg-background border-border/50"
              />
              <Input
                placeholder="Sprint goal (optional)"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                className="h-9 bg-background border-border/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Start date</label>
                  <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="h-9 bg-background border-border/50" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">End date</label>
                  <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="h-9 bg-background border-border/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving} className="h-8">
                  {saving ? 'Creating…' : 'Create sprint'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="h-8">Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="h-8 gap-1.5 w-full border-dashed">
              <Plus className="w-3.5 h-3.5" /> New sprint
            </Button>
          )}

          {sprints.length === 0 && !creating && (
            <div className="text-center py-8 text-muted-foreground/50 text-sm">
              No sprints yet. Create your first sprint above.
            </div>
          )}

          {/* Sprint list */}
          {sprints.map(sprint => {
            const sprintTasks = getSprintTasks(sprint.id);
            const meta = STATUS_META[sprint.status];
            const isExpanded = expandedSprintId === sprint.id;

            return (
              <div key={sprint.id} className="border border-border/40 rounded-xl overflow-hidden">
                {/* Sprint header */}
                <div className="flex items-center gap-3 p-3 bg-muted/10">
                  <button
                    onClick={() => setExpandedSprintId(isExpanded ? null : sprint.id)}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{sprint.name}</span>
                      <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-md", meta.color, meta.bg)}>
                        {meta.label}
                      </span>
                    </div>
                    {sprint.goal && <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{sprint.goal}</p>}
                    {(sprint.startDate || sprint.endDate) && (
                      <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                        {parseLocalDate(sprint.startDate)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? '?'}
                        {' → '}
                        {parseLocalDate(sprint.endDate)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? '?'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sprint.status === 'planning' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleStatusChange(sprint, 'active')}>
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleStatusChange(sprint, 'completed')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-red-400" onClick={() => handleDelete(sprint.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {sprintTasks.length > 0 && (
                  <div className="px-3 pb-2">
                    <SprintProgressBar tasks={sprintTasks} />
                  </div>
                )}

                {/* Expanded: task list + add from backlog */}
                {isExpanded && (
                  <div className="border-t border-border/20 px-3 py-2 space-y-1">
                    {sprintTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground/40 py-2">No tasks in this sprint.</p>
                    )}
                    {sprintTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 py-1 group">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          task.status === 'closed' ? 'bg-emerald-400' : 'bg-muted-foreground/30'
                        )} />
                        <span className={cn("flex-1 text-xs truncate", task.status === 'closed' && 'line-through text-muted-foreground/40')}>
                          {task.title}
                        </span>
                        <button
                          onClick={() => onAssignTaskToSprint(task.id, null)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground/40 hover:text-red-400 transition-all px-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    {/* Add from backlog */}
                    {unassignedTasks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <p className="text-[11px] text-muted-foreground/50 font-semibold mb-1.5 uppercase tracking-wider">Add from backlog</p>
                        {unassignedTasks.slice(0, 5).map(task => (
                          <div key={task.id} className="flex items-center gap-2 py-1 group">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
                            <span className="flex-1 text-xs text-muted-foreground/60 truncate">{task.title}</span>
                            <button
                              onClick={() => onAssignTaskToSprint(task.id, sprint.id)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:text-primary/80 transition-all px-1"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
