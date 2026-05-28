import React from 'react';
import {
  Dialog, DialogContent, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Task, TaskStatus, TaskPriority, UserProfile, Stage, Milestone, CustomFieldDefinition, TaskTemplate, RecurrenceRule } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskComments } from './TaskComments';
import { SubtasksPanel } from './SubtasksPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { TimeTrackingPanel } from './TimeTrackingPanel';
import { ActivityLogPanel } from './ActivityLogPanel';
import { CustomFieldsPanel } from './CustomFieldsPanel';
import { cn } from '@/lib/utils';
import { updateSubtasks, createTaskTemplate, fetchWatchers, watchTask, unwatchTask, addActivityLog } from '../services/api';
import { Milestone as MilestoneIcon, RefreshCw, LayoutTemplate, Eye, EyeOff, Trash2, X, Hash } from 'lucide-react';
import { TaskWatcher } from '../types';
import { UserAvatar } from './UserAvatar';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  users: UserProfile[];
  stages: Stage[];
  activeProjectId?: string;
  milestones?: Milestone[];
  customFieldDefs?: CustomFieldDefinition[];
  templates?: TaskTemplate[];
  allTasks?: Task[];
  currentUserId?: string;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

const MAX_DESCRIPTION_LENGTH = 1000;

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-400', dot: 'bg-red-400' },
  high:   { label: 'High',   color: 'text-orange-400', dot: 'bg-orange-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  low:    { label: 'Low',    color: 'text-sky-400', dot: 'bg-sky-400' },
};

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function stageColorDot(stages: Stage[], stageId: string) {
  const stage = stages.find(s => s.id === stageId);
  if (!stage) return '';
  return stage.color.split(' ').find(c => c.startsWith('bg-'))?.split('/')[0] ?? '';
}

