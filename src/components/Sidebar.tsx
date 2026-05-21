import { Layout, LogOut, ChevronRight, Hash, Plus, MoreVertical, Edit2, Trash2, Building, ChevronDown, ChevronLeft, BarChart3, UserCircle } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Project, Company } from '../types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Logo } from './Logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  companies: Company[];
  projects: Project[];
  activeProject: Project | null;
  activeCompany?: Company | null;
  activeView?: 'board' | 'analytics';
  onProjectSelect: (project: Project | null) => void;
  onNewProject: (project?: Project) => void;
  onLogout: () => void;
  onCompanySettings?: () => void;
  onCompanySelect: (company: Company) => void;
  onNewCompany: () => void;
  onAnalyticsSelect?: () => void;
  onEditProfile?: () => void;
  user: any;
  onClose?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  companies,
  projects,
  activeProject,
  activeCompany,
  activeView = 'board',
  onProjectSelect,
  onNewProject,
  onLogout,
  onCompanySettings,
  onCompanySelect,
  onNewCompany,
  onAnalyticsSelect,
  onEditProfile,
  user,
  onClose,
  className,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  return (
    <TooltipProvider>
    <div className={cn(
      "h-full bg-sidebar border-r border-sidebar-border flex flex-col p-3 space-y-5 transition-all duration-300 relative",
      isCollapsed ? "w-[68px]" : "w-64",
      className
    )}>
      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 bg-sidebar border border-sidebar-border rounded-full h-6 w-6 z-10 hidden lg:flex shadow-md hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>
      )}

      {/* Company header */}
      <div className={cn("flex items-center px-1", isCollapsed ? "justify-center" : "justify-between")}>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-1 bg-transparent border-none p-0 m-0 text-left outline-none min-w-0">
            <div className={cn(
              "flex items-center text-foreground hover:bg-primary/8 rounded-xl transition-colors group",
              isCollapsed ? "p-1.5 justify-center" : "p-2 gap-2"
            )}>
              {isCollapsed ? (
                <Logo variant="icon" className="w-9 h-9 shadow-sm" />
              ) : (
                <>
                  <Logo variant="wordmark" className="h-7 max-w-[120px] object-left shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <span className="font-semibold text-[10px] text-muted-foreground leading-tight truncate">
                      {activeCompany ? activeCompany.name : 'Select Company'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 shrink-0" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground shrink-0 ml-1 h-8 w-8">
              <MoreVertical className="w-4 h-4 rotate-90" />
            </Button>
          )}
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl shadow-2xl border-border bg-popover">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                Companies
              </DropdownMenuLabel>
              {companies.map(c => (
                <DropdownMenuItem
                  key={c.id}
                  className="rounded-lg h-9 cursor-pointer gap-2.5"
                  onClick={() => onCompanySelect(c)}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                    c.id === activeCompany?.id
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn("font-medium text-sm", c.id === activeCompany?.id ? "text-foreground" : "text-muted-foreground")}>
                    {c.name}
                  </span>
                  {c.id === activeCompany?.id && (
                    <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="rounded-lg h-10 cursor-pointer gap-2.5"
              onClick={() => onNewCompany()}
            >
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3 text-primary" />
              </div>
              <span className="font-medium text-foreground text-sm">Create Company</span>
            </DropdownMenuItem>
            {activeCompany && activeCompany.adminIds?.includes(user?.uid) && onCompanySettings && (
              <DropdownMenuItem
                className="rounded-lg h-10 cursor-pointer gap-2.5"
                onClick={onCompanySettings}
              >
                <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Building className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="font-medium text-foreground text-sm">Company Settings</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav links */}
      <div className="flex-1 space-y-1 overflow-hidden">
        <div className={cn("space-y-0.5 mb-3", isCollapsed ? "px-0" : "px-1")}>
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger render={
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full font-medium transition-all justify-center px-0 relative h-9",
                      !activeProject && activeView === 'board'
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => onProjectSelect(null)}
                  >
                    <Layout className="w-4 h-4 shrink-0 m-0" />
                    {!activeProject && activeView === 'board' && (
                      <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                    )}
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full font-medium transition-all justify-center px-0 relative h-9",
                      activeView === 'analytics'
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={onAnalyticsSelect}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0 m-0" />
                    {activeView === 'analytics' && (
                      <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                    )}
                  </Button>
                } />
                <TooltipContent side="right" sideOffset={10}>Analytics</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className={cn(
                  "w-full font-semibold transition-all justify-start px-3 h-9 relative overflow-hidden rounded-xl",
                  !activeProject && activeView === 'board'
                    ? "text-primary bg-gradient-to-r from-primary/20 to-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => onProjectSelect(null)}
              >
                {!activeProject && activeView === 'board' && (
                  <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                )}
                <Layout className="w-4 h-4 shrink-0 mr-2.5" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full font-semibold transition-all justify-start px-3 h-9 relative overflow-hidden rounded-xl",
                  activeView === 'analytics'
                    ? "text-primary bg-gradient-to-r from-primary/20 to-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={onAnalyticsSelect}
              >
                {activeView === 'analytics' && (
                  <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                )}
                <BarChart3 className="w-4 h-4 shrink-0 mr-2.5" />
                <span>Analytics</span>
              </Button>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            Workspaces
          </div>
        )}
        <div className="space-y-0.5">
          {projects.map((project) => (
            <div key={project.id} className="group relative">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger render={
                    <div
                      onClick={() => onProjectSelect(project)}
                      className={cn(
                        "w-full flex items-center justify-center rounded-xl cursor-pointer transition-all p-2 h-9 relative",
                        activeProject?.id === project.id
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Hash className="w-4 h-4 shrink-0" />
                      {activeProject?.id === project.id && (
                        <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                      )}
                    </div>
                  } />
                  <TooltipContent side="right" sideOffset={10}>{project.name}</TooltipContent>
                </Tooltip>
              ) : (
                <div
                  onClick={() => onProjectSelect(project)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm rounded-xl cursor-pointer transition-all relative overflow-hidden",
                    activeProject?.id === project.id
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {activeProject?.id === project.id && (
                    <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <Hash className="w-3.5 h-3.5 mr-2.5 opacity-60 shrink-0" />
                  <span className="truncate flex-1 text-left">{project.name}</span>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-7 w-7 ml-1 transition-opacity shrink-0",
                        "lg:opacity-0 lg:group-hover:opacity-100 hover:bg-muted font-normal",
                        activeProject?.id === project.id ? "lg:opacity-100 opacity-100" : "opacity-100 lg:opacity-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-2xl border-border bg-popover">
                      <DropdownMenuItem
                        className="rounded-lg h-10 cursor-pointer"
                        onClick={() => onNewProject(project)}
                      >
                        <Edit2 className="w-4 h-4 mr-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">Workspace Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg h-10 cursor-pointer text-red-400 focus:text-red-500 focus:bg-red-500/10"
                        onClick={() => onNewProject(project)}
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        <span className="font-medium">Delete Workspace</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}

          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full transition-all text-muted-foreground hover:text-primary hover:bg-primary/10 justify-center px-0 h-9 rounded-xl"
                  onClick={() => onNewProject()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              } />
              <TooltipContent side="right" sideOffset={10}>Add Workspace</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full transition-all text-muted-foreground hover:text-primary hover:bg-primary/10 justify-start px-3 py-2 h-9 rounded-xl"
              onClick={() => onNewProject()}
            >
              <Plus className="w-4 h-4 mr-2.5" />
              <span className="text-sm">Add Workspace</span>
            </Button>
          )}
        </div>
      </div>

      {/* User profile */}
      <div className="pt-2 mt-auto border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full bg-transparent border-none p-0 outline-none">
            <div className={cn(
              "flex items-center rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group",
              isCollapsed ? "p-1.5 justify-center" : "gap-2.5 px-2 py-2"
            )}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger render={
                    <UserAvatar
                      photoURL={user?.photoURL}
                      displayName={user?.displayName}
                      className="w-8 h-8 text-sm shadow-sm shrink-0"
                    />
                  } />
                  <TooltipContent side="right" sideOffset={10}>{user?.displayName}</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <UserAvatar
                    photoURL={user?.photoURL}
                    displayName={user?.displayName}
                    className="w-8 h-8 text-sm shadow-sm shrink-0"
                  />
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
                <DropdownMenuItem
                  className="rounded-lg h-10 cursor-pointer"
                  onClick={onEditProfile}
                >
                  <UserCircle className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">Edit Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="rounded-lg h-10 cursor-pointer text-red-400 focus:text-red-500 focus:bg-red-500/10"
              onClick={onLogout}
            >
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
