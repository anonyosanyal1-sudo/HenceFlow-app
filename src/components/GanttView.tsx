import React from 'react';
import { Task, UserProfile, Stage } from '../types';
import { addDays, subDays, format, startOfWeek, differenceInDays, parseISO, min, max } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const MIN_DAYS = 28;
const DAY_W = 40;
const PAD_DAYS = 3;

export function GanttView({ tasks, stages, users, onTaskClick }: GanttViewProps) {
  const today = React.useMemo(() => new Date(), []);
  const [offset, setOffset] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const tasksWithDates = React.useMemo(
    () => tasks.filter(t => t.dueDate).map(t => {
      const due = parseISO(t.dueDate!);
      // Use today as bar start if no meaningful start date exists,
      // capped to at most 7 days before due to avoid very long bars.
      const created = t.createdAt ? parseISO(t.createdAt) : new Date();
      const minStart = addDays(due, -7);
      const start = max([created, minStart]);
      return { task: t, start, end: due };
    }),
    [tasks]
  );

  const { windowStart, DAYS } = React.useMemo(() => {
    const baseStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), offset * 7);
    if (tasksWithDates.length === 0) {
      return { windowStart: baseStart, DAYS: MIN_DAYS };
    }
    const allStarts = tasksWithDates.map(t => t.start);
    const allEnds = tasksWithDates.map(t => t.end);
    const earliest = min([...allStarts, today]);
    const latest = max([...allEnds, today]);
    const paddedStart = subDays(earliest, PAD_DAYS);
    const paddedEnd = addDays(latest, PAD_DAYS);
    const span = Math.max(MIN_DAYS, differenceInDays(paddedEnd, paddedStart) + 1);
    if (offset !== 0) return { windowStart: baseStart, DAYS: MIN_DAYS };
    return { windowStart: paddedStart, DAYS: span };
  }, [tasksWithDates, today, offset]);

  const days = React.useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart, DAYS]
  );

  const getBarStyle = (start: Date, end: Date) => {
    const startOffset = Math.max(0, differenceInDays(start, windowStart));
    const endOffset = Math.min(DAYS, differenceInDays(end, windowStart) + 1);
    const width = Math.max(1, endOffset - startOffset);
    if (endOffset <= 0 || startOffset >= DAYS) return null;
    return { left: startOffset * DAY_W, width: width * DAY_W };
  };

  const todayOffset = differenceInDays(today, windowStart);

  // Scroll to today when the user clicks "Today"
  const scrollToToday = () => {
    setOffset(0);
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const labelW = 224; // 56px per tailwind unit × 4
      const todayPx = labelW + todayOffset * DAY_W - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, todayPx);
    });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-4">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <div className="w-56 shrink-0 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setOffset(o => o - 1)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={scrollToToday}
                className="px-1.5 h-5 rounded text-[9px] font-semibold text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setOffset(o => o + 1)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
              style={{ left: 224 + todayOffset * DAY_W + DAY_W / 2 }}
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
                        title={`${task.title} — due ${format(end, 'MMM d')}`}
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
