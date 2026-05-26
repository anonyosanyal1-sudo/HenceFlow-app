import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Task, TaskStatus, TaskPriority, UserProfile, Stage, Milestone, CustomFieldDefinition, TaskTemplate, RecurrenceRule } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskComments } from './TaskComments';
import { SubtasksPanel } from './SubtasksPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { TimeTrackingPanel } from './TimeTrackingPanel';
import { ActivityLogPanel } from './ActivityLogPanel';
import { CustomFieldsPanel } from './CustomFieldsPanel';
import { cn } from '@/lib/utils';
import { updateSubtasks, createTaskTemplate, fetchWatchers, watchTask, unwatchTask, addActivityLog } from '../services/api';
import { Milestone as MilestoneIcon, RefreshCw, LayoutTemplate, Eye, EyeOff } from 'lucide-react';
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

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

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
  const [dueDate, setDueDate] = React.useState<string>('');
  const [milestoneId, setMilestoneId] = React.useState<string | undefined>(undefined);
  const [recurrenceRule, setRecurrenceRule] = React.useState<RecurrenceRule | undefined>(undefined);
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
      setActiveTab('details');
      setIsConfirmingDelete(false);
      setShowTemplateSave(false);
    }
  }, [task, defaultStatus, open]);

  const isDescriptionTooLong = description.length > MAX_DESCRIPTION_LENGTH;

  const handleSave = () => {
    if (!title.trim() || isDescriptionTooLong) return;
    onSave({
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate: dueDate || undefined,
      milestoneId: milestoneId || undefined,
      recurrenceRule: recurrenceRule || undefined,
    });
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
    await createTaskTemplate(projectId, templateName.trim(), {
      title, description, priority, status, assigneeId, recurrenceRule,
    });
    setTemplateName('');
    setSavingTemplate(false);
    setShowTemplateSave(false);
  };

  const stageColorSolid = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return '';
    return stage.color.split(' ').find(c => c.startsWith('bg-'))?.split('/')[0] ?? '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[520px] flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] bg-card border-border",
        task && "sm:max-w-[860px]"
      )}>
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {task ? 'Task Details' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {task ? `ID: ${task.id.slice(0, 8)}` : 'Fill in the details for your new task.'}
              </DialogDescription>
            </div>
            {/* Template selector for new tasks */}
            {!task && templates.length > 0 && (
              <Select onValueChange={id => { const t = templates.find(t => t.id === id); if (t) applyTemplate(t); }}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-40">
                  <div className="flex items-center gap-1.5">
                    <LayoutTemplate className="w-3 h-3 text-muted-foreground" />
                    <SelectValue placeholder="Use template…" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        {task ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4 bg-muted p-1 rounded-xl shrink-0">
              <TabsTrigger value="details" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Details</TabsTrigger>
              <TabsTrigger value="discussion" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Discussion</TabsTrigger>
              <TabsTrigger value="time" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Time</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Activity</TabsTrigger>
              <TabsTrigger value="watchers" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Watchers</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              {/* ── Details tab ─────────────────────────────────────────────── */}
              <TabsContent value="details" className="h-full overflow-y-auto space-y-0 mt-0 pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary font-medium text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                        <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                          <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-9">
                            <SelectValue>
                              {(() => {
                                const s = stages.find(s => s.id === status);
                                const dot = stageColorSolid(status);
                                return s ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-2 h-2 rounded-full", dot)} />
                                    <span className="text-sm font-medium">{s.label}</span>
                                  </div>
                                ) : <span className="text-sm">{status}</span>;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {stages.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-1.5">
                                  <div className={cn("w-2 h-2 rounded-full", stageColorSolid(s.id))} />
                                  <span className="text-sm">{s.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                        <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                          <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-9">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <AssigneeSelect users={users} value={assigneeId} onChange={setAssigneeId} />

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary font-medium h-9 text-foreground"
                      />
                    </div>

                    {milestones.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <MilestoneIcon className="w-3 h-3" /> Milestone
                        </label>
                        <Select value={milestoneId ?? 'none'} onValueChange={v => setMilestoneId(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-9">
                            <SelectValue placeholder="No milestone" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="none" className="italic text-muted-foreground text-sm">None</SelectItem>
                            {milestones.map(m => (
                              <SelectItem key={m.id} value={m.id} className="text-sm">{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Recurrence
                      </label>
                      <Select
                        value={recurrenceRule ?? 'none'}
                        onValueChange={v => setRecurrenceRule(v === 'none' ? undefined : v as RecurrenceRule)}
                      >
                        <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-9">
                          <SelectValue placeholder="No recurrence" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="none" className="italic text-muted-foreground text-sm">None</SelectItem>
                          {RECURRENCE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                        <span className={cn("text-[10px] font-bold tabular-nums", isDescriptionTooLong ? "text-red-500" : "text-muted-foreground")}>
                          {description.length}/{MAX_DESCRIPTION_LENGTH}
                        </span>
                      </div>
                      <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add more details…"
                        className={cn(
                          "min-h-[120px] bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm text-foreground",
                          isDescriptionTooLong && "ring-1 ring-red-500"
                        )}
                      />
                    </div>

                    <SubtasksPanel
                      subtasks={task.subtasks ?? []}
                      onChange={(newSubtasks) => {
                        const pid = task.projectId || activeProjectId || '';
                        updateSubtasks(task.id, newSubtasks, pid).catch(() => {});
                        const prev = task.subtasks ?? [];
                        const added = newSubtasks.find(s => !prev.some(p => p.id === s.id));
                        const toggled = newSubtasks.find(s => {
                          const old = prev.find(p => p.id === s.id);
                          return old && old.completed !== s.completed;
                        });
                        if (added) addActivityLog(task.id, pid, 'subtask_added', { newValue: added.title }).catch(() => {});
                        else if (toggled) addActivityLog(task.id, pid, 'subtask_completed', { newValue: toggled.title }).catch(() => {});
                      }}
                    />

                    <DependenciesPanel task={task} allTasks={allTasks} />

                    {customFieldDefs.length > 0 && (
                      <CustomFieldsPanel taskId={task.id} fieldDefs={customFieldDefs} />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── Discussion tab ───────────────────────────────────────────── */}
              <TabsContent value="discussion" className="mt-0 h-full overflow-hidden">
                <TaskComments
                  key={task.id}
                  projectId={task.projectId || activeProjectId || ''}
                  taskId={task.id}
                  users={users}
                />
              </TabsContent>

              {/* ── Time tab ─────────────────────────────────────────────────── */}
              <TabsContent value="time" className="mt-0 h-full overflow-y-auto">
                <TimeTrackingPanel
                  taskId={task.id}
                  projectId={task.projectId || activeProjectId || ''}
                  currentUserId={currentUserId}
                  users={users}
                />
              </TabsContent>

              {/* ── Activity tab ─────────────────────────────────────────────── */}
              <TabsContent value="activity" className="mt-0 h-full overflow-y-auto">
                <ActivityLogPanel taskId={task.id} users={users} />
              </TabsContent>

              {/* ── Watchers tab ─────────────────────────────────────────────── */}
              <TabsContent value="watchers" className="flex-1 overflow-y-auto mt-0">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Watchers ({watchers.length})</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={handleToggleWatch}
                    >
                      {isWatching ? <><EyeOff className="w-3.5 h-3.5" /> Unwatch</> : <><Eye className="w-3.5 h-3.5" /> Watch</>}
                    </Button>
                  </div>
                  {watchers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No watchers yet. Click Watch to follow this task.</p>
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
          </Tabs>
        ) : (
          /* ── New task form ────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto min-h-0 space-y-5 py-4 pr-2 -mr-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title <span className="text-red-500">*</span></label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary font-medium text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                    <SelectValue>
                      {(() => {
                        const s = stages.find(s => s.id === status);
                        return s ? (
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", stageColorSolid(status))} />
                            <span className="text-sm font-medium">{s.label}</span>
                          </div>
                        ) : <span className="text-sm">{status}</span>;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", stageColorSolid(s.id))} />
                          <span className="text-sm">{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AssigneeSelect users={users} value={assigneeId} onChange={setAssigneeId} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary font-medium h-10 text-foreground"
              />
            </div>

            {milestones.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <MilestoneIcon className="w-3.5 h-3.5" /> Milestone
                </label>
                <Select value={milestoneId ?? 'none'} onValueChange={v => setMilestoneId(v === 'none' ? undefined : v)}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                    <SelectValue placeholder="No milestone" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="none" className="italic text-muted-foreground text-sm">None</SelectItem>
                    {milestones.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-sm">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Recurrence
              </label>
              <Select
                value={recurrenceRule ?? 'none'}
                onValueChange={v => setRecurrenceRule(v === 'none' ? undefined : v as RecurrenceRule)}
              >
                <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                  <SelectValue placeholder="No recurrence" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none" className="italic text-muted-foreground text-sm">None</SelectItem>
                  {RECURRENCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Description</label>
                <span className={cn("text-[10px] font-bold tabular-nums", isDescriptionTooLong ? "text-red-500" : "text-muted-foreground")}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add more details…"
                className={cn(
                  "min-h-[100px] bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm text-foreground",
                  isDescriptionTooLong && "ring-1 ring-red-500"
                )}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-4 bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-xl shrink-0">
          {task && onDelete && (
            <div className="flex items-center gap-2">
              {isConfirmingDelete ? (
                <>
                  <Button variant="ghost" size="sm" className="text-muted-foreground font-semibold" onClick={() => setIsConfirmingDelete(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 font-bold" onClick={() => { onDelete(task.id); onOpenChange(false); }}>
                    Confirm Delete
                  </Button>
                </>
              ) : (
                <Button variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-400/10 font-semibold" onClick={() => setIsConfirmingDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
          )}

          {/* Save as template (for existing tasks) */}
          {task && projectId && (
            <div className="flex items-center gap-2">
              {showTemplateSave ? (
                <>
                  <Input
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Template name…"
                    className="h-8 text-xs bg-muted/50 border-none w-36 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setShowTemplateSave(false)}>Cancel</Button>
                  <Button size="sm" className="h-8 text-xs" onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate}>
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-muted-foreground text-xs gap-1" onClick={() => setShowTemplateSave(true)}>
                  <LayoutTemplate className="w-3 h-3" /> Save as template
                </Button>
              )}
            </div>
          )}

          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-muted-foreground">Cancel</Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold rounded-xl px-6"
            onClick={handleSave}
            disabled={!title.trim() || isDescriptionTooLong}
          >
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssigneeSelect({ users, value, onChange }: { users: UserProfile[]; value?: string; onChange: (id?: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignee</label>
      <Select value={value || 'unassigned'} onValueChange={v => onChange(v === 'unassigned' ? undefined : v)}>
        <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-10">
          <SelectValue>
            {value && users.find(u => u.uid === value) ? (() => {
              const user = users.find(u => u.uid === value)!;
              return (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-5 w-5 border border-border">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{user.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.displayName || 'Unnamed'}</span>
                </div>
              );
            })() : <span className="text-muted-foreground italic">Unassigned</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[200px] bg-popover border-border">
          <SelectItem value="unassigned" className="font-medium text-muted-foreground italic">
            <div className="flex items-center space-x-2 py-0.5">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              </div>
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {users.map(user => (
            <SelectItem key={user.uid} value={user.uid}>
              <div className="flex items-center space-x-2 py-0.5">
                <Avatar className="h-5 w-5 border border-border shadow-sm">
                  <AvatarImage src={user.photoURL || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">{user.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm text-foreground">{user.displayName || 'Unnamed'}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
