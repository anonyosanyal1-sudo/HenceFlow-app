import React from 'react';
import { Layout, LogOut, ChevronRight, Hash, Plus, MoreVertical, Edit2, ChevronDown, ChevronLeft, BarChart3, UserCircle, Sun, Moon, Boxes } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Project, Company, Pod } from '../types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  onNewProject: (pod: Pod) => void;
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
  company,
  pods,
  projects,
  activeProject,
  activePod,
  activeView = 'board',
  onProjectSelect,
  onNewProject,
  onEditProject,
  onNewPod,
  onEditPod,
  onLogout,
  onAnalyticsSelect,
  onDashboardSelect,
  onEditProfile,
  onCompanySettings,
  user,
  onClose,
  className,
  isCollapsed = false,
  onToggleCollapse,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const [expandedPods, setExpandedPods] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    pods.forEach(p => s.add(p.id));
    return s;
  });

  React.useEffect(() => {
    setExpandedPods(prev => {
      const next = new Set(prev);
      pods.forEach(p => { if (!next.has(p.id)) next.add(p.id); });
      return next;
    });
  }, [pods]);

  const togglePod = (podId: string) => {
    setExpandedPods(prev => {
      const next = new Set(prev);
      if (next.has(podId)) next.delete(podId);
      else next.add(podId);
      return next;
    });
  };

  const isDashboard = !activeProject && activeView === 'board';
  const isAnalytics = activeView === 'analytics';

  return (
    <TooltipProvider>
      <div className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col p-3 space-y-4 transition-all duration-300 relative",
        isCollapsed ? "w-[68px]" : "w-64",
        className
      )}>
        {/* Company header */}
        <div className={cn("flex items-center px-1", isCollapsed ? "justify-center" : "justify-between")}>
          <div className={cn(
            "flex items-center rounded-xl transition-colors",
            isCollapsed ? "p-1.5 justify-center" : "p-2 gap-2 flex-1 min-w-0"
          )}>
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Expand sidebar"
              >
                <Logo variant="icon" className="w-9 h-9 shadow-sm" />
              </button>
            ) : (
              <>
                <Logo variant="wordmark" className="h-7 max-w-[120px] object-left shrink-0" />
                <div className="flex flex-col flex-1 min-w-0 justify-center">
                  <span className="font-semibold text-[10px] text-muted-foreground leading-tight truncate">
                    {company ? company.name : 'HenceFlow'}
                  </span>
                </div>
                {onCompanySettings && (
                  <button
                    onClick={onCompanySettings}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 ml-1"
                    title="Company settings"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
          {/* Collapse toggle — desktop only */}
          {onToggleCollapse && !isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-lg shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground shrink-0 ml-1 h-8 w-8">
              <MoreVertical className="w-4 h-4 rotate-90" />
            </Button>
          )}
        </div>

        {/* Nav links */}
        <div className={cn("space-y-0.5", isCollapsed ? "px-0" : "px-1")}>
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" className={cn("w-full justify-center px-0 h-9 relative", isDashboard ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onDashboardSelect}>
                    <Layout className="w-4 h-4" />
                    {isDashboard && <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />}
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" className={cn("w-full justify-center px-0 h-9 relative", isAnalytics ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onAnalyticsSelect}>
                    <BarChart3 className="w-4 h-4" />
                    {isAnalytics && <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />}
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Analytics</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button variant="ghost" className={cn("w-full font-semibold justify-start px-3 h-9 relative overflow-hidden rounded-xl", isDashboard ? "text-primary bg-gradient-to-r from-primary/20 to-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onDashboardSelect}>
                {isDashboard && <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />}
                <Layout className="w-4 h-4 shrink-0 mr-2.5" />
                Dashboard
              </Button>
              <Button variant="ghost" className={cn("w-full font-semibold justify-start px-3 h-9 relative overflow-hidden rounded-xl", isAnalytics ? "text-primary bg-gradient-to-r from-primary/20 to-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={onAnalyticsSelect}>
                {isAnalytics && <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />}
                <BarChart3 className="w-4 h-4 shrink-0 mr-2.5" />
                Analytics
              </Button>
            </>
          )}
        </div>

        {/* Pods + Workspaces */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 -mx-1 px-1">
          {!isCollapsed && (
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Pods
            </div>
          )}

          {pods.map(pod => {
            const podProjects = projects.filter(p => p.podId === pod.id);
            const isExpanded = expandedPods.has(pod.id);
            const hasActiveProjInPod = podProjects.some(p => p.id === activeProject?.id);

            return (
              <div key={pod.id} className="space-y-0.5">
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger render={
                      <div
                        className={cn("w-full flex items-center justify-center rounded-xl cursor-pointer transition-all p-2 h-9 relative", hasActiveProjInPod ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                        onClick={() => togglePod(pod.id)}
                      >
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: pod.color }}>
                          {pod.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    } />
                    <TooltipContent side="right" sideOffset={10}>{pod.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="group flex items-center gap-1">
                    <button
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/40 transition-colors text-left min-w-0"
                      onClick={() => togglePod(pod.id)}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: pod.color }}>
                        {pod.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate flex-1">{pod.name}</span>
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 lg:opacity-0 lg:group-hover:opacity-100 shrink-0")}
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 p-2 rounded-xl shadow-2xl border-border bg-popover">
                        <DropdownMenuItem className="rounded-lg h-9 cursor-pointer" onClick={() => onEditPod(pod)}>
                          <Edit2 className="w-3.5 h-3.5 mr-2.5 text-muted-foreground" />
                          <span className="font-medium text-sm">Edit Pod</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg h-9 cursor-pointer" onClick={() => onNewProject(pod)}>
                          <Plus className="w-3.5 h-3.5 mr-2.5 text-muted-foreground" />
                          <span className="font-medium text-sm">Add Workspace</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Workspaces under pod */}
                {isExpanded && (
                  <div className={cn("space-y-0.5", !isCollapsed && "ml-3 pl-2 border-l border-border/40")}>
                    {podProjects.map(project => (
                      <div key={project.id} className="group relative">
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger render={
                              <div
                                onClick={() => onProjectSelect(project)}
                                className={cn("w-full flex items-center justify-center rounded-xl cursor-pointer transition-all p-2 h-8 relative", activeProject?.id === project.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                              >
                                <Hash className="w-3.5 h-3.5" />
                                {activeProject?.id === project.id && <span className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-primary" />}
                              </div>
                            } />
                            <TooltipContent side="right" sideOffset={10}>{project.name}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <div
                            onClick={() => onProjectSelect(project)}
                            className={cn("w-full flex items-center px-2 py-1.5 text-sm rounded-xl cursor-pointer transition-all relative overflow-hidden", activeProject?.id === project.id ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                          >
                            {activeProject?.id === project.id && <span className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-primary" />}
                            <Hash className="w-3 h-3 mr-2 opacity-60 shrink-0" />
                            <span className="truncate flex-1 text-left text-xs">{project.name}</span>
                            <button
                              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-5 w-5 ml-1 lg:opacity-0 lg:group-hover:opacity-100 shrink-0")}
                              onClick={e => { e.stopPropagation(); onEditProject(project); }}
                            >
                              <MoreVertical className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {!isCollapsed && (
                      <button
                        className="w-full flex items-center px-2 py-1 text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        onClick={() => onNewProject(pod)}
                      >
                        <Plus className="w-3 h-3 mr-1.5" />
                        Add workspace
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Pod button */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="sm" className="w-full justify-center px-0 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={onNewPod}>
                  <Boxes className="w-4 h-4" />
                </Button>
              } />
              <TooltipContent side="right" sideOffset={10}>Add Pod</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start px-3 py-2 h-9 rounded-xl text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all" onClick={onNewPod}>
              <Plus className="w-4 h-4 mr-2.5" />
              <span className="text-sm">Add Pod</span>
            </Button>
          )}
        </div>

        {/* User profile */}
        <div className="pt-2 mt-auto border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full bg-transparent border-none p-0 outline-none">
              <div className={cn("flex items-center rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group", isCollapsed ? "p-1.5 justify-center" : "gap-2.5 px-2 py-2")}>
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
                      <p className="text-[11px] text-muted-foreground truncate leading-tight">{user?.email}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
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
                    {theme === 'light'
                      ? <Moon className="w-4 h-4 mr-3 text-muted-foreground" />
                      : <Sun className="w-4 h-4 mr-3 text-muted-foreground" />}
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
