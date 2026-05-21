import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Task, Project, UserProfile, DEFAULT_STAGES } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
  projects: Project[];
  users: UserProfile[];
  currentUserId: string;
}

const CHART_COLORS = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#06b6d4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function StatCard({ label, value, sub, icon, color, glow }: { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string; glow?: string }) {
  return (
    <Card className="bg-card border-border/50 relative overflow-hidden group hover:border-border transition-colors">
      {glow && (
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/2" style={{ background: glow }} />
      )}
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm", color)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltipStyle = {
  backgroundColor: 'oklch(0.13 0.020 270)',
  border: '1px solid oklch(0.22 0.025 270)',
  borderRadius: '8px',
  color: 'oklch(0.95 0.01 270)',
  fontSize: '12px',
};

// Returns the last stage ID for a project (the "done" stage).
function getClosedStageId(project?: Project) {
  const stages = project?.stages;
  if (stages && stages.length > 0) return stages[stages.length - 1].id;
  return DEFAULT_STAGES[DEFAULT_STAGES.length - 1].id;
}

// Build a map of stageId → label from all projects' stages.
function buildStageLabelMap(projects: Project[]): Map<string, string> {
  const map = new Map<string, string>();
  const allStages = projects.flatMap(p => p.stages || DEFAULT_STAGES);
  // Use DEFAULT_STAGES as fallback baseline
  DEFAULT_STAGES.forEach(s => map.set(s.id, s.label));
  allStages.forEach(s => map.set(s.id, s.label));
  return map;
}

export function AnalyticsDashboard({ tasks, projects, users, currentUserId }: AnalyticsDashboardProps) {
  const stageLabelMap = buildStageLabelMap(projects);

  // Build per-project closed stage lookup
  const projectClosedStage = new Map(projects.map(p => [p.id, getClosedStageId(p)]));

  const isTaskClosed = (t: Task) => t.status === (projectClosedStage.get(t.projectId) ?? 'closed');

  const totalTasks = tasks.length;
  const closedTasks = tasks.filter(isTaskClosed).length;
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) && !isTaskClosed(t);
  }).length;
  const myTasks = tasks.filter(t => t.assigneeId === currentUserId || t.creatorId === currentUserId).length;

  // Tasks by status — use stage labels instead of raw IDs
  const statusCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    const label = stageLabelMap.get(t.status) || t.status.replace(/-/g, ' ');
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Tasks by priority
  const priorityCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  const priorityData = ['urgent', 'high', 'medium', 'low']
    .filter(p => priorityCounts[p])
    .map(p => ({ name: p, value: priorityCounts[p] }));

  // Tasks per project
  const projectTaskData = projects
    .map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      tasks: tasks.filter(t => t.projectId === p.id).length,
      closed: tasks.filter(t => t.projectId === p.id && isTaskClosed(t)).length,
    }))
    .filter(p => p.tasks > 0)
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 8);

  // Tasks by assignee
  const assigneeCounts = tasks.reduce<Record<string, number>>((acc, t) => {
    const id = t.assigneeId || t.creatorId;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const assigneeData = Object.entries(assigneeCounts)
    .map(([uid, count]) => {
      const u = users.find(u => u.uid === uid);
      return { name: u?.displayName || 'Unknown', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const completionRate = totalTasks > 0 ? Math.round((closedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of tasks across all workspaces</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          icon={<TrendingUp className="w-5 h-5 text-violet-300" />}
          color="bg-violet-500/20 border border-violet-500/20"
          glow="oklch(0.67 0.30 285)"
        />
        <StatCard
          label="Completed"
          value={closedTasks}
          sub={`${completionRate}% completion rate`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-300" />}
          color="bg-emerald-500/20 border border-emerald-500/20"
          glow="oklch(0.74 0.21 160)"
        />
        <StatCard
          label="Overdue"
          value={overdueTasks}
          icon={<AlertTriangle className="w-5 h-5 text-amber-300" />}
          color="bg-amber-500/20 border border-amber-500/20"
          glow="oklch(0.78 0.20 55)"
        />
        <StatCard
          label="My Tasks"
          value={myTasks}
          icon={<Clock className="w-5 h-5 text-sky-300" />}
          color="bg-sky-500/20 border border-sky-500/20"
          glow="oklch(0.73 0.21 210)"
        />
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">No data yet</p>
            <p className="text-muted-foreground text-sm max-w-xs">
              Create some tasks across your workspaces and come back to see analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Status */}
          {statusData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.025 270)" />
                    <XAxis dataKey="name" tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tasks by Priority */}
          {priorityData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Tasks by Priority</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {priorityData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PRIORITY_COLORS[entry.name] || '#6b7280' }}
                      />
                      <span className="capitalize text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks per Project */}
          {projectTaskData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Tasks per Workspace</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectTaskData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.025 270)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'oklch(0.55 0.025 270)' }} />
                    <Bar dataKey="tasks" name="Total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tasks by Assignee */}
          {assigneeData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Tasks by Assignee</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={assigneeData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.025 270)" />
                    <XAxis dataKey="name" tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'oklch(0.55 0.025 270)', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                      {assigneeData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
