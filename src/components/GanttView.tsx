import React from 'react';
import { Task, UserProfile, Stage } from '../types';
import { addDays, format, startOfWeek, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';

interface GanttViewProps {
  tasks: Task[];
  stages: Stage[];
  users: UserProfile[];
  onTaskClick: (task: Task) => void;
}

const PRIORITY_BAR: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-violet-500',
  low: 'bg-slate-500',
};

export function GanttView({ tasks, stages, users, onTaskClick }: GanttViewProps) {
  const today = React.useMemo(() => new Date(), []);
  const weekStart = React.useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const DAYS = 28;
  const DAY_W = 40;

  const days = React.useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const tasksWithDates = React.useMemo(
    () => tasks.filter(t => t.dueDate).map(t => {
      const due = parseISO(t.dueDate!);
      const created = t.createdAt ? parseISO(t.createdAt) : addDays(due, -1);
      return { task: t, start: created, end: due };
    }),
    [tasks]
  );

  const getBarStyle = (start: Date, end: Date) => {
    const rangeStart = weekStart;
    const startOffset = Math.max(0, differenceInDays(start, rangeStart));
    const endOffset = Math.min(DAYS, differenceInDays(end, rangeStart) + 1);
    const width = Math.max(1, endOffset - startOffset);
    if (endOffset <= 0 || startOffset >= DAYS) return null;
    return { left: startOffset * DAY_W, width: width * DAY_W };
  };

  const todayOffset = differenceInDays(today, weekStart);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <div className="w-56 shrink-0 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Task</div>
          <div className="flex">
            {days.map((d, i) => {
              const isToday = differenceInDays(d, today) === 0;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  style={{ width: DAY_W }}
                  className={cn(
                    "text-center py-2 text-[10px] font-semibold border-r border-border/20 shrink-0",
                    isToday ? "text-primary" : isWeekend ? "text-muted-foreground/40" : "text-muted-foreground/70"
                  )}
                >
                  <div>{format(d, 'EEE')}</div>
                  <div className={cn("text-[9px]", isToday && "text-primary font-bold")}>{format(d, 'd')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {/* Today line */}
          {todayOffset >= 0 && todayOffset < DAYS && (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/50 z-10 pointer-events-none"
              style={{ left: 256 + todayOffset * DAY_W + DAY_W / 2 }}
            />
          )}

          {tasksWithDates.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No tasks with due dates. Add due dates to tasks to see them on the timeline.
            </div>
          ) : (
            tasksWithDates.map(({ task, start, end }) => {
              const bar = getBarStyle(start, end);
              const assignee = users.find(u => u.uid === task.assigneeId);
              return (
                <div key={task.id} className="flex items-center border-b border-border/20 hover:bg-muted/20 transition-colors group" style={{ height: 48 }}>
                  <div
                    className="w-56 shrink-0 px-4 flex items-center gap-2 cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    {assignee && (
                      <UserAvatar photoURL={assignee.photoURL} displayName={assignee.displayName} className="w-5 h-5 text-[8px] shrink-0" />
                    )}
                    <span className="text-xs text-foreground truncate font-medium group-hover:text-primary transition-colors">{task.title}</span>
                  </div>
                  <div className="relative flex-1 h-full" style={{ width: DAYS * DAY_W }}>
                    {/* Grid lines */}
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn("absolute top-0 bottom-0 border-r border-border/20", isWeekend && "bg-muted/10")}
                          style={{ left: i * DAY_W, width: DAY_W }}
                        />
                      );
                    })}
                    {bar && (
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 rounded-full h-5 cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2",
                          PRIORITY_BAR[task.priority] ?? 'bg-slate-500'
                        )}
                        style={{ left: bar.left, width: bar.width }}
                        onClick={() => onTaskClick(task)}
                        title={`${task.title} — ${format(start, 'MMM d')} → ${format(end, 'MMM d')}`}
                      >
                        <span className="text-[9px] text-white font-bold truncate">{bar.width > 60 ? task.title : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
