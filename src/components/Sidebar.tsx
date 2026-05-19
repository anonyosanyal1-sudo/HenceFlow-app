import { Layout, CheckSquare, Settings, LogOut, ChevronRight, Hash, Plus, MoreVertical, Edit2, Trash2, Building, ChevronDown, ChevronLeft } from 'lucide-react';
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
  onProjectSelect: (project: Project | null) => void;
  onNewProject: (project?: Project) => void;
  onLogout: () => void;
  onCompanySettings?: () => void;
  onCompanySelect: (company: Company) => void;
  onNewCompany: () => void;
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
  onProjectSelect, 
  onNewProject, 
  onLogout, 
  onCompanySettings, 
  onCompanySelect, 
  onNewCompany, 
  user, 
  onClose, 
  className,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  return (
    <TooltipProvider>
    <div className={cn(
      "h-full bg-sidebar border-r border-border flex flex-col p-4 space-y-6 transition-all duration-300 relative", 
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 bg-sidebar border border-border rounded-full h-6 w-6 z-10 hidden lg:flex shadow-sm hover:bg-accent"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>
      )}

      <div className={cn("flex items-center px-1 mb-2", isCollapsed ? "justify-center" : "justify-between")}>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-1 bg-transparent border-none p-0 m-0 text-left outline-none min-w-0">
            <div className={cn(
              "flex items-center text-foreground hover:bg-accent/50 rounded-lg transition-colors group",
              isCollapsed ? "p-1 justify-center" : "p-2"
            )}>
              <Logo className={cn("rounded-lg shadow-sm shrink-0", isCollapsed ? "w-10 h-10" : "w-8 h-8 mr-3")} />
              {!isCollapsed && (
                <>
                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <span className="font-bold text-[15px] tracking-tight leading-tight truncate">
                      HenceFlow
                    </span>
                    <span className="font-medium text-[11px] text-muted-foreground leading-tight truncate">
                      {activeCompany ? activeCompany.name : 'Select Company'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 shrink-0 ml-2" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground shrink-0 ml-1 h-8 w-8">
              <MoreVertical className="w-4 h-4 rotate-90" />
            </Button>
          )}
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl shadow-xl border-border bg-popover">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Companies
              </DropdownMenuLabel>
              {companies.map(c => (
                <DropdownMenuItem 
                  key={c.id}
                  className="rounded-lg h-9 cursor-pointer"
                  onClick={() => onCompanySelect(c)}
                >
                  <div className={cn(
                    "w-4 h-4 mr-3 rounded shadow-sm border border-border flex items-center justify-center",
                    c.id === activeCompany?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                     {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn("font-medium", c.id === activeCompany?.id ? "text-foreground" : "text-muted-foreground")}>
                    {c.name}
                  </span>
                  {c.id === activeCompany?.id && <span className="ml-auto text-primary text-xs">Active</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="rounded-lg h-10 cursor-pointer"
              onClick={() => onNewCompany()}
            >
              <Plus className="w-4 h-4 mr-3 text-muted-foreground" />
              <span className="font-medium text-foreground">Create Company</span>
            </DropdownMenuItem>
            {activeCompany && activeCompany.adminIds?.includes(user?.uid) && onCompanySettings && (
              <DropdownMenuItem 
                className="rounded-lg h-10 cursor-pointer"
                onClick={onCompanySettings}
              >
                <Building className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="font-medium text-foreground">Company Settings</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        <div className={cn("space-y-1 mb-4", isCollapsed ? "px-0" : "px-2")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full font-medium transition-all justify-center px-0",
                    !activeProject ? "bg-card shadow-sm text-primary border border-border" : "text-muted-foreground"
                  )}
                  onClick={() => onProjectSelect(null)}
                >
                  <Layout className="w-4 h-4 shrink-0 transition-all m-0" />
                </Button>
              } />
              <TooltipContent side="right" sideOffset={10}>Dashboard</TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="ghost" 
              className={cn(
                "w-full font-medium transition-all justify-start px-4",
                !activeProject ? "bg-card shadow-sm text-primary border border-border" : "text-muted-foreground"
              )}
              onClick={() => onProjectSelect(null)}
            >
              <Layout className="w-4 h-4 shrink-0 transition-all mr-3" />
              <span>Dashboard</span>
            </Button>
          )}
        </div>

        {!isCollapsed && (
          <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspaces
          </div>
        )}
        <div className="space-y-1">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="group relative"
            >
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger render={
                    <div
                      onClick={() => onProjectSelect(project)}
                      className={cn(
                        "w-full flex items-center justify-center rounded-md cursor-pointer transition-all p-2",
                        activeProject?.id === project.id 
                          ? "bg-card shadow-sm text-primary font-medium border border-border" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Hash className="w-4 h-4 opacity-50 shrink-0 m-0" />
                    </div>
                  } />
                  <TooltipContent side="right" sideOffset={10}>{project.name}</TooltipContent>
                </Tooltip>
              ) : (
                <div
                  onClick={() => onProjectSelect(project)}
                  className={cn(
                    "w-full flex items-center px-2 py-2 text-sm rounded-md cursor-pointer transition-all",
                    activeProject?.id === project.id 
                      ? "bg-card shadow-sm text-primary font-medium border border-border" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Hash className="w-4 h-4 mr-3 opacity-50 shrink-0" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-8 w-8 ml-1 transition-opacity",
                        "lg:opacity-0 lg:group-hover:opacity-100 group-hover:bg-muted font-normal",
                        activeProject?.id === project.id ? "lg:opacity-100 opacity-100" : "opacity-100 lg:opacity-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl border-border bg-popover">
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
                  className="w-full transition-all text-muted-foreground hover:text-primary hover:bg-primary/10 justify-center px-0 h-10"
                  onClick={() => onNewProject()}
                >
                  <Plus className="w-4 h-4 m-0" />
                </Button>
              } />
              <TooltipContent side="right" sideOffset={10}>Add Workspace</TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full transition-all text-muted-foreground hover:text-primary hover:bg-primary/10 justify-start px-2 py-2"
              onClick={() => onNewProject()}
            >
              <Plus className="w-4 h-4 mr-3" />
              <span>Add Workspace</span>
            </Button>
          )}
        </div>
      </div>

      <div className="pt-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full bg-transparent border-none p-0 outline-none">
            <div className={cn(
              "flex items-center rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group",
              isCollapsed ? "p-1 justify-center" : "space-x-3 px-2 py-2"
            )}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger render={
                    user?.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shadow-sm shrink-0">
                        {user?.displayName?.[0] || 'U'}
                      </div>
                    )
                  } />
                  <TooltipContent side="right" sideOffset={10}>{user?.displayName}</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shadow-sm shrink-0">
                      {user?.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "start" : "end"} side={isCollapsed ? "right" : "top"} className="w-56 p-2 rounded-xl shadow-xl border-border bg-popover">
            <DropdownMenuItem 
              className="rounded-lg h-10 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10" 
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
