import React from 'react';
import { Task, TaskStatus, TaskPriority, Stage, UserProfile, Milestone } from '../types';
import { CardContent } from '@/components/ui/card';
import { Plus, Clock, Calendar, RefreshCw, Milestone as MilestoneIcon, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { UserAvatar } from './UserAvatar';

export type SwimlaneBy = 'assignee' | 'priority' | null;

interface TaskBoardProps {
  tasks: Task[];
  stages: Stage[];
  users?: UserProfile[];
  milestones?: Milestone[];
  selectedTaskIds?: Set<string>;
  selectionMode?: boolean;
  swimlaneBy?: SwimlaneBy;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onSwimlaneChange?: (taskId: string, newAssigneeId: string | null, newPriority: TaskPriority | null) => void;
  onSelectionChange?: (ids: Set<string>) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { text: string; dot: string; label: string }> = {
  low:    { text: 'text-slate-400',  dot: 'bg-slate-400',  label: 'LOW' },
  medium: { text: 'text-sky-400',    dot: 'bg-sky-400',    label: 'MEDIUM' },
  high:   { text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'HIGH' },
  urgent: { text: 'text-rose-400',   dot: 'bg-rose-500',   label: 'URGENT' },
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface TaskCardProps {
  task: Task;
  index: number;
  users: UserProfile[];
  milestones: Milestone[];
  selected: boolean;
  selectionMode: boolean;
  onClick: (task: Task) => void;
  onToggleSelect: (id: string) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
}

function TaskCard({ task, index, users, milestones, selected, selectionMode, onClick, onToggleSelect, onInlineEdit }: TaskCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate && (task.dueDate.split('T')[0]) < todayStr;
  const isToday = (task.dueDate?.split('T')[0]) === todayStr;
  const milestone = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : undefined;
  const completedSubtasks = (task.subtasks ?? []).filter(s => s.completed).length;
  const totalSubtasks = (task.subtasks ?? []).length;

  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(task.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  // Only show the assignee — multiple assignees are not supported
  const taskUsers = task.assigneeId
    ? [users.find(u => u.uid === task.assigneeId)].filter((u): u is UserProfile => !!u)
    : [];

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn("cursor-grab active:cursor-grabbing outline-none", snapshot.isDragging ? "z-50" : "")}
          onClick={() => {
            if (snapshot.isDragging) return;
            if (selectionMode) { onToggleSelect(task.id); return; }
            onClick(task);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            whileHover={snapshot.isDragging ? undefined : { y: -1 }}
            transition={{ duration: 0.12 }}
          >
            <div className={cn(
              "rounded-xl border transition-all duration-150 select-none relative",
              snapshot.isDragging
                ? "bg-card border-primary/50 shadow-[0_12px_40px_-8px_oklch(0.67_0.30_285_/_0.45)] scale-[1.02]"
                : selected
                ? "bg-primary/10 border-primary/50"
                : "bg-card border-border/30 hover:border-border/70 hover:shadow-md cursor-pointer"
            )}>
              {selectionMode && (
                <div className="absolute top-3 right-3 z-10">
                  <div className={cn(
                    "w-4 h-4 rounded border-2 transition-colors",
                    selected ? "bg-primary border-primary" : "border-border bg-transparent"
                  )}>
                    {selected && <div className="w-full h-full flex items-center justify-center text-primary-foreground text-[8px]">✓</div>}
                  </div>
                </div>
              )}
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className={cn("flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase", pCfg.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pCfg.dot, task.priority === 'urgent' ? 'animate-pulse' : '')} />
                    {pCfg.label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {task.recurrenceRule && (
                      <span title={`Recurring ${task.recurrenceRule}`}><RefreshCw className="w-3 h-3 text-muted-foreground/40" /></span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 truncate max-w-[100px]">
                        {task.tags.slice(0, 2).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                {editing ? (
                  <input
                    ref={inputRef}
                    className="text-sm font-semibold text-foreground leading-snug w-full bg-transparent border-b border-primary outline-none"
                    value={editTitle}
                    maxLength={200}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setEditing(false);
                        if (editTitle.trim() && editTitle !== task.title) onInlineEdit?.(task.id, editTitle.trim());
                      }
                      if (e.key === 'Escape') { setEditing(false); setEditTitle(task.title); }
                    }}
                    onBlur={() => {
                      if (snapshot.isDragging) return;
                      setEditing(false);
                      if (editTitle.trim() && editTitle !== task.title) onInlineEdit?.(task.id, editTitle.trim());
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <h4
                    className="text-sm font-semibold text-foreground leading-snug cursor-pointer"
                    onDoubleClick={e => { e.stopPropagation(); setEditing(true); setEditTitle(task.title); }}
                  >{task.title}</h4>
                )}

                {task.description && (
                  <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">{task.description}</p>
                )}

                {milestone && (
                  <div className="flex items-center gap-1 text-[10px] text-purple-400/80">
                    <MilestoneIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{milestone.name}</span>
                  </div>
                )}

                {totalSubtasks > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <CheckSquare className="w-3 h-3" />
                      <span>{completedSubtasks}/{totalSubtasks}</span>
                    </div>
                    <div className="flex-1 bg-muted/40 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    {task.createdAt && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 font-medium">
                        <Clock className="w-3 h-3" />{formatDate(task.createdAt)}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold",
                        isOverdue ? "text-rose-400" : isToday ? "text-amber-400" : "text-muted-foreground/60"
                      )}>
                        <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  {taskUsers.length > 0 && (
                    <div className="flex items-center -space-x-2">
                      {taskUsers.map((u, i) => (
                        <UserAvatar
                          key={u.uid}
                          photoURL={u.photoURL}
                          displayName={u.displayName}
                          className={cn("h-6 w-6 text-[9px] ring-2 ring-card shadow-sm shrink-0", i > 0 ? "relative" : "")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </motion.div>
        </div>
      )}
    </Draggable>
  );
}

interface ColumnProps {
  col: Stage;
  tasks: Task[];
  users: UserProfile[];
  milestones: Milestone[];
  selectedTaskIds: Set<string>;
  selectionMode: boolean;
  swimlaneLabel?: string;
  droppableId?: string;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onToggleSelect: (id: string) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
}

function Column({ col, tasks, users, milestones, selectedTaskIds, selectionMode, droppableId, onTaskClick, onAddTask, onToggleSelect, onInlineEdit }: ColumnProps) {
  const bgColorRaw = col.color.split(' ').find(c => c.startsWith('bg-'));
  const bgColor = bgColorRaw ? bgColorRaw.split('/')[0] : 'bg-violet-500';

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col rounded-2xl bg-card/50 border border-border/30">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", bgColor)} />
          <span className="text-sm font-semibold text-foreground truncate">{col.label}</span>
          <span className="text-xs font-bold text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full tabular-nums shrink-0">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-lg" onClick={() => onAddTask(col.id)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Droppable droppableId={droppableId ?? col.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 flex flex-col gap-2.5 px-3 min-h-[60px] transition-all duration-150",
              snapshot.isDraggingOver ? "bg-primary/5 rounded-xl" : ""
            )}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-12 text-[11px] text-muted-foreground/30 italic select-none">
                Drop tasks here
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                users={users}
                milestones={milestones}
                selected={selectedTaskIds.has(task.id)}
                selectionMode={selectionMode}
                onClick={onTaskClick}
                onToggleSelect={onToggleSelect}
                onInlineEdit={onInlineEdit}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button
        className="flex items-center justify-center gap-1.5 mx-3 my-3 py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors rounded-lg hover:bg-muted/30 font-medium"
        onClick={() => onAddTask(col.id)}
      >
        <Plus className="w-3.5 h-3.5" />
        Add task
      </button>
    </div>
  );
}

export function TaskBoard({
  tasks, stages, users = [], milestones = [],
  selectedTaskIds = new Set(), selectionMode = false, swimlaneBy = null,
  onTaskClick, onAddTask, onStatusChange, onSwimlaneChange, onSelectionChange, onInlineEdit,
}: TaskBoardProps) {

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // In swimlane mode droppableIds are "groupKey:stageId"
    const extractParts = (id: string) => {
      const colonIdx = id.indexOf(':');
      return colonIdx === -1
        ? { group: null, status: id }
        : { group: id.slice(0, colonIdx), status: id.slice(colonIdx + 1) };
    };

    const dest = extractParts(destination.droppableId);
    const src = extractParts(source.droppableId);

    if (dest.status !== src.status) {
      onStatusChange(draggableId, dest.status as TaskStatus);
    }

    if (swimlaneBy && dest.group !== null && src.group !== null && dest.group !== src.group) {
      const newAssigneeId = swimlaneBy === 'assignee'
        ? (dest.group === '__unassigned__' ? null : dest.group)
        : null;
      const newPriority = swimlaneBy === 'priority' ? dest.group as TaskPriority : null;
      onSwimlaneChange?.(draggableId, newAssigneeId, newPriority);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const getTasksByStatus = (status: TaskStatus, filterTasks?: Task[]) =>
    (filterTasks ?? tasks).filter(t => t.status === status);

  if (!swimlaneBy) {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto px-4 md:px-6 py-5 bg-transparent relative z-10">
          <div className="flex gap-4 min-h-full items-start">
            {stages.map(col => (
              <Column
                key={col.id}
                col={col}
                tasks={getTasksByStatus(col.id)}
                users={users}
                milestones={milestones}
                selectedTaskIds={selectedTaskIds}
                selectionMode={selectionMode}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                onToggleSelect={handleToggleSelect}
                onInlineEdit={onInlineEdit}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    );
  }

  // ── Swimlane mode ────────────────────────────────────────────────────────

  const swimlaneGroups: { key: string; label: string; tasks: Task[] }[] = [];

  if (swimlaneBy === 'assignee') {
    const seen = new Set<string>();
    tasks.forEach(t => {
      const key = t.assigneeId ?? '__unassigned__';
      if (!seen.has(key)) {
        seen.add(key);
        const user = users.find(u => u.uid === key);
        swimlaneGroups.push({
          key,
          label: user?.displayName ?? 'Unassigned',
          tasks: tasks.filter(tt => (tt.assigneeId ?? '__unassigned__') === key),
        });
      }
    });
    if (swimlaneGroups.length === 0) swimlaneGroups.push({ key: '__unassigned__', label: 'Unassigned', tasks: [] });
  } else {
    PRIORITY_ORDER.forEach(p => {
      const grouped = tasks.filter(t => t.priority === p);
      if (grouped.length > 0) {
        swimlaneGroups.push({ key: p, label: PRIORITY_LABELS[p], tasks: grouped });
      }
    });
    if (swimlaneGroups.length === 0) swimlaneGroups.push({ key: 'medium', label: 'Medium', tasks: [] });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-auto px-4 md:px-6 py-5 bg-transparent relative z-10 space-y-6">
        {swimlaneGroups.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-3 mb-3 px-1">
              {swimlaneBy === 'assignee' && group.key !== '__unassigned__' && (() => {
                const u = users.find(u => u.uid === group.key);
                return (
                  <UserAvatar
                    photoURL={u?.photoURL ?? null}
                    displayName={u?.displayName ?? null}
                    className="h-6 w-6 text-[9px]"
                  />
                );
              })()}
              <span className="text-sm font-bold text-foreground">{group.label}</span>
              <span className="text-xs text-muted-foreground/50">({group.tasks.length})</span>
              <div className="flex-1 h-px bg-border/30" />
            </div>
            <div className="flex gap-4 items-start overflow-x-auto">
              {stages.map(col => (
                <Column
                  key={`${group.key}-${col.id}`}
                  col={col}
                  droppableId={`${group.key}:${col.id}`}
                  tasks={getTasksByStatus(col.id, group.tasks)}
                  users={users}
                  milestones={milestones}
                  selectedTaskIds={selectedTaskIds}
                  selectionMode={selectionMode}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                  onToggleSelect={handleToggleSelect}
                  onInlineEdit={onInlineEdit}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
