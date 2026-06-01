import React from 'react';
import { Project, Task, Company, UserProfile } from '../types';
import { getClosedStageId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserAvatar } from './UserAvatar';
import {
  Settings, Trash2, Plus, AlertCircle, Users, TrendingUp,
  ChevronRight, Search,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface DashboardProps {
  company: Company | null;
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  currentUserId: string;
  onProjectSelect: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onArchiveProject?: (projectId: string, archive: boolean) => void;
  onNewProject: () => void;
  onUpdateCompany?: (data: {
    name: string; location?: string; website?: string;
    industry?: string; memberIds?: string[]; adminIds?: string[];
  }) => void;
  onDeleteCompany?: (companyId: string) => void;
  onInvite?: () => void;
  onCompanySettings?: () => void;
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Dashboard({
  company, projects, tasks, users, currentUserId,
  onProjectSelect, onEditProject, onDeleteProject, onArchiveProject, onNewProject,
  onUpdateCompany, onDeleteCompany, onInvite, onCompanySettings,
}: DashboardProps) {

  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState('');
  const [workspaceFilter, setWorkspaceFilter] = React.useState<'all' | 'active' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  const closedStageId = getClosedStageId();
  const isCompleted = (t: Task) => t.status === closedStageId;

  const isOverdue = (t: Task) =>
    !!t.dueDate && t.dueDate < today && !isCompleted(t);

  const totalTasks = tasks.length;
  const completedCount = tasks.filter(isCompleted).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

  // Velocity: tasks marked done in last 7 days ÷ 7
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentDone = tasks.filter(t => isCompleted(t) && new Date(t.updatedAt) > sevenDaysAgo).length;
  const velocity = (recentDone / 7).toFixed(1);

  // Tasks due this week
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const tasksDueThisWeek = tasks.filter(
    t => t.dueDate && t.dueDate >= today && t.dueDate <= weekEndStr && !isCompleted(t)
  ).length;

  // This-week bar chart: count tasks updated each day Mon→Sun of current week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekBars = WEEK_DAYS.map((_, i) => {
    const dayStart = new Date(weekStart); dayStart.setDate(weekStart.getDate() + i);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    return tasks.filter(t => {
      const d = new Date(t.updatedAt);
      return isCompleted(t) && d >= dayStart && d < dayEnd;
    }).length;
  });
  const maxBar = Math.max(...weekBars, 1);
  const todayDayIndex = (new Date().getDay() + 6) % 7; // 0=Mon

  // Per-project stats
  const getProjectStats = (project: Project) => {
    const closedId = getClosedStageId(project);
    const pt = tasks.filter(t => t.projectId === project.id);
    const completed = pt.filter(t => t.status === closedId).length;
    const total = pt.length;
    return { total, completed, progress: total === 0 ? 0 : Math.round((completed / total) * 100) };
  };

  // Overall progress
  const overallProgress = completionRate;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const currentUser = users.find(u => u.uid === currentUserId);
  const firstName = currentUser?.displayName?.split(' ')[0] ?? currentUser?.email?.split('@')[0] ?? 'there';

  // New tasks this week
  const newThisWeek = tasks.filter(t => new Date(t.createdAt) > sevenDaysAgo).length;

  const accentFor = (project: Project) => project.color || 'oklch(0.67 0.30 285)';

  const filteredProjects = projects.filter(p => {
    if (workspaceFilter === 'archived') return p.isArchived === true;
    if (workspaceFilter === 'active') return !p.isArchived;
    return true;
  }).filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'TOTAL TASKS',
      value: totalTasks,
      sub: newThisWeek > 0 ? `↑ ${newThisWeek} this week` : 'No new tasks',
      subColor: newThisWeek > 0 ? 'text-emerald-400' : 'text-muted-foreground',
    },
    {
      label: 'COMPLETED',
      value: completedCount,
      sub: `${completionRate}% rate`,
      subColor: 'text-muted-foreground',
    },
    {
      label: 'OVERDUE',
      value: overdueCount,
      sub: overdueCount === 0 ? 'All clear' : `${overdueCount} need attention`,
      subColor: overdueCount === 0 ? 'text-muted-foreground' : 'text-rose-400',
    },
    {
      label: 'VELOCITY',
      value: velocity,
      sub: 'tasks / day',
      subColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="h-14 shrink-0 border-b border-border/30 flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/70">{company?.name}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground">Dashboard</span>
        </div>
        {/* Right: search + icons */}
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
            <input
              placeholder="Search pods…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 h-9 w-52 rounded-xl bg-muted/40 border border-border/30 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-mono pointer-events-none">⌘K</kbd>
          </div>
          <button
            onClick={onCompanySettings}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Company Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main scroll area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 space-y-8">

          {/* ── Hero header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/60 uppercase mb-3">
                {[company?.name, company?.location].filter(Boolean).join(' · ')}
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-none">
                {greeting},{' '}
                <em className="not-italic font-light italic" style={{ fontStyle: 'italic' }}>{firstName}</em>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                You have{' '}
                <span className="font-semibold text-foreground">{projects.filter(p => !p.isArchived).length} active pod{projects.filter(p => !p.isArchived).length !== 1 ? 's' : ''}</span>
                {tasksDueThisWeek > 0 && (
                  <> and <span className="font-semibold text-foreground">{tasksDueThisWeek} task{tasksDueThisWeek !== 1 ? 's' : ''}</span> due this week</>
                )}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-9 gap-2 border-border/50 font-medium text-muted-foreground hover:text-foreground rounded-xl" onClick={onInvite}>
                <Users className="w-3.5 h-3.5" />
                Invite
              </Button>
              <Button size="sm" onClick={onNewProject} className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold">
                <Plus className="w-3.5 h-3.5" />
                New pod
              </Button>
            </div>
          </div>

          {/* ── Stats row ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-card/50 border border-border/30 rounded-2xl p-5 space-y-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">{s.label}</p>
                <p className="text-3xl font-light text-foreground">{s.value}</p>
                <p className={cn("text-xs font-medium", s.subColor)}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Progress + This week ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
            {/* Overall progress */}
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Overall progress</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Across all pods</p>
                </div>
                <span className="text-4xl font-light text-foreground">{overallProgress}<span className="text-2xl text-muted-foreground">%</span></span>
              </div>

              {/* Master bar */}
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-primary"
                />
              </div>

              {/* Per-project breakdown */}
              <div className="space-y-3.5">
                {projects.slice(0, 5).map(proj => {
                  const { total, completed, progress } = getProjectStats(proj);
                  const accent = accentFor(proj);
                  return (
                    <div key={proj.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                          <span className="text-foreground/80 font-medium truncate max-w-[200px]">{proj.name}</span>
                        </div>
                        <span className="text-muted-foreground/60 shrink-0">{completed}/{total}</span>
                      </div>
                      <div className="w-full bg-muted/40 h-1 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: accent }}
                        />
                      </div>
                    </div>
                  );
                })}
                {projects.length > 5 && (
                  <p className="text-xs text-muted-foreground/40 text-center pt-1">
                    and {projects.length - 5} more pod{projects.length - 5 !== 1 ? 's' : ''}
                  </p>
                )}
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground/40 italic text-center py-4">No pods yet</p>
                )}
              </div>
            </div>

            {/* This week */}
            <div className="bg-card/50 border border-border/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">This week</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tasks by day</p>
                </div>
                {recentDone > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {recentDone} this week
                  </span>
                )}
              </div>

              {/* Bar chart */}
              <div className="flex items-end justify-between gap-1.5 h-28 pt-2">
                {weekBars.map((count, i) => {
                  const isToday = i === todayDayIndex;
                  const heightPct = maxBar === 0 ? 0 : (count / maxBar) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, count > 0 ? 8 : 0)}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={cn(
                            "w-full rounded-t-sm",
                            isToday ? "bg-primary" : count > 0 ? "bg-muted-foreground/25" : "bg-muted/30"
                          )}
                          style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 4)}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-medium", isToday ? "text-primary" : "text-muted-foreground/40")}>
                        {WEEK_DAYS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Workspaces ──────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pods</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Active pods you're tracking</p>
              </div>
              {/* Filter tabs */}
              <div className="flex items-center bg-muted/30 border border-border/30 rounded-xl p-1 gap-0.5">
                {(['all', 'active', 'archived'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setWorkspaceFilter(f)}
                    className={cn(
                      "px-3 h-7 rounded-lg text-xs font-semibold capitalize transition-all",
                      workspaceFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/50 hover:text-muted-foreground"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(project => {
                const { total, completed, progress } = getProjectStats(project);
                const accent = accentFor(project);
                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden hover:border-border/60 hover:bg-card/80 transition-all cursor-pointer group relative"
                      onClick={() => onProjectSelect(project)}
                    >
                      {/* Top accent */}
                      <div className="h-[3px] w-full" style={{ background: accent }} />
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                            <span className="text-sm font-semibold text-foreground truncate">{project.name}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            <button
                              onClick={e => { e.stopPropagation(); onEditProject(project); }}
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                              title="Settings"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            {onArchiveProject && (
                              <button
                                onClick={e => { e.stopPropagation(); onArchiveProject(project.id, !project.isArchived); }}
                                className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                title={project.isArchived ? 'Unarchive' : 'Archive'}
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setProjectToDelete(project); }}
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {project.description && (
                          <p className="text-xs text-muted-foreground/60 line-clamp-2 -mt-1">{project.description}</p>
                        )}

                        <div className="space-y-2">
                          <div className="w-full bg-muted/30 h-1 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full"
                              style={{ background: accent }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{completed} / {total} tasks</span>
                            <span className="font-semibold" style={{ color: accent }}>{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Add new pod card */}
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                <button
                  onClick={onNewProject}
                  className="w-full h-full min-h-[140px] border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-border/60 hover:bg-muted/10 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-medium">New pod</span>
                </button>
              </motion.div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Delete Project Dialog ────────────────────────────────────────────── */}

      {/* ── Delete Project Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!projectToDelete} onOpenChange={open => { if (!open) { setProjectToDelete(null); setDeleteConfirmName(''); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-red-500 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Delete Pod
            </DialogTitle>
            <DialogDescription className="pt-1">
              This will permanently delete <strong>{projectToDelete?.name}</strong> and all its tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-foreground">Type <span className="font-bold">{projectToDelete?.name}</span> to confirm:</p>
            <Input value={deleteConfirmName} onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder="Pod name"
              className="bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-red-500" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteConfirmName.trim() !== projectToDelete?.name}
              onClick={() => { if (projectToDelete) { onDeleteProject(projectToDelete.id); setProjectToDelete(null); setDeleteConfirmName(''); } }}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
