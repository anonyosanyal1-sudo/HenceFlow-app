import React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logout } from './lib/firebase';
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
  ensureUserProfile 
} from './services/api';
import { Project, Task, TaskStatus, UserProfile, Company, DEFAULT_STAGES, Stage } from './types';
import { Sidebar } from './components/Sidebar';
import { TaskBoard } from './components/TaskBoard';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { TaskDialog } from './components/TaskDialog';
import { ProjectDialog } from './components/ProjectDialog';
import { CompanyDialog } from './components/CompanyDialog';
import { Logo } from './components/Logo';
import { Layout, Filter, Search, Users, Menu, X, Settings, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
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
  
  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>('todo');
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = React.useState<Project | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = React.useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = React.useState<Company | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        ensureUserProfile();
      }
    });
    return () => unsubscribe();
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
      return;
    }

    const unsubscribe = subscribeToTasks(activeProject.id, (t) => {
      setTasks(t);
    });
    return () => unsubscribe();
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
    if (selectedCompanyForEdit) {
      await updateCompany(selectedCompanyForEdit.id, data);
    } else {
      await createCompany(data);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    await deleteCompany(companyId);
    if (activeCompany?.id === companyId) {
      setActiveCompany(null);
    }
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
    await deleteProject(projectId);
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const targetProjectId = selectedTask?.projectId || activeProject?.id;
    if (!targetProjectId) return;
    
    if (selectedTask) {
      await updateTask(targetProjectId, selectedTask.id, taskData);
    } else {
      await createTask(targetProjectId, taskData);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const targetProjectId = selectedTask?.projectId || activeProject?.id;
    if (!targetProjectId) return;
    await deleteTask(targetProjectId, taskId);
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
                  setSidebarOpen(false);
                }}
                onNewProject={(proj) => {
                  setSelectedProjectForEdit(proj || null);
                  setProjectDialogOpen(true);
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
        onCompanySelect={setActiveCompany}
        onNewCompany={() => {
          setSelectedCompanyForEdit(null);
          setCompanyDialogOpen(true);
        }}
        onCompanySettings={() => {
          setSelectedCompanyForEdit(activeCompany);
          setCompanyDialogOpen(true);
        }}
        onProjectSelect={setActiveProject}
        onNewProject={(proj) => {
          setSelectedProjectForEdit(proj || null);
          setProjectDialogOpen(true);
        }}
        onLogout={logout}
        user={user}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!activeCompany ? (
          <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
            <div className="absolute top-4 left-4 lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm border border-primary/20">
              <Logo className="w-10 h-10" />
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
              onProjectSelect={setActiveProject}
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
            <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card shrink-0">
              <div className="flex items-center space-x-2 md:space-x-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
                <h2 className="text-sm md:text-lg font-bold tracking-tight text-foreground group flex items-center truncate">
                  <Layout className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 text-primary shrink-0" />
                  <span className="truncate">{activeProject.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 ml-1 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      setSelectedProjectForEdit(activeProject);
                      setProjectDialogOpen(true);
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </h2>
                <div className="h-4 w-[1px] bg-border hidden sm:block" />
                <div className="flex items-center space-x-1 hidden sm:flex">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="text-xs font-semibold">{activeProject.members?.length || 1} Members</span>
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto pb-1 no-scrollbar">
                <div className="relative w-40 md:w-64 hidden sm:block shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground text-sm"
                  />
                </div>
                
                {/* Advanced Filters */}
                <div className="flex items-center space-x-2 shrink-0">
                  <Popover>
                    <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 gap-2" })}>
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">Filters</span>
                      {(filterPriority || filterAssignee || filterCreator || filterDueDate) && (
                        <span className="bg-primary text-primary-foreground w-4 h-4 rounded-full text-[10px] flex items-center justify-center">
                          {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length}
                        </span>
                      )}
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">Priority</h4>
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
                        <h4 className="font-medium text-sm text-foreground">Assignee</h4>
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
                        <h4 className="font-medium text-sm text-foreground">Creator</h4>
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
                        <h4 className="font-medium text-sm text-foreground">Date</h4>
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
                    </PopoverContent>
                  </Popover>

                  {(filterPriority || filterAssignee || filterCreator || searchQuery || filterDueDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 text-primary text-[10px] md:text-xs font-semibold hover:bg-primary/10 shrink-0"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterPriority(null);
                        setFilterAssignee(null);
                        setFilterCreator(null);
                        setFilterDueDate(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <Button 
                  className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 px-3 md:px-4"
                  onClick={() => {
                    setSelectedTask(null);
                    setDefaultStatus('todo');
                    setTaskDialogOpen(true);
                  }}
                >
                  <span className="hidden md:inline">New Task</span>
                  <span className="md:hidden">New</span>
                </Button>
              </div>
            </div>

            {/* Board */}
            <TaskBoard 
              tasks={filteredTasks}
              stages={activeProject.stages || DEFAULT_STAGES}
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
                updateTask(activeProject.id, taskId, { status: newStatus });
              }}
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
      </main>
    </div>
  );
}
