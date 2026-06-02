import React from 'react';
import { Task, Project } from '../types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-500/80 text-white',
  high:   'bg-orange-500/80 text-white',
  medium: 'bg-blue-500/80 text-white',
  low:    'bg-muted-foreground/40 text-foreground',
};

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  isClosed: (task: Task) => boolean;
  onTaskClick: (task: Task) => void;
  onNewTask: (dueDate: string) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarView({ tasks, projects, isClosed, onTaskClick, onNewTask }: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Map task due dates to day numbers
  const tasksByDay = React.useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const datePart = task.dueDate.split('T')[0];
      const [y, mo, dy] = datePart.split('-').map(Number);
      if (y === viewYear && mo - 1 === viewMonth) {
        const day = dy;
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(task);
      }
    });
    return map;
  }, [tasks, viewYear, viewMonth]);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : -1;

  const cells = React.useMemo(() => {
    const arr: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    // Pad to complete last week
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const makeDateStr = (day: number) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground w-44 text-center">{monthName}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
        >
          Today
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-border/40 shrink-0">
        {dayNames.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="border-b border-r border-border/20 bg-muted/10" />;
            }
            const dayTasks = tasksByDay.get(day) ?? [];
            const isToday = day === todayDay;
            const dateStr = makeDateStr(day);

            return (
              <div
                key={idx}
                className={cn(
                  "border-b border-r border-border/20 p-1.5 flex flex-col group hover:bg-muted/20 transition-colors",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground/60"
                  )}>
                    {day}
                  </span>
                  <button
                    onClick={() => onNewTask(dateStr)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate transition-opacity hover:opacity-80",
                        PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium,
                        isClosed(task) && "opacity-40 line-through"
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/50 pl-1">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