export function TaskDialog({
  open, onOpenChange, task, defaultStatus, users, stages, activeProjectId,
  milestones = [], customFieldDefs = [], templates = [], allTasks = [],
  currentUserId = '', onSave, onDelete,
}: TaskDialogProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>('todo');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = React.useState('');
  const [milestoneId, setMilestoneId] = React.useState<string | undefined>(undefined);
  const [recurrenceRule, setRecurrenceRule] = React.useState<RecurrenceRule | undefined>(undefined);
  const [localSubtasks, setLocalSubtasks] = React.useState<import('../types').Subtask[]>([]);
  const [activeTab, setActiveTab] = React.useState('details');
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [showTemplateSave, setShowTemplateSave] = React.useState(false);
  const [watchers, setWatchers] = React.useState<TaskWatcher[]>([]);
  const isWatching = watchers.some(w => w.userId === currentUserId);

  const projectId = task?.projectId || activeProjectId || '';

  React.useEffect(() => {
    if (task?.id) {
      fetchWatchers(task.id).then(setWatchers).catch(() => {});
    } else {
      setWatchers([]);
    }
  }, [task?.id]);

  const handleToggleWatch = async () => {
    if (!task) return;
    if (isWatching) {
      await unwatchTask(task.id);
      setWatchers(prev => prev.filter(w => w.userId !== currentUserId));
    } else {
      const w = await watchTask(task.id);
      setWatchers(prev => [...prev, w]);
    }
  };

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assigneeId);
      setDueDate(task.dueDate || '');
      setMilestoneId(task.milestoneId);
      setRecurrenceRule(task.recurrenceRule);
      setLocalSubtasks(task.subtasks ?? []);
      setActiveTab('details');
      setIsConfirmingDelete(false);
      setShowTemplateSave(false);
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || 'todo');
      setPriority('medium');
      setAssigneeId(undefined);
      setDueDate('');
      setMilestoneId(undefined);
      setRecurrenceRule(undefined);
      setLocalSubtasks([]);
      setActiveTab('details');
      setIsConfirmingDelete(false);
      setShowTemplateSave(false);
    }
  }, [task, defaultStatus, open]);

  const isDescriptionTooLong = description.length > MAX_DESCRIPTION_LENGTH;

  const handleSave = () => {
    if (!title.trim() || isDescriptionTooLong) return;
    onSave({ title, description, status, priority, assigneeId, dueDate: dueDate || undefined, milestoneId: milestoneId || undefined, recurrenceRule: recurrenceRule || undefined });
    onOpenChange(false);
  };

  const applyTemplate = (tpl: TaskTemplate) => {
    if (tpl.template.title) setTitle(tpl.template.title);
    if (tpl.template.description) setDescription(tpl.template.description);
    if (tpl.template.priority) setPriority(tpl.template.priority);
    if (tpl.template.status) setStatus(tpl.template.status);
    if (tpl.template.assigneeId) setAssigneeId(tpl.template.assigneeId);
    if (tpl.template.recurrenceRule) setRecurrenceRule(tpl.template.recurrenceRule);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !projectId) return;
    setSavingTemplate(true);
    await createTaskTemplate(projectId, templateName.trim(), { title, description, priority, status, assigneeId, recurrenceRule });
    setTemplateName('');
    setSavingTemplate(false);
    setShowTemplateSave(false);
  };

  const assignee = users.find(u => u.uid === assigneeId);
  const pc = PRIORITY_CONFIG[priority];
  const stageDot = stageColorDot(stages, status);
  const stageLabel = stages.find(s => s.id === status)?.label ?? status;

  // ─── CREATE MODE ──────────────────────────────────────────────────────────────
  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[580px] bg-card border-border p-0 gap-0 overflow-hidden">
          <DialogDescription className="sr-only">Create a new task</DialogDescription>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/30">
            <h2 className="text-lg font-bold text-foreground tracking-tight">New task</h2>
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <Select onValueChange={id => { const t = templates.find(t => t.id === id); if (t) applyTemplate(t); }}>
                  <SelectTrigger className="h-7 text-xs bg-muted/50 border-none w-36 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <LayoutTemplate className="w-3 h-3 text-muted-foreground" />
                      <SelectValue placeholder="Use template…" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <button onClick={() => onOpenChange(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Title */}
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title…"
              className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 shadow-none px-0 placeholder:text-muted-foreground/40 text-foreground h-auto py-0"
              autoFocus
            />

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                <SelectTrigger className="h-7 bg-muted/50 border-none rounded-lg text-xs w-auto gap-1.5 px-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", stageDot)} />
                  <span className="text-foreground font-medium">{stageLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", stageColorDot(stages, s.id))} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                <SelectTrigger className="h-7 bg-muted/50 border-none rounded-lg text-xs w-auto gap-1.5 px-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", pc.dot)} />
                  <span className={cn("font-medium", pc.color)}>{pc.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                        <span className={cfg.color}>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignee */}
              <Select value={assigneeId || 'unassigned'} onValueChange={v => setAssigneeId(v === 'unassigned' ? undefined : v)}>
                <SelectTrigger className="h-7 bg-muted/50 border-none rounded-lg text-xs w-auto gap-1.5 px-2.5">
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar photoURL={assignee.photoURL} displayName={assignee.displayName} className="w-4 h-4 text-[8px]" />
                      <span className="font-medium text-foreground">{assignee.displayName || assignee.email}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Assignee</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-sm italic text-muted-foreground">Unassigned</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.uid} value={u.uid} className="text-sm">
                      <div className="flex items-center gap-2">
                        <UserAvatar photoURL={u.photoURL} displayName={u.displayName} className="w-5 h-5 text-[9px]" />
                        {u.displayName || u.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Due date */}
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-7 bg-muted/50 border-none rounded-lg text-xs w-auto px-2.5 focus-visible:ring-0 text-muted-foreground font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-medium">Description</label>
                <span className={cn("text-[10px] tabular-nums", isDescriptionTooLong ? "text-red-400" : "text-muted-foreground/50")}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add details, notes, or context…"
                className={cn(
                  "min-h-[120px] bg-muted/30 border border-border/30 focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm text-foreground rounded-xl",
                  isDescriptionTooLong && "ring-1 ring-red-500 border-red-500/50"
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/30">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || isDescriptionTooLong}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl"
            >
              Create task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── EDIT MODE ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] h-[88vh] flex flex-col bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogDescription className="sr-only">Edit task details</DialogDescription>

        {/* ── Top header ──────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-5 pb-0">
          {/* ID + actions row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground/50">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">{task.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleWatch}
                className={cn(
                  "h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
                  isWatching
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
                )}
              >
                {isWatching ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isWatching ? 'Watching' : 'Watch'}
              </button>
              {onDelete && (
                isConfirmingDelete ? (
                  <>
                    <button onClick={() => setIsConfirmingDelete(false)} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => { onDelete(task.id); onOpenChange(false); }} className="h-7 px-2.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                      Confirm delete
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsConfirmingDelete(true)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )
              )}
              <button onClick={() => onOpenChange(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus-visible:ring-0 shadow-none px-0 placeholder:text-muted-foreground/30 text-foreground h-auto py-0 mb-4"
            placeholder="Task title…"
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-border/30 w-full justify-start rounded-none">
              {['details', 'discussion', 'time', 'activity', 'watchers'].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground/60 hover:text-muted-foreground capitalize text-xs font-semibold px-4 pb-3 pt-1 h-auto"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Tab panels ──────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-hidden mt-0">

              {/* Details */}
              <TabsContent value="details" className="h-full overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="grid grid-cols-[1fr_260px] gap-0 h-full">

                  {/* Left: content */}
                  <div className="overflow-y-auto px-6 py-5 space-y-5 border-r border-border/20">
                    {/* Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                        <span className={cn("text-[10px] tabular-nums", isDescriptionTooLong ? "text-red-400" : "text-muted-foreground/50")}>
                          {description.length}/{MAX_DESCRIPTION_LENGTH}
                        </span>
                      </div>
                      <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add details, notes, or context…"
                        className={cn(
                          "min-h-[140px] bg-muted/30 border border-border/30 focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm text-foreground rounded-xl",
                          isDescriptionTooLong && "ring-1 ring-red-500"
                        )}
                      />
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtasks</label>
                      <SubtasksPanel
                        subtasks={localSubtasks}
                        onChange={(newSubtasks) => {
                          const pid = task.projectId || activeProjectId || '';
                          const prev = localSubtasks;
                          setLocalSubtasks(newSubtasks);
                          updateSubtasks(task.id, newSubtasks, pid).catch(() => {});
                          const added = newSubtasks.find(s => !prev.some(p => p.id === s.id));
                          const toggled = newSubtasks.find(s => { const old = prev.find(p => p.id === s.id); return old && old.completed !== s.completed; });
                          if (added) addActivityLog(task.id, pid, 'subtask_added', { newValue: added.title }).catch(() => {});
                          else if (toggled) addActivityLog(task.id, pid, 'subtask_completed', { newValue: toggled.title }).catch(() => {});
                        }}
                      />
                    </div>

                    {/* Dependencies */}
                    <DependenciesPanel task={task} allTasks={allTasks} />

                    {/* Custom fields */}
                    {customFieldDefs.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Fields</label>
                        <CustomFieldsPanel taskId={task.id} fieldDefs={customFieldDefs} />
                      </div>
                    )}
                  </div>

                  {/* Right: properties sidebar */}
                  <div className="overflow-y-auto px-5 py-5 space-y-1 bg-muted/10">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">Properties</p>

                    <PropertyRow label="Status">
                      <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                        <SelectTrigger className="h-8 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 gap-1.5 w-full justify-start">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", stageDot)} />
                          <span className="text-foreground font-medium text-sm">{stageLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", stageColorDot(stages, s.id))} />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </PropertyRow>

                    <PropertyRow label="Priority">
                      <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                        <SelectTrigger className="h-8 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 gap-1.5 w-full justify-start">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", pc.dot)} />
                          <span className={cn("font-medium text-sm", pc.color)}>{pc.label}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                            <SelectItem key={val} value={val} className="text-sm">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                                <span className={cfg.color}>{cfg.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </PropertyRow>

                    <PropertyRow label="Assignee">
                      <Select value={assigneeId || 'unassigned'} onValueChange={v => setAssigneeId(v === 'unassigned' ? undefined : v)}>
                        <SelectTrigger className="h-8 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 gap-1.5 w-full justify-start">
                          {assignee ? (
                            <div className="flex items-center gap-1.5">
                              <UserAvatar photoURL={assignee.photoURL} displayName={assignee.displayName} className="w-5 h-5 text-[9px]" />
                              <span className="text-foreground font-medium text-sm truncate">{assignee.displayName || assignee.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">Unassigned</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" className="text-sm italic text-muted-foreground">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.uid} value={u.uid} className="text-sm">
                              <div className="flex items-center gap-2">
                                <UserAvatar photoURL={u.photoURL} displayName={u.displayName} className="w-5 h-5 text-[9px]" />
                                {u.displayName || u.email}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </PropertyRow>

                    <PropertyRow label="Due date">
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="h-8 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm px-0 text-foreground font-medium w-full"
                      />
                    </PropertyRow>

                    {milestones.length > 0 && (
                      <PropertyRow label="Milestone">
                        <Select value={milestoneId ?? 'none'} onValueChange={v => setMilestoneId(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="h-8 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 gap-1 w-full justify-start">
                            <MilestoneIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-foreground text-sm truncate">{milestoneId ? milestones.find(m => m.id === milestoneId)?.name : <span className="text-muted-foreground italic">None</span>}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-sm italic text-muted-foreground">None</SelectItem>
                            {milestones.map(m => <SelectItem key={m.id} value={m.id} className="text-sm">{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </PropertyRow>
                    )}

                    <PropertyRow label="Recurrence">
                      <Select value={recurrenceRule ?? 'none'} onValueChange={v => setRecurrenceRule(v === 'none' ? undefined : v as RecurrenceRule)}>
                        <SelectTrigger className="h-8 bg-transparent border-none focus:ring-0 shadow-none text-sm px-0 gap-1 w-full justify-start">
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground text-sm">{recurrenceRule ? RECURRENCE_OPTIONS.find(o => o.value === recurrenceRule)?.label : <span className="text-muted-foreground italic">None</span>}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-sm italic text-muted-foreground">None</SelectItem>
                          {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </PropertyRow>

                    {/* Template save */}
                    {projectId && (
                      <div className="pt-4 border-t border-border/20 mt-2">
                        {showTemplateSave ? (
                          <div className="space-y-2">
                            <Input
                              value={templateName}
                              onChange={e => setTemplateName(e.target.value)}
                              placeholder="Template name…"
                              className="h-7 text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground flex-1" onClick={() => setShowTemplateSave(false)}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowTemplateSave(true)} className="text-xs text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1.5 transition-colors">
                            <LayoutTemplate className="w-3 h-3" /> Save as template
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Discussion */}
              <TabsContent value="discussion" className="h-full mt-0 data-[state=inactive]:hidden overflow-hidden">
                <div className="h-full px-6 pt-4">
                  <TaskComments key={task.id} projectId={task.projectId || activeProjectId || ''} taskId={task.id} users={users} />
                </div>
              </TabsContent>

              {/* Time */}
              <TabsContent value="time" className="h-full overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="px-6 pt-4">
                  <TimeTrackingPanel taskId={task.id} projectId={task.projectId || activeProjectId || ''} currentUserId={currentUserId} users={users} />
                </div>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity" className="h-full overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="px-6 pt-4">
                  <ActivityLogPanel taskId={task.id} users={users} />
                </div>
              </TabsContent>

              {/* Watchers */}
              <TabsContent value="watchers" className="h-full overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="px-6 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Watchers ({watchers.length})</h3>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/60" onClick={handleToggleWatch}>
                      {isWatching ? <><EyeOff className="w-3.5 h-3.5" /> Unwatch</> : <><Eye className="w-3.5 h-3.5" /> Watch</>}
                    </Button>
                  </div>
                  {watchers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No watchers yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {watchers.map(w => {
                        const u = users.find(u => u.uid === w.userId);
                        return (
                          <div key={w.id} className="flex items-center gap-2">
                            <UserAvatar photoURL={u?.photoURL ?? null} displayName={u?.displayName ?? null} className="w-7 h-7 text-xs" />
                            <span className="text-sm text-foreground">{u?.displayName || u?.email || w.userId}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border/30 bg-card">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || isDescriptionTooLong}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl shadow-sm shadow-primary/20"
              >
                Save changes
              </Button>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2 py-1.5 border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground/70 font-medium shrink-0">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
