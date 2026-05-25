import React from 'react';
import { supabase, logout, toAppUser } from './lib/supabase';
import type { AppUser } from './types';
import {
  subscribeToCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  subscribeToProjects,
  subscribeToTasks,
  createProject,
  updateProject,
  deleteProject,
  subscribeToUsers,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  ensureUserProfile,
  subscribeToMilestones,
  addActivityLog,
  subscribeToCustomFieldDefinitions,
  subscribeToTaskTemplates,
  createRecurringInstance,
} from './services/api';
import { Project, Task, TaskStatus, TaskPriority, UserProfile, Company, DEFAULT_STAGES, Stage, Milestone, CustomFieldDefinition, TaskTemplate } from './types';
import { Sidebar } from './components/Sidebar';
import { TaskBoard, SwimlaneBy } from './components/TaskBoard';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { TaskDialog } from './components/TaskDialog';
import { ProjectDialog } from './components/ProjectDialog';
import { CompanyDialog } from './components/CompanyDialog';
import { ProfileSetup } from './components/ProfileSetup';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { MilestoneDialog } from './components/MilestoneDialog';
import { BulkActionBar } from './components/BulkActionBar';
import { Logo } from './components/Logo';
import { Hash, Filter, Search, Users, Menu, Settings, Milestone as MilestoneIcon, Layers, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'motion/react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6 font-bold text-2xl">!</div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-zinc-400 max-w-md mb-6 font-mono text-xs overflow-auto max-h-40 bg-black/40 p-4 rounded-lg">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Reload Page
          </Button>
          <p className="mt-8 text-[10px] text-zinc-600">
            If this persists, check if your Supabase environment variables are correctly set in your deployment settings.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = React.useState<Company | null>(null);
  
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [allTasks, setAllTasks] = React.useState<Task[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterAssignee, setFilterAssignee] = React.useState<string | null>(null);
  const [filterCreator, setFilterCreator] = React.useState<string | null>(null);
  const [filterPriority, setFilterPriority] = React.useState<string | null>(null);
  const [filterDueDate, setFilterDueDate] = React.useState<string | null>(null);

  // View state
  const [activeView, setActiveView] = React.useState<'board' | 'analytics'>('board');

  // New feature states
  const [swimlaneBy, setSwimlaneBy] = React.useState<SwimlaneBy>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = React.useState<CustomFieldDefinition[]>([]);
  const [taskTemplates, setTaskTemplates] = React.useState<TaskTemplate[]>([]);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = React.useState(false);

  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>('todo');
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = React.useState<Project | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = React.useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = React.useState<Company | null>(null);
  const [profileSetupOpen, setProfileSetupOpen] = React.useState(false);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const appUser = session?.user ? toAppUser(session.user) : null;
      setUser(appUser);
      setLoading(false);
      if (appUser) {
        ensureUserProfile();
        // Show profile setup for new sign-ups that haven't set a name yet
        if (event === 'SIGNED_IN' && !session?.user?.user_metadata?.full_name) {
          setProfileSetupOpen(true);
        }
      }
    });

    // Fallback timer to prevent stuck loading if auth takes too long or fails silently
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  React.useEffect(() => {
    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      return;
    }
    const unsubscribe = subscribeToCompanies((comps) => {
      setCompanies(comps);
      if (comps.length > 0) {
        setActiveCompany(prev => {
          if (!prev) return comps[0];
          const stillExists = comps.find(c => c.id === prev.id);
          return stillExists || comps[0];
        });
      } else {
        setActiveCompany(null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!user || !activeCompany) {
      setProjects([]);
      setActiveProject(null);
      return;
    }

    const unsubscribe = subscribeToProjects(activeCompany.id, (projs) => {
      setProjects(projs);
      setProjects(currProjs => {
        if (currProjs.length > 0 && activeProject) {
          const stillExists = projs.find(p => p.id === activeProject.id);
          if (!stillExists) setActiveProject(null);
        }
        return projs;
      });
    });
    return () => unsubscribe();
  }, [user, activeCompany]);

  React.useEffect(() => {
    if (!activeProject) {
      setTasks([]);
      setMilestones([]);
      setCustomFieldDefs([]);
      setTaskTemplates([]);
      setSelectedTaskIds(new Set());
      return;
    }

    const unsubTasks = subscribeToTasks(activeProject.id, setTasks);
    const unsubMilestones = subscribeToMilestones(activeProject.id, setMilestones);
    const unsubFields = subscribeToCustomFieldDefinitions(activeProject.id, setCustomFieldDefs);
    const unsubTemplates = subscribeToTaskTemplates(activeProject.id, setTaskTemplates);

    return () => {
      unsubTasks();
      unsubMilestones();
      unsubFields();
      unsubTemplates();
    };
  }, [activeProject]);

  // Subscribe to all tasks for the dashboard
  React.useEffect(() => {
    if (projects.length === 0) {
      setAllTasks([]);
      return;
    }

    const unsubs = projects.map(p => 
      subscribeToTasks(p.id, (projectTasks) => {
        setAllTasks(prev => {
          const filtered = prev.filter(t => t.projectId !== p.id);
          return [...filtered, ...projectTasks];
        });
      })
    );

    return () => unsubs.forEach(u => u());
  }, [projects]);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUsers((u) => {
      setUsers(u);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveCompany = async (data: {
    name: string;
    location?: string;
    website?: string;
    industry?: string;
    memberIds?: string[];
    adminIds?: string[]
  }) => {
    // selectedCompanyForEdit is set when opening the CompanyDialog for editing.
    // Dashboard's inline form calls this directly without opening the dialog,
    // so fall back to activeCompany as the update target.
    const targetId = selectedCompanyForEdit?.id ?? activeCompany?.id;
    if (targetId) {
      await updateCompany(targetId, data);
    } else {
      await createCompany(data);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    if (activeCompany?.id === companyId) setActiveCompany(null);
    deleteCompany(companyId).catch(() => {});
  };

  const handleSaveProject = async (data: { name: string; description: string; members: string[]; stages: Stage[] }) => {
    if (selectedProjectForEdit) {
      await updateProject(selectedProjectForEdit.id, data);
    } else if (activeCompany) {
      await createProject(activeCompany.id, data);
    }
  };

  const companyUsers = React.useMemo(() => {
    if (!activeCompany) return [];
    return users.filter(u => activeCompany.memberIds?.includes(u.uid));
  }, [users, activeCompany]);

  const handleDeleteProject = async (projectId: string) => {
    const prevProjects = projects;
    const prevAllTasks = allTasks;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setAllTasks(prev => prev.filter(t => t.projectId !== projectId));
    if (activeProject?.id === projectId) setActiveProject(null);
    deleteProject(projectId).catch((err) => {
      console.error('Failed to delete workspace:', err);
      setProjects(prevProjects);
      setAllTasks(prevAllTasks);
    });
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const targetProjectId = selectedTask?.projectId || activeProject?.id;
    if (!targetProjectId) return;

    if (selectedTask) {
      // Log activity for meaningful field changes
      const logChanges: Array<[string, string, string | undefined, string | undefined]> = [];
      if (taskData.status !== undefined && taskData.status !== selectedTask.status) {
        logChanges.push(['status_changed', 'status', selectedTask.status, taskData.status]);
      }
      if (taskData.priority !== undefined && taskData.priority !== selectedTask.priority) {
        logChanges.push(['priority_changed', 'priority', selectedTask.priority, taskData.priority]);
      }
      if (taskData.assigneeId !== selectedTask.assigneeId) {
        const oldName = companyUsers.find(u => u.uid === selectedTask.assigneeId)?.displayName;
        const newName = companyUsers.find(u => u.uid === taskData.assigneeId)?.displayName;
        logChanges.push(['assignee_changed', 'assignee', oldName, newName]);
      }
      if (taskData.milestoneId !== selectedTask.milestoneId) {
        const oldM = milestones.find(m => m.id === selectedTask.milestoneId)?.name;
        const newM = milestones.find(m => m.id === taskData.milestoneId)?.name;
        logChanges.push(['milestone_changed', 'milestone', oldM, newM]);
      }
      if (taskData.recurrenceRule !== selectedTask.recurrenceRule) {
        logChanges.push(['recurrence_changed', 'recurrence', selectedTask.recurrenceRule, taskData.recurrenceRule]);
      }
      await updateTask(targetProjectId, selectedTask.id, taskData);
      for (const [action, field, oldV, newV] of logChanges) {
        addActivityLog(selectedTask.id, targetProjectId, action, field, oldV, newV).catch(() => {});
      }
    } else {
      const id = await createTask(targetProjectId, taskData);
      if (id) {
        addActivityLog(id, targetProjectId, 'task_created').catch(() => {});
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const targetProjectId = selectedTask?.projectId || activeProject?.id;
    if (!targetProjectId) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
    deleteTask(targetProjectId, taskId).catch(() => {});
  };

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAssignee = !filterAssignee || task.assigneeId === filterAssignee;
      const matchesCreator = !filterCreator || task.creatorId === filterCreator;
      const matchesPriority = !filterPriority || task.priority === filterPriority;
      
      let matchesDate = true;
      if (filterDueDate) {
        if (!task.dueDate) {
          matchesDate = false;
        } else {
          const taskDate = task.dueDate.split('T')[0];
          const filterDate = filterDueDate;
          
          if (filterDate === 'overdue') {
            matchesDate = new Date(taskDate) < new Date(new Date().setHours(0,0,0,0));
          } else if (filterDate === 'today') {
            matchesDate = taskDate === new Date().toISOString().split('T')[0];
          } else if (filterDate === 'week') {
            const now = new Date();
            const weekEnd = new Date();
            weekEnd.setDate(now.getDate() + 7);
            const taskD = new Date(taskDate);
            matchesDate = taskD >= new Date(now.setHours(0,0,0,0)) && taskD <= weekEnd;
          }
        }
      }
      
      return matchesSearch && matchesAssignee && matchesCreator && matchesPriority && matchesDate;
    });
  }, [tasks, searchQuery, filterAssignee, filterCreator, filterPriority, filterDueDate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
          />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing HenceFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Ambient glow layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-primary/28 blur-[130px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[55%] h-[55%] rounded-full bg-chart-1/22 blur-[120px]" />
        <div className="absolute top-[25%] right-[5%] w-[32%] h-[32%] rounded-full bg-chart-4/18 blur-[100px]" />
        <div className="absolute top-[55%] left-[15%] w-[28%] h-[28%] rounded-full bg-chart-3/15 blur-[90px]" />
        <div className="absolute top-[10%] right-[30%] w-[20%] h-[20%] rounded-full bg-sky-500/10 blur-[80px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar
                companies={companies}
                projects={projects}
                activeProject={activeProject}
                activeCompany={activeCompany}
                activeView={activeView}
                onCompanySelect={(c) => {
                  setActiveCompany(c);
                  setSidebarOpen(false);
                }}
                onNewCompany={() => {
                  setSelectedCompanyForEdit(null);
                  setCompanyDialogOpen(true);
                  setSidebarOpen(false);
                }}
                onCompanySettings={() => {
                  setSelectedCompanyForEdit(activeCompany);
                  setCompanyDialogOpen(true);
                  setSidebarOpen(false);
                }}
                onProjectSelect={(p) => {
                  setActiveProject(p);
                  setActiveView('board');
                  setSidebarOpen(false);
                }}
                onNewProject={(proj) => {
                  setSelectedProjectForEdit(proj || null);
                  setProjectDialogOpen(true);
                  setSidebarOpen(false);
                }}
                onAnalyticsSelect={() => {
                  setActiveProject(null);
                  setActiveView('analytics');
                  setSidebarOpen(false);
                }}
                onEditProfile={() => {
                  setProfileSetupOpen(true);
                  setSidebarOpen(false);
                }}
                onLogout={logout}
                user={user}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Sidebar
        className="hidden lg:flex"
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        companies={companies}
        projects={projects}
        activeProject={activeProject}
        activeCompany={activeCompany}
        activeView={activeView}
        onCompanySelect={setActiveCompany}
        onNewCompany={() => {
          setSelectedCompanyForEdit(null);
          setCompanyDialogOpen(true);
        }}
        onCompanySettings={() => {
          setSelectedCompanyForEdit(activeCompany);
          setCompanyDialogOpen(true);
        }}
        onProjectSelect={(p) => {
          setActiveProject(p);
          setActiveView('board');
        }}
        onNewProject={(proj) => {
          setSelectedProjectForEdit(proj || null);
          setProjectDialogOpen(true);
        }}
        onAnalyticsSelect={() => {
          setActiveProject(null);
          setActiveView('analytics');
        }}
        onEditProfile={() => setProfileSetupOpen(true)}
        onLogout={logout}
        user={user}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!activeCompany ? (
          <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent z-10">
            <div className="absolute top-4 left-4 lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-primary/20 overflow-hidden">
              <Logo variant="icon" className="w-full h-full" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Create your company</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Workspaces belong to a company. Create one to get started.
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 shadow-xl shadow-primary/20 rounded-xl font-bold"
              onClick={() => {
                setSelectedCompanyForEdit(null);
                setCompanyDialogOpen(true);
              }}
            >
              Set up Company
            </Button>
          </div>
        ) : activeView === 'analytics' ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="lg:hidden h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-4">
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Analytics</h2>
            </div>
            <AnalyticsDashboard
              tasks={allTasks}
              projects={projects}
              users={users}
              currentUserId={user.uid}
            />
          </div>
        ) : !activeProject ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile Only Header for Dashboard */}
            <div className="lg:hidden h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-4">
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground group flex items-center">
                Dashboard
              </h2>
            </div>
            <Dashboard
              company={activeCompany}
              projects={projects}
              tasks={allTasks}
              users={users}
              currentUserId={user.uid}
              onProjectSelect={(p) => {
                setActiveProject(p);
                setActiveView('board');
              }}
              onEditProject={(proj) => {
                setSelectedProjectForEdit(proj);
                setProjectDialogOpen(true);
              }}
              onDeleteProject={handleDeleteProject}
              onNewProject={() => {
                setSelectedProjectForEdit(null);
                setProjectDialogOpen(true);
              }}
              onUpdateCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
            />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="border-b border-border/50 px-4 md:px-6 py-3 bg-card/60 backdrop-blur-sm shrink-0">
              <div className="flex items-center justify-between gap-3">

                {/* Left: workspace icon + name + meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden shrink-0 h-8 w-8">
                    <Menu className="w-4 h-4" />
                  </Button>
                  {/* # Icon box */}
                  <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 text-primary" />
                  </div>
                  {/* Name + subtitle */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-foreground text-sm md:text-base truncate leading-tight">
                        {activeProject.name}
                      </span>
                      <button
                        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                        onClick={() => { setSelectedProjectForEdit(activeProject); setProjectDialogOpen(true); }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-medium mt-0.5">
                      <Users className="w-3 h-3" />
                      <span>{activeProject.members?.length || 1} members</span>
                      <span className="opacity-40">·</span>
                      <span>{tasks.length} tasks</span>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: search + filters + view toggle + new task */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Search */}
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                    <Input
                      placeholder="Search tasks…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-10 h-9 w-52 bg-muted/40 border-border/40 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-mono pointer-events-none">⌘K</kbd>
                  </div>

                  {/* Filters */}
                  <Popover>
                    <PopoverTrigger className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "h-9 gap-2 border-border/50 bg-muted/30 hover:bg-muted/60 font-medium text-muted-foreground hover:text-foreground"
                    })}>
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                      {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length > 0 && (
                        <span className="bg-primary text-primary-foreground min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                          {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length}
                        </span>
                      )}
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Priority</h4>
                        <select
                          className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterPriority || ''}
                          onChange={(e) => setFilterPriority(e.target.value || null)}
                        >
                          <option value="">All Priorities</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Assignee</h4>
                        <select
                          className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterAssignee || ''}
                          onChange={(e) => setFilterAssignee(e.target.value || null)}
                        >
                          <option value="">Any Assignee</option>
                          {companyUsers.map(u => (
                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Creator</h4>
                        <select
                          className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterCreator || ''}
                          onChange={(e) => setFilterCreator(e.target.value || null)}
                        >
                          <option value="">Any Creator</option>
                          {companyUsers.map(u => (
                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Date</h4>
                        <select
                          className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterDueDate || ''}
                          onChange={(e) => setFilterDueDate(e.target.value || null)}
                        >
                          <option value="">Any Date</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      {(filterPriority || filterAssignee || filterCreator || searchQuery || filterDueDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterPriority(null);
                            setFilterAssignee(null);
                            setFilterCreator(null);
                            setFilterDueDate(null);
                          }}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>

                  {/* Swimlane toggle */}
                  <div className="hidden md:flex items-center bg-muted/40 border border-border/40 rounded-xl p-1 gap-0.5">
                    {([['Off', null], ['Assignee', 'assignee'], ['Priority', 'priority']] as [string, SwimlaneBy][]).map(([label, val]) => (
                      <button
                        key={label}
                        onClick={() => setSwimlaneBy(val)}
                        className={cn(
                          "px-2.5 h-7 rounded-lg text-xs font-semibold transition-all",
                          swimlaneBy === val
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                      >
                        {val === null ? <Layers className="w-3 h-3 inline" /> : label}
                      </button>
                    ))}
                  </div>

                  {/* Bulk select toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5 border-border/50 bg-muted/30 font-medium text-xs hidden md:flex",
                      selectedTaskIds.size > 0 ? "text-primary border-primary/40 bg-primary/10" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedTaskIds(selectedTaskIds.size > 0 ? new Set() : new Set())}
                    title="Toggle bulk select"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {selectedTaskIds.size > 0 ? selectedTaskIds.size : ''}
                  </Button>

                  {/* Milestones */}
                  {milestones.length > 0 || activeProject ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 border-border/50 bg-muted/30 hover:bg-muted/60 font-medium text-muted-foreground hover:text-foreground text-xs hidden md:flex"
                      onClick={() => setMilestoneDialogOpen(true)}
                    >
                      <MilestoneIcon className="w-3.5 h-3.5" />
                      <span>{milestones.length > 0 ? `${milestones.length}` : ''} Milestones</span>
                    </Button>
                  ) : null}

                  {/* New task */}
                  <Button
                    className="h-9 px-4 font-bold text-primary-foreground shadow-md shadow-primary/25 border-0 hover:opacity-90 transition-opacity gap-1.5"
                    style={{ background: 'linear-gradient(135deg, oklch(0.67 0.30 285), oklch(0.60 0.26 310))' }}
                    onClick={() => {
                      setSelectedTask(null);
                      setDefaultStatus('todo');
                      setTaskDialogOpen(true);
                    }}
                  >
                    <span className="text-base leading-none font-light">+</span>
                    <span className="hidden md:inline">New task</span>
                    <span className="md:hidden">New</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Board */}
            <TaskBoard
              tasks={filteredTasks}
              stages={activeProject.stages || DEFAULT_STAGES}
              users={companyUsers}
              milestones={milestones}
              selectedTaskIds={selectedTaskIds}
              swimlaneBy={swimlaneBy}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setTaskDialogOpen(true);
              }}
              onAddTask={(status) => {
                setSelectedTask(null);
                setDefaultStatus(status);
                setTaskDialogOpen(true);
              }}
              onStatusChange={(taskId, newStatus) => {
                const task = tasks.find(t => t.id === taskId);
                const prevStatus = task?.status;
                const applyStatus = (s: string) => {
                  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: s as TaskStatus } : t));
                  setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: s as TaskStatus } : t));
                };
                applyStatus(newStatus);
                updateTask(activeProject.id, taskId, { status: newStatus })
                  .then(() => {
                    if (task) {
                      addActivityLog(taskId, activeProject.id, 'status_changed', 'status', prevStatus, newStatus).catch(() => {});
                      // Spawn next recurrence when closed
                      const closedStageId = (activeProject.stages || DEFAULT_STAGES).find(s => s.id === 'closed')?.id ?? 'closed';
                      if (newStatus === closedStageId && task.recurrenceRule) {
                        createRecurringInstance(activeProject.id, task).catch(() => {});
                      }
                    }
                  })
                  .catch(() => {
                    if (prevStatus !== undefined) applyStatus(prevStatus);
                  });
              }}
              onSelectionChange={setSelectedTaskIds}
            />
          </>
        )}

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
          activeProjectId={activeProject?.id}
          defaultStatus={defaultStatus}
          users={companyUsers}
          stages={activeProject?.stages || DEFAULT_STAGES}
          milestones={milestones}
          customFieldDefs={customFieldDefs}
          templates={taskTemplates}
          allTasks={tasks}
          currentUserId={user.uid}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />

        <ProjectDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          project={selectedProjectForEdit}
          users={companyUsers}
          currentUserId={user.uid}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />

        <CompanyDialog
          open={companyDialogOpen}
          onOpenChange={setCompanyDialogOpen}
          company={selectedCompanyForEdit}
          users={users}
          currentUserId={user.uid}
          onSave={handleSaveCompany}
          onDelete={handleDeleteCompany}
        />

        <ProfileSetup
          open={profileSetupOpen}
          onOpenChange={setProfileSetupOpen}
          currentDisplayName={user.displayName}
          currentPhotoURL={user.photoURL}
          onSaved={(displayName, photoURL) => {
            setUser(prev => prev ? { ...prev, displayName, photoURL } : prev);
          }}
        />

        {activeProject && (
          <MilestoneDialog
            open={milestoneDialogOpen}
            onOpenChange={setMilestoneDialogOpen}
            projectId={activeProject.id}
            milestones={milestones}
          />
        )}

        {/* Bulk action bar */}
        <BulkActionBar
          selectedIds={selectedTaskIds}
          onClear={() => setSelectedTaskIds(new Set())}
          stages={activeProject?.stages || DEFAULT_STAGES}
          users={companyUsers}
          milestones={milestones}
          onMoveToStage={async (status) => {
            const ids = Array.from(selectedTaskIds);
            setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t));
            await bulkUpdateTasks(ids, { status });
            setSelectedTaskIds(new Set());
          }}
          onAssign={async (assigneeId) => {
            const ids = Array.from(selectedTaskIds);
            const update: Partial<Task> = { assigneeId: assigneeId ?? undefined };
            setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, assigneeId: assigneeId ?? undefined } : t));
            await bulkUpdateTasks(ids, update);
            setSelectedTaskIds(new Set());
          }}
          onSetPriority={async (priority: TaskPriority) => {
            const ids = Array.from(selectedTaskIds);
            setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, priority } : t));
            await bulkUpdateTasks(ids, { priority });
            setSelectedTaskIds(new Set());
          }}
          onSetMilestone={async (milestoneId) => {
            const ids = Array.from(selectedTaskIds);
            setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, milestoneId: milestoneId ?? undefined } : t));
            await bulkUpdateTasks(ids, { milestoneId: milestoneId ?? undefined });
            setSelectedTaskIds(new Set());
          }}
          onDelete={async () => {
            const ids = Array.from(selectedTaskIds);
            setTasks(prev => prev.filter(t => !ids.includes(t.id)));
            setAllTasks(prev => prev.filter(t => !ids.includes(t.id)));
            await bulkDeleteTasks(ids);
            setSelectedTaskIds(new Set());
          }}
        />
      </main>
    </div>
  );
}
