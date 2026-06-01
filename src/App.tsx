import React from 'react';
import { supabase, logout, toAppUser } from './lib/supabase';
import type { AppUser } from './types';
import {
  fetchCompanies,
  fetchProjects,
  fetchTasks,
  fetchPodTasks,
  fetchUsers,
  fetchMilestones,
  fetchCustomFieldDefinitions,
  fetchTaskTemplates,
  createCompany,
  updateCompany,
  deleteCompany,
  createPod,
  updatePod,
  deletePod,
  fetchPods,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  ensureUserProfile,
  fetchNotifications,
  fetchSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
  fetchAutomations,
  addActivityLog,
} from './services/api';
import { useServerEvents } from './hooks/useServerEvents';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Task, TaskStatus, TaskPriority, UserProfile, Company, Pod, DEFAULT_STAGES, Stage, Milestone, CustomFieldDefinition, TaskTemplate, Notification, SavedFilter, AutomationRule, Subtask } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { Sidebar } from './components/Sidebar';
import { ProjectOverview } from './components/ProjectOverview';
import { TaskBoard, SwimlaneBy } from './components/TaskBoard';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { TaskDialog } from './components/TaskDialog';
import { ProjectDialog } from './components/ProjectDialog';
import { CompanyDialog } from './components/CompanyDialog';
import { CompanySettingsPage } from './components/CompanySettingsPage';
import { InviteDialog } from './components/InviteDialog';
import { CreateCompanyPage } from './components/CreateCompanyPage';
import { ProfileSetup } from './components/ProfileSetup';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { MilestoneDialog } from './components/MilestoneDialog';
import { BulkActionBar } from './components/BulkActionBar';
import { NotificationBell } from './components/NotificationBell';
import { GanttView } from './components/GanttView';
import { AutomationsDialog } from './components/AutomationsDialog';
import { PodDialog } from './components/PodDialog';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { Logo } from './components/Logo';
import { Hash, Filter, Search, Menu, Settings, Milestone as MilestoneIcon, CheckSquare, Zap, Bookmark, BookmarkPlus, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';

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
  const [companyLoaded, setCompanyLoaded] = React.useState(false);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [pods, setPods] = React.useState<Pod[]>([]);
  const [activePod, setActivePod] = React.useState<Pod | null>(null);

  // Pod dialog state
  const [podDialogOpen, setPodDialogOpen] = React.useState(false);
  const [selectedPodForEdit, setSelectedPodForEdit] = React.useState<Pod | null>(null);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() =>
    localStorage.getItem('hf-sidebar-collapsed') === 'true'
  );
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [allTasks, setAllTasks] = React.useState<Task[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filterAssignee, setFilterAssignee] = React.useState<string | null>(null);
  const [filterCreator, setFilterCreator] = React.useState<string | null>(null);
  const [filterPriority, setFilterPriority] = React.useState<string | null>(null);
  const [filterDueDate, setFilterDueDate] = React.useState<string | null>(null);

  // View state
  const [activeView, setActiveView] = React.useState<'board' | 'analytics' | 'timeline'>('board');

  // New feature states
  const [swimlaneBy, setSwimlaneBy] = React.useState<SwimlaneBy>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [selectionModeActive, setSelectionModeActive] = React.useState(false);
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = React.useState<CustomFieldDefinition[]>([]);
  const [taskTemplates, setTaskTemplates] = React.useState<TaskTemplate[]>([]);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = React.useState(false);

  // New feature states
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('hf-theme') as 'dark' | 'light') || 'dark';
  });
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([]);
  const [automations, setAutomations] = React.useState<AutomationRule[]>([]);
  const [automationsDialogOpen, setAutomationsDialogOpen] = React.useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = React.useState(false);
  const [savingFilter, setSavingFilter] = React.useState(false);
  const [filterNameInput, setFilterNameInput] = React.useState('');
  const [showFilterNameInput, setShowFilterNameInput] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = React.useState<TaskStatus>('todo');
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = React.useState<Project | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = React.useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = React.useState<Company | null>(null);
  const [showCompanySettings, setShowCompanySettings] = React.useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = React.useState(false);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const appUser = session?.user ? toAppUser(session.user) : null;
      setUser(appUser);
      setLoading(false);
      if (appUser) {
        ensureUserProfile();
        // Show profile setup for new sign-ups that haven't set a name yet
        if (event === 'SIGNED_IN' && !session?.user?.user_metadata?.full_name && !session?.user?.user_metadata?.name) {
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

  const loadCompany = React.useCallback(async () => {
    if (!user) return;
    const comps = await fetchCompanies().catch(() => [] as Company[]);
    setCompany(comps.length > 0 ? comps[0] : null);
    setCompanyLoaded(true);
  }, [user]);

  const loadPods = React.useCallback(async (projectId: string) => {
    const podList = await fetchPods(projectId).catch(() => [] as Pod[]);
    setPods(podList);
    // Keep activePod in sync so stage changes from other users propagate
    setActivePod(prev => {
      if (!prev) return prev;
      return podList.find(p => p.id === prev.id) ?? prev;
    });
  }, []);

  const loadProjects = React.useCallback(async () => {
    if (!user || !company) return;
    const projs = await fetchProjects(company.id).catch(() => [] as Project[]);
    setProjects(projs);
    if (activeProject && !projs.find(p => p.id === activeProject.id)) {
      setActiveProject(null);
    }
  }, [user, company, activeProject]);

  const loadPodData = React.useCallback(async (podId: string) => {
    const taskList = await fetchPodTasks(podId).catch(() => [] as Task[]);
    setTasks(taskList);
  }, []);

  const loadProjectFeatureData = React.useCallback(async (projectId: string) => {
    const [milestoneList, fieldDefs, templates] = await Promise.all([
      fetchMilestones(projectId).catch(() => [] as Milestone[]),
      fetchCustomFieldDefinitions(projectId).catch(() => [] as CustomFieldDefinition[]),
      fetchTaskTemplates(projectId).catch(() => [] as TaskTemplate[]),
    ]);
    setMilestones(milestoneList);
    setCustomFieldDefs(fieldDefs);
    setTaskTemplates(templates);
  }, []);

  const loadAllTasks = React.useCallback(async () => {
    if (projects.length === 0) { setAllTasks([]); return; }
    const results = await Promise.all(projects.map(p => fetchTasks(p.id).catch(() => [] as Task[])));
    setAllTasks(results.flat());
  // Depend on a stable string key so array reference changes don't re-trigger fetches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map(p => p.id).join(',')]);

  React.useEffect(() => {
    if (!user) { setCompany(null); setPods([]); setCompanyLoaded(false); return; }
    loadCompany();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!user || !company) { setProjects([]); setActiveProject(null); return; }
    loadProjects();
  }, [user, company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!activeProject) {
      setPods([]);
      setActivePod(null);
      setTasks([]);
      setMilestones([]);
      setCustomFieldDefs([]);
      setTaskTemplates([]);
      setSelectedTaskIds(new Set());
      return;
    }
    loadPods(activeProject.id);
    loadProjectFeatureData(activeProject.id);
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setSelectionModeActive(false);
    if (!activePod) {
      setTasks([]);
      setSelectedTaskIds(new Set());
      return;
    }
    loadPodData(activePod.id);
  }, [activePod?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { loadAllTasks(); }, [loadAllTasks]);

  React.useEffect(() => {
    if (!user) return;
    fetchUsers().then(setUsers).catch(() => {});
  }, [user]);

  React.useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('hf-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    localStorage.setItem('hf-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Debounce search to avoid filtering on every keystroke
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!user) { setNotifications([]); return; }
    fetchNotifications().then(setNotifications).catch(() => {});
    const interval = setInterval(() => {
      fetchNotifications().then(setNotifications).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  React.useEffect(() => {
    if (!activeProject) { setSavedFilters([]); return; }
    fetchSavedFilters(activeProject.id).then(setSavedFilters).catch(() => {});
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!activeProject) { setAutomations([]); return; }
    fetchAutomations(activeProject.id).then(setAutomations).catch(() => {});
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh custom fields when the project settings dialog closes
  React.useEffect(() => {
    if (!projectDialogOpen && activeProject) {
      fetchCustomFieldDefinitions(activeProject.id).then(setCustomFieldDefs).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDialogOpen]);

  // Refresh pod data when pod dialog closes
  React.useEffect(() => {
    if (!podDialogOpen && activeProject) {
      loadPods(activeProject.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podDialogOpen]);

  // Refresh milestones when milestone dialog closes
  React.useEffect(() => {
    if (!milestoneDialogOpen && activeProject) {
      fetchMilestones(activeProject.id).then(setMilestones).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneDialogOpen]);

  // Refresh task data when tab regains focus (catches missed real-time events)
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activePod) {
        loadPodData(activePod.id);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activePod]); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE: listen for server-side changes and refetch affected data
  const activeProjectId = activeProject?.id;
  const projectIdsForSSE = React.useMemo(
    () => projects.map(p => p.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects.map(p => p.id).join(',')]
  );

  const activePodId = activePod?.id;
  useServerEvents(projectIdsForSSE, React.useCallback((type: string, data: Record<string, unknown>) => {
    const pid = data.projectId as string | undefined;
    if (type === 'tasks:changed' || type === 'subtasks:changed') {
      if (activePodId) loadPodData(activePodId);
      loadAllTasks();
    } else if (type === 'milestones:changed') {
      if (pid === activeProjectId && activeProjectId) {
        fetchMilestones(activeProjectId).then(setMilestones).catch(() => {});
      }
    } else if (type === 'comments:changed' || type === 'time_entries:changed') {
      // Handled by TaskDialog's own fetch
    } else if (type === 'custom_fields:changed') {
      if (activeProjectId) fetchCustomFieldDefinitions(activeProjectId).then(setCustomFieldDefs).catch(() => {});
    } else if (type === 'templates:changed') {
      if (activeProjectId) fetchTaskTemplates(activeProjectId).then(setTaskTemplates).catch(() => {});
    } else if (type === 'projects:changed') {
      loadProjects();
    } else if (type === 'pods:changed') {
      if (activeProjectId) loadPods(activeProjectId);
    } else if (type === 'companies:changed') {
      loadCompany();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activePodId]));

  useKeyboardShortcuts({
    onNewTask: () => {
      if (!activePod) return;
      setSelectedTask(null);
      setDefaultStatus('todo');
      setTaskDialogOpen(true);
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onShowShortcuts: () => setShortcutsHelpOpen(true),
    onGoTimeline: () => { if (activePod) setActiveView('timeline'); },
    onGoBoard: () => setActiveView('board'),
    onGoAnalytics: () => { setActivePod(null); setActiveView('analytics'); },
  }, !!user);

  const handleSaveCompany = async (data: {
    name: string;
    location?: string;
    website?: string;
    industry?: string;
    memberIds?: string[];
    adminIds?: string[];
    viewerIds?: string[];
  }) => {
    const targetId = selectedCompanyForEdit?.id ?? company?.id;
    if (targetId) {
      await updateCompany(targetId, data);
    } else {
      await createCompany(data);
    }
    await loadCompany();
    await fetchUsers().then(setUsers).catch(() => {});
  };

  const handleInviteMembers = async (newMembers: { uid: string; role: 'Admin' | 'Member' | 'Viewer' }[]) => {
    if (!company) return;
    const addedIds = newMembers.map(m => m.uid);
    const newMemberIds = [...new Set([...company.memberIds, ...addedIds])];
    const newAdminIds = [...new Set([
      ...company.adminIds,
      ...newMembers.filter(m => m.role === 'Admin').map(m => m.uid),
    ])];
    const newViewerIds = [...new Set([
      ...company.viewerIds,
      ...newMembers.filter(m => m.role === 'Viewer').map(m => m.uid),
    ])];
    await updateCompany(company.id, {
      name: company.name,
      memberIds: newMemberIds,
      adminIds: newAdminIds,
      viewerIds: newViewerIds,
    });
    await loadCompany();
    await fetchUsers().then(setUsers).catch(() => {});
    setInviteDialogOpen(false);
  };

  const handleDeleteCompany = async (companyId: string) => {
    await deleteCompany(companyId);
    setCompany(null);
    setProjects([]);
    setPods([]);
    setAllTasks([]);
    setTasks([]);
    setActiveProject(null);
  };

  const handleSavePod = async (data: { name: string; description?: string; color?: string; members?: string[]; stages?: Stage[] }) => {
    if (!company || !activeProject) return;
    if (selectedPodForEdit) {
      setPods(prev => prev.map(p => p.id === selectedPodForEdit.id ? { ...p, ...data } : p));
      if (activePod?.id === selectedPodForEdit.id) {
        setActivePod(prev => prev ? { ...prev, ...data } : prev);
      }
      await updatePod(selectedPodForEdit.id, data);
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempPod: Pod = {
        id: tempId,
        projectId: activeProject.id,
        companyId: company.id,
        ownerId: user!.uid,
        name: data.name ?? 'New Pod',
        description: data.description,
        color: data.color ?? '#6366f1',
        members: data.members ?? [],
        stages: data.stages ?? [...DEFAULT_STAGES],
        createdAt: new Date().toISOString(),
      };
      setPods(prev => [...prev, tempPod]);
      try {
        const newId = await createPod(activeProject.id, company.id, data);
        setPods(prev => prev.map(p => p.id === tempId ? { ...p, id: newId } : p));
      } catch (err) {
        setPods(prev => prev.filter(p => p.id !== tempId));
      }
    }
  };

  const handleDeletePod = async (podId: string) => {
    if (!company) return;
    await deletePod(podId);
    setPods(prev => prev.filter(p => p.id !== podId));
    if (activePod?.id === podId) setActivePod(null);
  };

  const handleSaveProject = async (data: { name: string; description: string; members: string[]; managerId?: string; color?: string }) => {
    const dedupedMembers = [...new Set(data.members)];
    const payload = { ...data, members: dedupedMembers };
    if (selectedProjectForEdit) {
      setProjects(prev => prev.map(p => p.id === selectedProjectForEdit.id ? { ...p, ...payload } : p));
      await updateProject(selectedProjectForEdit.id, payload);
      if (activeProject?.id === selectedProjectForEdit.id) {
        setActiveProject(prev => prev ? { ...prev, ...payload } : prev);
      }
    } else if (company) {
      const tempId = `temp-${Date.now()}`;
      const tempProject: Project = {
        id: tempId,
        companyId: company.id,
        ownerId: user!.uid,
        managerId: payload.managerId ?? user!.uid,
        name: payload.name,
        description: payload.description,
        members: payload.members,
        color: payload.color ?? '#6366f1',
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      setProjects(prev => [...prev, tempProject]);
      try {
        const newId = await createProject(company.id, payload);
        setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: newId } : p));
      } catch (err) {
        setProjects(prev => prev.filter(p => p.id !== tempId));
      }
    }
  };

  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isArchived: archive } : p));
    if (activeProject?.id === projectId && archive) setActiveProject(null);
    await archiveProject(projectId, archive);
  };

  const isViewer = React.useMemo(() =>
    !!(company && user &&
      company.viewerIds?.includes(user.uid) &&
      !company.adminIds?.includes(user.uid) &&
      company.ownerId !== user.uid),
  [company, user]);

  const companyUsers = React.useMemo(() => {
    if (!company) return [];
    // Include owner even if not in memberIds, then company members
    const ownerUser = users.find(u => u.uid === company.ownerId);
    const memberUsers = users.filter(u => company.memberIds?.includes(u.uid));
    const all = ownerUser ? [ownerUser, ...memberUsers.filter(u => u.uid !== company.ownerId)] : memberUsers;
    return all;
  }, [users, company]);

  const executeAutomations = React.useCallback(async (
    projectId: string,
    taskId: string,
    updates: Partial<Task>,
  ) => {
    const rules = automations.filter(r => r.isActive && r.projectId === projectId);
    for (const rule of rules) {
      let triggered = false;
      if (rule.triggerType === 'status_changed' && updates.status !== undefined) {
        triggered = !rule.triggerValue || updates.status === rule.triggerValue;
      } else if (rule.triggerType === 'priority_changed' && updates.priority !== undefined) {
        triggered = !rule.triggerValue || updates.priority === rule.triggerValue;
      } else if (rule.triggerType === 'assignee_changed' && 'assigneeId' in updates) {
        triggered = !rule.triggerValue || updates.assigneeId === rule.triggerValue;
      }
      if (!triggered) continue;

      const actionUpdates: Partial<Task> = {};
      if (rule.actionType === 'set_status' && rule.actionValue) {
        actionUpdates.status = rule.actionValue as TaskStatus;
      } else if (rule.actionType === 'set_priority' && rule.actionValue) {
        actionUpdates.priority = rule.actionValue as TaskPriority;
      } else if (rule.actionType === 'set_assignee') {
        actionUpdates.assigneeId = rule.actionValue || undefined;
      }

      if (Object.keys(actionUpdates).length > 0) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...actionUpdates } : t));
        setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...actionUpdates } : t));
        updateTask(projectId, taskId, actionUpdates).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automations]);

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
    if (isViewer) { toast.error('Viewers cannot edit tasks'); return; }
    const targetPodId = selectedTask?.podId ?? activePod?.id;
    const targetProjectId = selectedTask?.projectId ?? activeProject?.id;
    if (!targetPodId || !targetProjectId) return;
    if (selectedTask) {
      const updatedTask = { ...selectedTask, ...taskData };
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      await updateTask(targetProjectId, selectedTask.id, taskData);
      toast.success('Task updated');
      addActivityLog(selectedTask.id, targetProjectId, 'task_updated').catch(() => {});
      executeAutomations(targetProjectId, selectedTask.id, taskData);
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        podId: targetPodId,
        projectId: targetProjectId,
        creatorId: user!.uid,
        title: taskData.title ?? '',
        description: taskData.description,
        status: (taskData.status ?? 'todo') as TaskStatus,
        priority: (taskData.priority ?? 'medium') as TaskPriority,
        assigneeId: taskData.assigneeId,
        dueDate: taskData.dueDate,
        tags: taskData.tags ?? [],
        subtasks: (taskData.subtasks ?? []) as Subtask[],
        milestoneId: taskData.milestoneId,
        recurrenceRule: taskData.recurrenceRule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev => [...prev, tempTask]);
      setAllTasks(prev => [...prev, tempTask]);
      try {
        const newId = await createTask(targetPodId, targetProjectId, taskData);
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
        setAllTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
        toast.success('Task created');
        addActivityLog(newId, targetProjectId, 'task_created').catch(() => {});
      } catch (err) {
        setTasks(prev => prev.filter(t => t.id !== tempId));
        setAllTasks(prev => prev.filter(t => t.id !== tempId));
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isViewer) { toast.error('Viewers cannot delete tasks'); return; }
    const targetProjectId = selectedTask?.projectId ?? activeProject?.id;
    if (!targetProjectId) return;
    const prevTasks = tasks;
    const prevAllTasks = allTasks;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    deleteTask(targetProjectId, taskId)
      .then(() => toast.success('Task deleted'))
      .catch(() => {
        setTasks(prevTasks);
        setAllTasks(prevAllTasks);
        toast.error('Failed to delete task');
      });
  };

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (task.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());
      
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
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const weekEnd = new Date(startOfToday.getTime() + 7 * 86400000);
            const taskD = new Date(taskDate);
            matchesDate = taskD >= startOfToday && taskD <= weekEnd;
          }
        }
      }
      
      return matchesSearch && matchesAssignee && matchesCreator && matchesPriority && matchesDate;
    });
  }, [tasks, debouncedSearch, filterAssignee, filterCreator, filterPriority, filterDueDate]);

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
                company={company}
                pods={pods}
                activePod={activePod}
                projects={projects}
                activeProject={activeProject}
                activeView={activeView}
                onNewPod={() => { setSelectedPodForEdit(null); setPodDialogOpen(true); setSidebarOpen(false); }}
                onEditPod={(pod) => { setSelectedPodForEdit(pod); setPodDialogOpen(true); setSidebarOpen(false); }}
                onCompanySettings={() => { setShowCompanySettings(true); setSidebarOpen(false); }}
                onProjectSelect={(p) => { setActiveProject(p); setActivePod(null); setActiveView('board'); setShowCompanySettings(false); setSidebarOpen(false); }}
                onPodSelect={(pod) => { setActivePod(pod); setActiveView('board'); setSidebarOpen(false); }}
                onNewProject={() => { setSelectedProjectForEdit(null); setProjectDialogOpen(true); setSidebarOpen(false); }}
                onEditProject={(proj) => { setSelectedProjectForEdit(proj); setProjectDialogOpen(true); setSidebarOpen(false); }}
                onDashboardSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('board'); setShowCompanySettings(false); setSidebarOpen(false); }}
                onAnalyticsSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('analytics'); setShowCompanySettings(false); setSidebarOpen(false); }}
                onEditProfile={() => { setProfileSetupOpen(true); setSidebarOpen(false); }}
                onLogout={logout}
                user={user}
                onClose={() => setSidebarOpen(false)}
                theme={theme}
                onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Sidebar
        className="hidden lg:flex"
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        company={company}
        pods={pods}
        activePod={activePod}
        projects={projects}
        activeProject={activeProject}
        activeView={activeView}
        onNewPod={() => { setSelectedPodForEdit(null); setPodDialogOpen(true); }}
        onEditPod={(pod) => { setSelectedPodForEdit(pod); setPodDialogOpen(true); }}
        onCompanySettings={() => setShowCompanySettings(true)}
        onProjectSelect={(p) => { setActiveProject(p); setActivePod(null); setActiveView('board'); setShowCompanySettings(false); }}
        onPodSelect={(pod) => { setActivePod(pod); setActiveView('board'); }}
        onNewProject={() => { setSelectedProjectForEdit(null); setProjectDialogOpen(true); }}
        onEditProject={(proj) => { setSelectedProjectForEdit(proj); setProjectDialogOpen(true); }}
        onDashboardSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('board'); setShowCompanySettings(false); }}
        onAnalyticsSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('analytics'); setShowCompanySettings(false); }}
        onEditProfile={() => setProfileSetupOpen(true)}
        onLogout={logout}
        user={user}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!companyLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !company ? (
          <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="absolute top-4 left-4 z-10 lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            <CreateCompanyPage
              onSave={async (data) => {
                setSelectedCompanyForEdit(null);
                await handleSaveCompany(data);
              }}
            />
          </div>
        ) : showCompanySettings && company ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <CompanySettingsPage
              company={company}
              users={companyUsers}
              allUsers={users}
              currentUserId={user.uid}
              onSave={async (data) => { await handleSaveCompany(data); }}
              onDelete={handleDeleteCompany}
              onBack={() => setShowCompanySettings(false)}
            />
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
              activeProjectId={activeProject?.id}
            />
          </div>
        ) : !activeProject ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="lg:hidden h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-4">
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Dashboard</h2>
            </div>
            <Dashboard
              company={company}
              projects={projects}
              tasks={allTasks}
              users={users}
              currentUserId={user.uid}
              onProjectSelect={(p) => { setActiveProject(p); setActivePod(null); setActiveView('board'); }}
              onEditProject={(proj) => { setSelectedProjectForEdit(proj); setProjectDialogOpen(true); }}
              onDeleteProject={handleDeleteProject}
              onArchiveProject={handleArchiveProject}
              onNewProject={() => { setSelectedProjectForEdit(null); setProjectDialogOpen(true); }}
              onUpdateCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
              onInvite={() => setInviteDialogOpen(true)}
              onCompanySettings={() => setShowCompanySettings(true)}
            />
          </div>
        ) : !activePod ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="lg:hidden h-14 border-b border-border flex items-center px-4 bg-card/50 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-3 h-8 w-8">
                <Menu className="w-4 h-4" />
              </Button>
              <span className="text-sm font-bold text-foreground truncate">{activeProject.name}</span>
            </div>
            <ProjectOverview
              project={activeProject}
              pods={pods}
              allTasks={allTasks}
              users={companyUsers}
              currentUserId={user.uid}
              onPodSelect={(pod) => { setActivePod(pod); setActiveView('board'); }}
              onNewPod={() => { setSelectedPodForEdit(null); setPodDialogOpen(true); }}
              onEditProject={() => { setSelectedProjectForEdit(activeProject); setProjectDialogOpen(true); }}
              onEditPod={(pod) => { setSelectedPodForEdit(pod); setPodDialogOpen(true); }}
            />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="border-b border-border/40 px-4 md:px-6 h-14 bg-card/50 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3">

                {/* Left: workspace name + meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden shrink-0 h-8 w-8">
                    <Menu className="w-4 h-4" />
                  </Button>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        onClick={() => setActivePod(null)}
                        className="text-muted-foreground/60 hover:text-muted-foreground text-xs font-medium truncate hidden sm:block transition-colors"
                      >
                        {activeProject.name}
                      </button>
                      <span className="text-muted-foreground/30 hidden sm:block text-xs">/</span>
                      <span className="font-bold text-foreground text-sm truncate leading-tight">
                        {activePod.name}
                      </span>
                      <button
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                        onClick={() => { setSelectedPodForEdit(activePod); setPodDialogOpen(true); }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/50 mt-0.5">
                      <span>{[...new Set(activePod.members ?? [])].length || 1} members</span>
                      <span className="opacity-40">·</span>
                      <span>{tasks.length} tasks</span>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-1 text-emerald-400/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <NotificationBell
                    notifications={notifications}
                    onNotificationsChange={setNotifications}
                    onTaskClick={(taskId) => {
                      const task = allTasks.find(t => t.id === taskId);
                      if (task) { setSelectedTask(task); setTaskDialogOpen(true); }
                    }}
                  />

                  {/* Mobile search toggle */}
                  <button
                    className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => setMobileSearchOpen(o => !o)}
                    aria-label="Search"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Search */}
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search tasks…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-10 h-9 w-44 bg-muted/40 border-border/30 text-sm placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-primary/40"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-mono pointer-events-none">/</kbd>
                  </div>

                  {/* Filters */}
                  <Popover>
                    <PopoverTrigger className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "h-9 gap-1.5 border-border/40 bg-muted/30 hover:bg-muted/60 font-medium text-muted-foreground hover:text-foreground rounded-xl"
                    })}>
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Filters</span>
                      {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length > 0 && (
                        <span className="bg-primary text-primary-foreground min-w-[16px] h-[16px] rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                          {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length}
                        </span>
                      )}
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Priority</h4>
                        <select className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterPriority || ''} onChange={(e) => setFilterPriority(e.target.value || null)}>
                          <option value="">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Assignee</h4>
                        <select className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterAssignee || ''} onChange={(e) => setFilterAssignee(e.target.value || null)}>
                          <option value="">Any Assignee</option>
                          {companyUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Creator</h4>
                        <select className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterCreator || ''} onChange={(e) => setFilterCreator(e.target.value || null)}>
                          <option value="">Any Creator</option>
                          {companyUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Due Date</h4>
                        <select className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          value={filterDueDate || ''} onChange={(e) => setFilterDueDate(e.target.value || null)}>
                          <option value="">Any Date</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      {activeView === 'board' && (
                        <div className="space-y-2 border-t border-border/40 pt-3">
                          <h4 className="font-semibold text-sm text-foreground">Swimlane</h4>
                          <div className="flex gap-1.5">
                            {([['Off', null], ['Assignee', 'assignee'], ['Priority', 'priority']] as [string, SwimlaneBy][]).map(([label, val]) => (
                              <button key={label} onClick={() => setSwimlaneBy(val)}
                                className={cn("flex-1 px-2 h-8 rounded-lg text-xs font-semibold transition-all border",
                                  swimlaneBy === val ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/40 hover:bg-muted/50")}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(filterPriority || filterAssignee || filterCreator || searchQuery || filterDueDate || swimlaneBy) && (
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setSearchQuery(''); setFilterPriority(null); setFilterAssignee(null); setFilterCreator(null); setFilterDueDate(null); setSwimlaneBy(null); }}>
                          Clear all filters
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>

                  {/* Board / Timeline */}
                  <div className="hidden md:flex items-center bg-muted/40 border border-border/30 rounded-xl p-1 gap-0.5">
                    {(['Board', 'Timeline'] as const).map(label => {
                      const val = label.toLowerCase() as 'board' | 'timeline';
                      return (
                        <button key={label} onClick={() => setActiveView(val)}
                          className={cn("px-2.5 h-7 rounded-lg text-xs font-semibold transition-all",
                            activeView === val ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/50 hover:text-muted-foreground")}>
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* More: bulk select, milestones, automations, saved filters */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 w-9 p-0 border-border/40 bg-muted/30 hover:bg-muted/60 rounded-xl hidden md:flex items-center justify-center" })}>
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl border-border bg-popover">
                      <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5"
                        onClick={() => { if (selectionModeActive) { setSelectionModeActive(false); setSelectedTaskIds(new Set()); } else setSelectionModeActive(true); }}>
                        <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectionModeActive ? 'Exit select mode' : 'Select tasks'}</span>
                        {selectionModeActive && selectedTaskIds.size > 0 && (
                          <span className="ml-auto text-xs text-primary font-bold">{selectedTaskIds.size}</span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5" onClick={() => setMilestoneDialogOpen(true)}>
                        <MilestoneIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Milestones</span>
                        {milestones.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{milestones.length}</span>}
                      </DropdownMenuItem>
                      {activeProject && (
                        <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5" onClick={() => setAutomationsDialogOpen(true)}>
                          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">Automations</span>
                        </DropdownMenuItem>
                      )}
                      {savedFilters.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          {savedFilters.map(sf => (
                            <DropdownMenuItem key={sf.id} className="rounded-lg h-9 cursor-pointer gap-2.5"
                              onClick={() => {
                                const f = sf.filters;
                                if (f.searchQuery !== undefined) setSearchQuery(f.searchQuery || '');
                                setFilterAssignee(f.filterAssignee ?? null);
                                setFilterCreator(f.filterCreator ?? null);
                                setFilterPriority(f.filterPriority ?? null);
                                setFilterDueDate(f.filterDueDate ?? null);
                                if (f.swimlaneBy !== undefined) setSwimlaneBy(f.swimlaneBy as SwimlaneBy ?? null);
                              }}>
                              <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium truncate">{sf.name}</span>
                              <button className="ml-auto text-muted-foreground/50 hover:text-rose-400 text-xs p-0.5"
                                onClick={e => { e.stopPropagation(); deleteSavedFilter(sf.id).then(() => setSavedFilters(prev => prev.filter(x => x.id !== sf.id))); }}>✕</button>
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {showFilterNameInput ? (
                        <div className="px-2 py-1.5 space-y-2" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            placeholder="Filter name…"
                            value={filterNameInput}
                            onChange={e => setFilterNameInput(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && filterNameInput.trim() && activeProject) {
                                setSavingFilter(true);
                                const sf = await createSavedFilter(activeProject.id, filterNameInput.trim(), { searchQuery, filterAssignee, filterCreator, filterPriority, filterDueDate, swimlaneBy });
                                setSavedFilters(prev => [...prev, sf]);
                                setSavingFilter(false);
                                setFilterNameInput('');
                                setShowFilterNameInput(false);
                              } else if (e.key === 'Escape') {
                                setFilterNameInput('');
                                setShowFilterNameInput(false);
                              }
                            }}
                            className="w-full h-8 px-2.5 rounded-lg bg-muted/50 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="flex gap-1.5">
                            <button
                              className="flex-1 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                              disabled={!filterNameInput.trim() || savingFilter}
                              onClick={async () => {
                                if (!filterNameInput.trim() || !activeProject) return;
                                setSavingFilter(true);
                                const sf = await createSavedFilter(activeProject.id, filterNameInput.trim(), { searchQuery, filterAssignee, filterCreator, filterPriority, filterDueDate, swimlaneBy });
                                setSavedFilters(prev => [...prev, sf]);
                                setSavingFilter(false);
                                setFilterNameInput('');
                                setShowFilterNameInput(false);
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="flex-1 h-7 rounded-lg bg-muted text-muted-foreground text-xs"
                              onClick={() => { setFilterNameInput(''); setShowFilterNameInput(false); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5"
                          onClick={() => setShowFilterNameInput(true)}>
                          <BookmarkPlus className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">Save filters</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* New task */}
                  <Button
                    className="h-9 px-4 font-bold text-primary-foreground shadow-md shadow-primary/25 border-0 hover:opacity-90 transition-opacity gap-1.5 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, oklch(0.67 0.30 285), oklch(0.60 0.26 310))' }}
                    onClick={() => { if (!activePod) return; setSelectedTask(null); setDefaultStatus('todo'); setTaskDialogOpen(true); }}
                  >
                    <span className="text-base leading-none font-light">+</span>
                    <span className="hidden sm:inline">New task</span>
                  </Button>
                </div>
            </div>

            {/* Mobile search bar */}
            {mobileSearchOpen && (
              <div className="md:hidden px-4 py-2 border-b border-border/40 bg-card/50 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    autoFocus
                    placeholder="Search tasks…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-muted/40 border-border/30 text-sm placeholder:text-muted-foreground/40 rounded-xl focus-visible:ring-primary/40 w-full"
                  />
                </div>
              </div>
            )}

            {/* Board or Timeline */}
            {activeView === 'timeline' ? (
              <GanttView
                tasks={filteredTasks}
                stages={activePod.stages?.length ? activePod.stages : DEFAULT_STAGES}
                users={companyUsers}
                onTaskClick={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
              />
            ) : (
              <TaskBoard
                tasks={filteredTasks}
                stages={activePod.stages?.length ? activePod.stages : DEFAULT_STAGES}
                users={companyUsers}
                milestones={milestones}
                selectedTaskIds={selectedTaskIds}
                selectionMode={selectionModeActive}
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
                    .then(() => executeAutomations(activeProject.id, taskId, { status: newStatus }))
                    .catch(() => {
                      if (prevStatus !== undefined) applyStatus(prevStatus);
                    });
                }}
                onSelectionChange={setSelectedTaskIds}
                onInlineEdit={async (taskId, newTitle) => {
                  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
                  await updateTask(activeProject.id, taskId, { title: newTitle });
                }}
              />
            )}
          </>
        )}

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
          activeProjectId={activeProject?.id}
          defaultStatus={defaultStatus}
          users={companyUsers}
          stages={activePod?.stages?.length ? activePod.stages : DEFAULT_STAGES}
          milestones={milestones}
          customFieldDefs={customFieldDefs}
          templates={taskTemplates}
          allTasks={allTasks}
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

        {company && (
          <InviteDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            company={company}
            allUsers={users}
            onInvite={handleInviteMembers}
          />
        )}

        <PodDialog
          open={podDialogOpen}
          onOpenChange={(open) => { setPodDialogOpen(open); if (!open) setSelectedPodForEdit(null); }}
          pod={selectedPodForEdit}
          users={companyUsers}
          currentUserId={user.uid}
          onSave={handleSavePod}
          onDelete={handleDeletePod}
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

        {/* Automations Dialog */}
        <AutomationsDialog
          open={automationsDialogOpen}
          onOpenChange={setAutomationsDialogOpen}
          projectId={activeProject?.id ?? ''}
          automations={automations}
          onAutomationsChange={setAutomations}
          users={companyUsers}
          stages={activePod?.stages?.length ? activePod.stages : DEFAULT_STAGES}
        />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          open={shortcutsHelpOpen}
          onOpenChange={setShortcutsHelpOpen}
        />

        <Toaster richColors position="bottom-right" />

        {/* Bulk action bar */}
        <BulkActionBar
          selectedIds={selectedTaskIds}
          onClear={() => setSelectedTaskIds(new Set())}
          stages={activePod?.stages?.length ? activePod.stages : DEFAULT_STAGES}
          users={companyUsers}
          milestones={milestones}
          onMoveToStage={async (status) => {
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, status } : x));
            bulkUpdateTasks(ids, { status }).catch(() => { setTasks(prev); toast.error('Bulk update failed'); });
            setSelectedTaskIds(new Set());
          }}
          onAssign={async (assigneeId) => {
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, assigneeId: assigneeId ?? undefined } : x));
            bulkUpdateTasks(ids, { assigneeId: assigneeId ?? undefined }).catch(() => { setTasks(prev); toast.error('Bulk update failed'); });
            setSelectedTaskIds(new Set());
          }}
          onSetPriority={async (priority: TaskPriority) => {
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, priority } : x));
            bulkUpdateTasks(ids, { priority }).catch(() => { setTasks(prev); toast.error('Bulk update failed'); });
            setSelectedTaskIds(new Set());
          }}
          onSetMilestone={async (milestoneId) => {
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, milestoneId: milestoneId ?? undefined } : x));
            bulkUpdateTasks(ids, { milestoneId: milestoneId ?? undefined }).catch(() => { setTasks(prev); toast.error('Bulk update failed'); });
            setSelectedTaskIds(new Set());
          }}
          onDelete={async () => {
            const ids = Array.from(selectedTaskIds);
            const prevTasks = tasks;
            const prevAll = allTasks;
            setTasks(t => t.filter(x => !ids.includes(x.id)));
            setAllTasks(t => t.filter(x => !ids.includes(x.id)));
            bulkDeleteTasks(ids)
              .then(() => toast.success(`${ids.length} tasks deleted`))
              .catch(() => { setTasks(prevTasks); setAllTasks(prevAll); toast.error('Bulk delete failed'); });
            setSelectedTaskIds(new Set());
          }}
        />
      </main>
    </div>
  );
}
