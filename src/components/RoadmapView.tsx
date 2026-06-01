import React from 'react';
import { Project, Milestone, Task } from '../types';
import { ChevronLeft, ChevronRight, Flag, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RoadmapViewProps {
  projects: Project[];
  allMilestones: Milestone[];
  allTasks: Task[];
  onMilestoneClick?: (milestone: Milestone) => void;
}

function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= endMonth) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export function RoadmapView({ projects, allMilestones, allTasks, onMilestoneClick }: RoadmapViewProps) {
  const today = new Date();
  const [offset, setOffset] = React.useState(0); // months offset from "today - 1 month"

  const startDate = React.useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1 + offset, 1);
    return d;
  }, [offset]);

  const visibleMonths = 6;
  const endDate = React.useMemo(() => {
    return new Date(startDate.getFullYear(), startDate.getMonth() + visibleMonths, 0);
  }, [startDate]);

  const months = React.useMemo(() => getMonthsBetween(startDate, endDate), [startDate, endDate]);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400_000);

  const getXPercent = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.ceil((d.getTime() - startDate.getTime()) / 86400_000);
    return Math.max(0, Math.min(100, (diff / totalDays) * 100));
  };

  const activeProjects = projects.filter(p => !p.isArchived);

  const milestonesWithTasks = React.useMemo(() => {
    return allMilestones.map(m => ({
      milestone: m,
      tasks: allTasks.filter(t => t.milestoneId === m.id),
    }));
  }, [allMilestones, allTasks]);

  const monthWidth = `${(1 / visibleMonths) * 100}%`;

  if (activeProjects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Flag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create a project to see the roadmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground">Company Roadmap</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Milestones across all projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOffset(0)}>
            Today
          </Button>
          <div className="flex items-center bg-muted/30 border border-border/30 rounded-lg p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffset(o => o - visibleMonths)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffset(o => o + visibleMonths)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Project names column */}
        <div className="w-48 shrink-0 border-r border-border/40 overflow-y-auto">
          {/* Month header spacer */}
          <div className="h-10 border-b border-border/40" />
          {/* Today spacer */}
          <div className="h-px" />
          {activeProjects.map(project => (
            <div
              key={project.id}
              className="h-16 flex items-center px-4 border-b border-border/20"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color }} />
                <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {/* Month headers */}
          <div className="flex h-10 border-b border-border/40 sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
            {months.map((month, idx) => (
              <div
                key={idx}
                style={{ width: monthWidth }}
                className="shrink-0 flex items-center justify-center border-r border-border/20 text-xs font-semibold text-muted-foreground/60"
              >
                {month.toLocaleString('default', { month: 'short' })} {month.getFullYear()}
              </div>
            ))}
          </div>

          {/* Project rows */}
          <div className="relative">
            {/* Today marker */}
            {(() => {
              const pct = getXPercent(today.toISOString().split('T')[0]);
              if (pct < 0 || pct > 100) return null;
              return (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/60 z-20 pointer-events-none"
                  style={{ left: `${pct}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
              );
            })()}

            {/* Month grid lines */}
            {months.map((_, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 border-r border-border/15"
                style={{ left: `${((idx + 1) / months.length) * 100}%` }}
              />
            ))}

            {activeProjects.map(project => {
              const projectMilestones = milestonesWithTasks.filter(
                m => m.milestone.projectId === project.id && m.milestone.dueDate
              );

              return (
                <div key={project.id} className="relative h-16 border-b border-border/20">
                  {projectMilestones.map(({ milestone, tasks }) => {
                    const pct = getXPercent(milestone.dueDate!);
                    const completedTasks = tasks.filter(t => t.status === 'closed').length;
                    const progress = tasks.length > 0 ? completedTasks / tasks.length : 0;
                    const isPast = new Date(milestone.dueDate!) < today;
                    const isComplete = progress === 1;

                    return (
                      <button
                        key={milestone.id}
                        onClick={() => onMilestoneClick?.(milestone)}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group z-10"
                        style={{ left: `${pct}%` }}
                        title={milestone.name}
                      >
                        {/* Diamond shape */}
                        <div className={cn(
                          "w-4 h-4 rotate-45 border-2 transition-transform group-hover:scale-125",
                          isComplete ? "bg-emerald-500 border-emerald-400" :
                          isPast ? "bg-red-500/40 border-red-400" :
                          "bg-primary/40 border-primary"
                        )} />
                        {/* Label */}
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-popover border border-border/60 rounded-lg px-2 py-1 text-[11px] font-medium text-foreground shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p>{milestone.name}</p>
                          {milestone.dueDate && (
                            <p className="text-muted-foreground/60 text-[10px]">
                              {new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          {tasks.length > 0 && (
                            <p className="text-muted-foreground/60 text-[10px]">{completedTasks}/{tasks.length} tasks</p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {projectMilestones.length === 0 && (
                    <div className="absolute inset-0 flex items-center px-4">
                      <div className="flex-1 h-px bg-border/20 border-dashed border-t border-border/20" />
                      <span className="text-[10px] text-muted-foreground/30 px-2">No milestones</span>
                      <div className="flex-1 h-px bg-border/20 border-dashed border-t border-border/20" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 border-t border-border/40 flex items-center gap-4 text-[11px] text-muted-foreground/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-emerald-500 border-2 border-emerald-400" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-primary/40 border-2 border-primary" />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-red-500/40 border-2 border-red-400" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-primary/60" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
