import React from 'react';
import { Task, Project, UserProfile, Milestone } from '../types';
import { Calendar, Flag, Star, ChevronRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/button';

const PRIORITY_META = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/10' },
  high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low:    { label: 'Low',    color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

interface MyWorkViewProps {
  allTasks: Task[];
  projects: Project[];
  users: UserProfile[];
  milestones: Milestone[];
  currentUserId: string;
  pinnedTaskIds: Set<string>;
  onTaskClick: (task: Task) => void;
  onPinToggle: (taskId: string) => void;
}

function TaskRow({
  task,
  project,
  isPinned,
  onTaskClick,
  onPinToggle,
}: {
  task: Task;
  project?: Project;
  isPinned: boolean;
  onTaskClick: (task: Task) => void;
  onPinToggle: (taskId: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseLocalDate(task.dueDate);
  const isOverdue = dueDate && dueDate < today && task.status !== 'closed';
  const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;

  return (
    <div
      onClick={() => onTaskClick(task)}
      className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-all border border-transparent hover:border-border/30"
    >
      {/* Status dot */}
      <div className="mt-0.5 shrink-0">
        {task.status === 'closed' ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <div className={cn("w-4 h-4 rounded-full border-2", isOverdue ? "border-red-400" : "border-muted-foreground/30")} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug truncate", task.status === 'closed' && "line-through text-muted-foreground/50")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {project && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md font-medium text-muted-foreground/60 bg-muted/30"
              style={{ borderLeft: `3px solid ${project.color}` }}
            >
              {project.name}
            </span>
          )}
          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-md font-semibold", pm.color, pm.bg)}>
            {pm.label}
          </span>
          {dueDate && (
            <span className={cn(
              "flex items-center gap-1 text-[11px]",
              isOverdue ? "text-red-400 font-semibold" : isDueToday ? "text-amber-400 font-semibold" : "text-muted-foreground/50"
            )}>
              <Calendar className="w-3 h-3" />
              {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
              {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="text-[11px] text-muted-foreground/40">
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
            </span>
          )}
        </div>
      </div>

      {/* Pin button */}
      <button
        onClick={e => { e.stopPropagation(); onPinToggle(task.id); }}
        className={cn(
          "shrink-0 p-1 rounded-md transition-all",
          isPinned ? "text-amber-400" : "text-muted-foreground/20 group-hover:text-muted-foreground/50"
        )}
        title={isPinned ? 'Unpin task' : 'Pin task'}
      >
        <Star className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
      </button>
    </div>
  );
}

export function MyWorkView({
  allTasks,
  projects,
  milestones: _milestones,
  currentUserId,
  pinnedTaskIds,
  onTaskClick,
  onPinToggle,
}: MyWorkViewProps) {
  const [filter, setFilter] = React.useState<'all' | 'active' | 'overdue' | 'upcoming'>('all');

  const myTasks = React.useMemo(() => {
    return allTasks.filter(t => t.assigneeId === currentUserId);
  }, [allTasks, currentUserId]);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekEnd = React.useMemo(() => new Date(today.getTime() + 7 * 86400_000), [today]);

  const filtered = React.useMemo(() => {
    switch (filter) {
      case 'active':
        return myTasks.filter(t => t.status !== 'closed');
      case 'overdue':
        return myTasks.filter(t => { const d = parseLocalDate(t.dueDate); return d && d < today && t.status !== 'closed'; });
      case 'upcoming':
        return myTasks.filter(t => {
          const d = parseLocalDate(t.dueDate);
          return d && d >= today && d <= weekEnd;
        });
      default:
        return myTasks;
    }
  }, [myTasks, filter, today, weekEnd]);

  const pinnedTasks = filtered.filter(t => pinnedTaskIds.has(t.id));
  const unpinnedTasks = filtered.filter(t => !pinnedTaskIds.has(t.id));

  const groupedByProject = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    unpinnedTasks.forEach(task => {
      const key = task.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [unpinnedTasks]);

  const getProject = (id: string) => projects.find(p => p.id === id);

  const stats = {
    total: myTasks.length,
    active: myTasks.filter(t => t.status !== 'closed').length,
    overdue: myTasks.filter(t => { const d = parseLocalDate(t.dueDate); return d && d < today && t.status !== 'closed'; }).length,
    upcoming: myTasks.filter(t => {
      const d = parseLocalDate(t.dueDate);
      return d && d >= today && d <= weekEnd && t.status !== 'closed';
    }).length,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Work</h1>
        <p className="text-sm text-muted-foreground mt-1">Tasks assigned to you across all projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Flag, color: 'text-primary' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'text-blue-400' },
          { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Due soon', value: stats.upcoming, icon: Calendar, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/40 rounded-xl p-3 text-center">
            <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 bg-muted/30 p-1 rounded-lg w-fit">
        {(['all', 'active', 'overdue', 'upcoming'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 h-7 rounded-md text-xs font-semibold capitalize transition-all",
              filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400/40 mb-4" />
          <p className="text-muted-foreground font-medium">No tasks here</p>
          <p className="text-muted-foreground/50 text-sm mt-1">
            {filter === 'all' ? "You have no assigned tasks yet." : `No ${filter} tasks.`}
          </p>
        </div>
      )}

      {/* Pinned section */}
      {pinnedTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pinned</span>
            <span className="text-xs text-muted-foreground/50">{pinnedTasks.length}</span>
          </div>
          <div className="space-y-0.5">
            {pinnedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                project={getProject(task.projectId)}
                isPinned={true}
                onTaskClick={onTaskClick}
                onPinToggle={onPinToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tasks grouped by project */}
      {Array.from(groupedByProject.entries()).map(([projectId, tasks]) => {
        const project = getProject(projectId);
        return (
          <div key={projectId} className="mb-5">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project?.color ?? '#6366f1' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                {project?.name ?? 'Unknown project'}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
              <span className="text-xs text-muted-foreground/50">{tasks.length}</span>
            </div>
            <div className="space-y-0.5">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={project}
                  isPinned={pinnedTaskIds.has(task.id)}
                  onTaskClick={onTaskClick}
                  onPinToggle={onPinToggle}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
