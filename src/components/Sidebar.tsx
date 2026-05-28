import React from 'react';
import {
  Layout, LogOut, ChevronRight, Plus, MoreVertical, Edit2,
  ChevronDown, ChevronLeft, BarChart3, UserCircle, Sun, Moon,
  Sparkles, PanelLeft,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Project, Company, Pod } from '../types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
// DropdownMenu kept for user profile dropdown below
import { Logo } from './Logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  company: Company | null;
  pods: Pod[];
  projects: Project[];
  activeProject: Project | null;
  activePod: Pod | null;
  activeView?: 'board' | 'analytics' | 'timeline';
  onProjectSelect: (project: Project) => void;
  onNewProject: (pod?: Pod) => void;
  onEditProject: (project: Project) => void;
  onNewPod: () => void;
  onEditPod: (pod: Pod) => void;
  onLogout: () => void;
  onAnalyticsSelect?: () => void;
  onDashboardSelect?: () => void;
  onEditProfile?: () => void;
  onCompanySettings?: () => void;
  user: any;
  onClose?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export function Sidebar({
  company, pods, projects, activeProject, activeView = 'board',
  onProjectSelect, onNewProject, onEditProject, onNewPod, onEditPod,
  onLogout, onAnalyticsSelect, onDashboardSelect, onEditProfile,
  onCompanySettings, user, onClose, className, isCollapsed = false,
  onToggleCollapse, theme, onToggleTheme,
}: SidebarProps) {

  const isDashboard = !activeProject && activeView === 'board';
  const isAnalytics = activeView === 'analytics';

  // Flat list of all workspaces for the sidebar
  const allProjects = projects;

  return (
    <TooltipProvider>
      <div className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-[68px] p-2" : "w-[260px] p-3",
        className
      )}>

        {/* ── Logo row ────────────────────────────────────────────────────── */}
        <div className={cn("flex items-center shrink-0 mb-3", isCollapsed ? "justify-center px-0" : "justify-between px-1")}>
          {isCollapsed ? (
            <button onClick={onToggleCollapse} title="Expand sidebar" className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <Logo variant="icon" className="w-8 h-8" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Logo variant="wordmark" className="h-6 max-w-[110px] shrink-0" />
                <span className="text-[10px] font-semibold text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded-md">v2.4</span>
              </div>
              <div className="flex items-center gap-0.5">
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors hidden lg:flex"
                    title="Collapse sidebar"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
                {onClose && (
                  <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors lg:hidden">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Company card ─────────────────────────────────────────────────── */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger render={
              <button onClick={onCompanySettings} className="w-full flex justify-center p-1.5 mb-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {(company?.name ?? 'H').charAt(0).toUpperCase()}
                </div>
              </button>
            } />
            <TooltipContent side="right" sideOffset={10}>{company?.name ?? 'Company'}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onCompanySettings}
            className="w-full flex items-center gap-3 p-3 mb-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {(company?.name ?? 'H').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{company?.name ?? 'HenceFlow'}</p>
              <p className="text-[11px] text-muted-foreground/60 truncate leading-tight">
                {[company?.industry, company?.location].filter(Boolean).join(' · ') || 'No details'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
          </button>
        )}

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <div className={cn("space-y-0.5 mb-3", isCollapsed ? "px-0" : "px-1")}>
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" className={cn("w-full justify-center px-0 h-9 relative rounded-xl", isDashboard ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onDashboardSelect}>
                    <Layout className="w-4 h-4" />
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" className={cn("w-full justify-center px-0 h-9 relative rounded-xl", isAnalytics ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onAnalyticsSelect}>
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Analytics</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                onClick={onDashboardSelect}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm font-semibold transition-all",
                  isDashboard ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Layout className="w-4 h-4 shrink-0" />
                Dashboard
              </button>
              <button
                onClick={onAnalyticsSelect}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm font-semibold transition-all",
                  isAnalytics ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                Analytics
              </button>
            </>
          )}
        </div>

        {/* ── Pods list ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 min-h-0">
          {!isCollapsed && (
            <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Pods
            </p>
          )}

          {allProjects.map(project => {
            const accent = project.color || 'oklch(0.67 0.30 285)';
            const isActive = activeProject?.id === project.id;
            return isCollapsed ? (
              <Tooltip key={project.id}>
                <TooltipTrigger render={
                  <div
                    onClick={() => onProjectSelect(project)}
                    className={cn("w-full flex items-center justify-center rounded-xl cursor-pointer transition-all p-2 h-9 relative", isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                  </div>
                } />
                <TooltipContent side="right" sideOffset={10}>{project.name}</TooltipContent>
              </Tooltip>
            ) : (
              <div
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className={cn(
                  "group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all",
                  isActive ? "bg-muted/50 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-xs font-medium flex-1 truncate">{project.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); onEditProject(project); }}
                  className="h-5 w-5 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* New pod button */}
          {!isCollapsed && (
            <button
              onClick={onNewPod}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-all cursor-pointer text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              New pod
            </button>
          )}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="sm" className="w-full justify-center px-0 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={onNewPod}>
                  <Plus className="w-4 h-4" />
                </Button>
              } />
              <TooltipContent side="right" sideOffset={10}>New pod</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ── Upgrade to Pro card ──────────────────────────────────────────── */}
        {!isCollapsed && (
          <div className="mt-3 mx-1 p-3.5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 space-y-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">Upgrade to Pro</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Unlimited pods, advanced analytics &amp; AI assist.
            </p>
            <button className="w-full text-xs font-semibold text-foreground bg-card/80 hover:bg-card border border-border/40 rounded-xl py-1.5 transition-colors">
              See plans
            </button>
          </div>
        )}

        {/* ── User profile ─────────────────────────────────────────────────── */}
        <div className="shrink-0 mt-3 border-t border-sidebar-border pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full bg-transparent border-none p-0 outline-none">
              <div className={cn("flex items-center rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group", isCollapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-2")}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger render={<UserAvatar photoURL={user?.photoURL} displayName={user?.displayName} className="w-8 h-8 text-sm shadow-sm shrink-0" />} />
                    <TooltipContent side="right" sideOffset={10}>{user?.displayName}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <UserAvatar photoURL={user?.photoURL} displayName={user?.displayName} className="w-8 h-8 text-sm shadow-sm shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">{user?.displayName || 'You'}</p>
                      <p className="text-[11px] text-muted-foreground/60 truncate leading-tight">{user?.email}</p>
                    </div>
                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                  </>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "start" : "end"} side={isCollapsed ? "right" : "top"} className="w-56 p-2 rounded-xl shadow-2xl border-border bg-popover">
              {onEditProfile && (
                <>
                  <DropdownMenuItem className="rounded-lg h-10 cursor-pointer" onClick={onEditProfile}>
                    <UserCircle className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onToggleTheme && (
                <>
                  <DropdownMenuItem className="rounded-lg h-10 cursor-pointer" onClick={onToggleTheme}>
                    {theme === 'light' ? <Moon className="w-4 h-4 mr-3 text-muted-foreground" /> : <Sun className="w-4 h-4 mr-3 text-muted-foreground" />}
                    <span className="font-medium text-foreground">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="rounded-lg h-10 cursor-pointer text-red-400 focus:text-red-500 focus:bg-red-500/10" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-3" />
                <span className="font-medium">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
