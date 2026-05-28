import React from 'react';
import { Project, Pod, Task, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './UserAvatar';
import { Plus, Layers, Users, CheckSquare, Settings, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ProjectOverviewProps {
  project: Project;
  pods: Pod[];
  allTasks: Task[];
  users: UserProfile[];
  currentUserId: string;
  onPodSelect: (pod: Pod) => void;
  onNewPod: () => void;
  onEditProject: () => void;
  onEditPod: (pod: Pod) => void;
}

export function ProjectOverview({
  project, pods, allTasks, users,
  onPodSelect, onNewPod, onEditProject, onEditPod,
}: ProjectOverviewProps) {
  const manager = users.find(u => u.uid === project.managerId);
  const members = users.filter(u => project.members.includes(u.uid));

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">

      {/* ── Project header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5 max-w-lg">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {manager && (
                <span className="flex items-center gap-1.5">
                  <UserAvatar photoURL={manager.photoURL} displayName={manager.displayName} className="w-4 h-4 text-[8px]" />
                  <span className="font-medium text-foreground/80">{manager.displayName || manager.email}</span>
                  <span className="text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded-md text-[10px]">Manager</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground/70">
                <Users className="w-3.5 h-3.5" />
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground/70">
                <Layers className="w-3.5 h-3.5" />
                {pods.length} pod{pods.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-9 rounded-xl shrink-0" onClick={onEditProject}>
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>

      {/* ── Members strip ───────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider shrink-0">Members</span>
          <div className="flex items-center flex-wrap gap-2">
            {members.map(u => (
              <div key={u.uid} className="flex items-center gap-1.5">
                <UserAvatar photoURL={u.photoURL} displayName={u.displayName} className="w-7 h-7 text-[10px] ring-2 ring-card shadow-sm" />
                <span className="text-xs text-foreground/80 hidden sm:inline">{u.displayName || u.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pods section ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">Pods</h2>
          <Button size="sm" onClick={onNewPod} className="gap-1.5 h-8 rounded-xl text-xs">
            <Plus className="w-3.5 h-3.5" />
            New Pod
          </Button>
        </div>

        {pods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No pods yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Create pods to organize your team's work into focused areas.
            </p>
            <Button onClick={onNewPod} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Create first pod
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pods.map((pod, i) => {
              const podTasks = allTasks.filter(t => t.podId === pod.id);
              const lastStage = pod.stages[pod.stages.length - 1];
              const completedTasks = podTasks.filter(t => t.status === lastStage?.id);
              const pct = podTasks.length > 0
                ? Math.round((completedTasks.length / podTasks.length) * 100)
                : 0;
              const podMembers = users.filter(u => pod.members.includes(u.uid));

              return (
                <motion.div
                  key={pod.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onPodSelect(pod)}
                  className="group relative p-5 rounded-2xl bg-card/80 border border-border/40 hover:border-border hover:bg-card cursor-pointer transition-all hover:shadow-lg"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                        style={{ backgroundColor: pod.color }}
                      >
                        {pod.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{pod.name}</h3>
                        {pod.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{pod.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onEditPod(pod); }}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0 ml-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {completedTasks.length} / {podTasks.length} tasks
                      </span>
                      <span className="font-semibold" style={{ color: pod.color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: pod.color }}
                      />
                    </div>
                  </div>

                  {/* Footer: members + stages */}
                  <div className="flex items-center justify-between">
                    {podMembers.length > 0 ? (
                      <div className="flex items-center -space-x-1.5">
                        {podMembers.slice(0, 5).map(u => (
                          <UserAvatar key={u.uid} photoURL={u.photoURL} displayName={u.displayName}
                            className="w-6 h-6 text-[9px] ring-2 ring-card" />
                        ))}
                        {podMembers.length > 5 && (
                          <div className="w-6 h-6 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                            +{podMembers.length - 5}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">No members</span>
                    )}
                    <span className={cn(
                      "text-[10px] flex items-center gap-1 text-muted-foreground/50"
                    )}>
                      <Layers className="w-3 h-3" />
                      {pod.stages.length} stages
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
