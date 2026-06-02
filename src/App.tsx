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
  fetchSprints,
  fetchGoals,
} from './services/api';
import { useServerEvents } from './hooks/useServerEvents';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Task, TaskStatus, TaskPriority, UserProfile, Company, Pod, DEFAULT_STAGES, Stage, Milestone, CustomFieldDefinition, TaskTemplate, Notification, SavedFilter, AutomationRule, Subtask, Sprint, Goal } from './types';
import { getClosedStageId } from '@/lib/utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Advance a YYYY-MM-DD date string by one recurrence interval. */
function advanceDate(dateStr: string | undefined, rule: 'daily' | 'weekly' | 'monthly'): string {
  const d = dateStr ? new Date(`${dateStr.split('T')[0]}T00:00:00`) : new Date();
  if (rule === 'daily') d.setDate(d.getDate() + 1);
  else if (rule === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
import { MilestoneDialog } from './components/MilestoneDialog';
import { BulkActionBar } from './components/BulkActionBar';
import { NotificationBell } from './components/NotificationBell';
const GanttView = React.lazy(() => import('./components/GanttView').then(m => ({ default: m.GanttView })));
import { AutomationsDialog } from './components/AutomationsDialog';
import { PodDialog } from './components/PodDialog';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { Logo } from './components/Logo';
import { MyWorkView } from './components/MyWorkView';
import { CalendarView } from './components/CalendarView';
const RoadmapView = React.lazy(() => import('./components/RoadmapView').then(m => ({ default: m.RoadmapView })));
import { SprintDialog } from './components/SprintDialog';
import { GoalDialog } from './components/GoalDialog';
import { IntakeFormDialog } from './components/IntakeFormDialog';
import { IntakeFormPage } from './components/IntakeFormPage';
import { Hash, Filter, Search, Menu, Settings, Milestone as MilestoneIcon, CheckSquare, Zap, Bookmark, BookmarkPlus, MoreHorizontal, Lock, Target, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog as UiDialog, DialogContent as UiDialogContent, DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle, DialogDescription as UiDialogDescription, DialogFooter as UiDialogFooter,
} from '@/components/ui/dialog';
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

  // Resolve the "closed/done" stage per task. Stages are pod-scoped (with a
  // project fallback) and the closed stage is the LAST stage — it is not always
  // literally 'closed' for custom-stage pods. Use this everywhere instead of
  // comparing status === 'closed'.
  const closedStageByPod = React.useMemo(
    () => new Map(pods.map(p => [p.id, getClosedStageId(p.stages)])),
    [pods],
  );
  const closedStageByProject = React.useMemo(
    () => new Map(projects.map(p => [p.id, getClosedStageId(p.stages)])),
    [projects],
  );
  const isTaskClosed = React.useCallback((task: Task) => {
    const closed =
      (task.podId ? closedStageByPod.get(task.podId) : undefined) ??
      closedStageByProject.get(task.projectId) ??
      'closed';
    return task.status === closed;
  }, [closedStageByPod, closedStageByProject]);

  // When a recurring task is closed, spawn the next instance (the server-side
  // stub never did). Resets to the pod's first stage with an advanced due date.
  const spawnRecurrenceIfNeeded = React.useCallback(async (task: Task) => {
    if (!task.recurrenceRule || !task.podId || !task.projectId) return;
    const pod = pods.find(p => p.id === task.podId);
    const firstStage = pod?.stages?.[0]?.id ?? DEFAULT_STAGES[0].id;
    try {
      const newId = await createTask(task.podId, task.projectId, {
        title: task.title,
        description: task.description,
        status: firstStage as TaskStatus,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: advanceDate(task.dueDate, task.recurrenceRule),
        tags: task.tags,
        recurrenceRule: task.recurrenceRule,
        recurrenceParentId: task.recurrenceParentId ?? task.id,
        milestoneId: task.milestoneId,
      });
      if (task.projectId === activeProject?.id) {
        fetchPodTasks(task.podId).then(setTasks).catch(() => {});
      }
      void newId;
      toast.success('Next recurring task created');
    } catch {
      toast.error('Could not create the next recurring task');
    }
  }, [pods, activeProject]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filterAssignee, setFilterAssignee] = React.useState<string | null>(null);
  const [filterCreator, setFilterCreator] = React.useState<string | null>(null);
  const [filterPriority, setFilterPriority] = React.useState<string | null>(null);
  const [filterDueDate, setFilterDueDate] = React.useState<string | null>(null);

  // Stable "today" reference that updates once per minute so overdue/today filters stay fresh.
  const [todayTs, setTodayTs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setTodayTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // View state
  const [activeView, setActiveView] = React.useState<'board' | 'analytics' | 'timeline' | 'calendar'>('board');
  const [activeGlobalView, setActiveGlobalView] = React.useState<'my-work' | 'roadmap' | null>(null);

  // New feature states
  const [swimlaneBy, setSwimlaneBy] = React.useState<SwimlaneBy>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set());
  const [selectionModeActive, setSelectionModeActive] = React.useState(false);
  const [bulkLoading, setBulkLoading] = React.useState(false);
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
  const automationsRef = React.useRef<AutomationRule[]>([]);
  React.useEffect(() => { automationsRef.current = automations; }, [automations]);
  const [automationsDialogOpen, setAutomationsDialogOpen] = React.useState(false);

  // New differentiator features state
  const [sprints, setSprints] = React.useState<Sprint[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [allMilestones, setAllMilestones] = React.useState<Milestone[]>([]);
  const [sprintDialogOpen, setSprintDialogOpen] = React.useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = React.useState(false);
  const [intakeFormDialogOpen, setIntakeFormDialogOpen] = React.useState(false);

  // Pinned tasks stored in localStorage per user
  const [pinnedTaskIds, setPinnedTaskIds] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('hf-pinned-tasks');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const handlePinToggle = React.useCallback((taskId: string) => {
    setPinnedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      try { localStorage.setItem('hf-pinned-tasks', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, []);

  // Check for intake form token in URL
  const intakeToken = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('intake');
  }, []);
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
  const [defaultDueDate, setDefaultDueDate] = React.useState('');
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = React.useState<Project | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = React.useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = React.useState<Company | null>(null);
  const [showCompanySettings, setShowCompanySettings] = React.useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = React.useState(false);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = React.useState(false);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const appUser = session?.user ? toAppUser(session.user) : null;
      setUser(appUser);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryOpen(true);
        return;
      }
      if (appUser) {
        ensureUserProfile();
        // Show profile setup for new sign-ups that haven't set a name yet
        if (event === 'SIGNED_IN' && !session?.user?.user_metadata?.full_name && !session?.user?.user_metadata?.name) {
          setProfileSetupOpen(true);
        }
      }
      if (event === 'TOKEN_REFRESHED' && !session) {
        toast.error('Your session has expired. Please sign in again.');
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
    try {
      const comps = await fetchCompanies();
      setCompany(comps.length > 0 ? comps[0] : null);
    } catch {
      toast.error('Could not load your workspace. Check your connection and reload.');
    } finally {
      setCompanyLoaded(true);
    }
  }, [user]);

  const loadPods = React.useCallback(async (projectId: string) => {
    const podList = await fetchPods(projectId).catch(() => [] as Pod[]);
    // Merge: replace only pods belonging to this project, keep others
    setPods(prev => [...prev.filter(p => p.projectId !== projectId), ...podList]);
    // Keep activePod in sync so stage changes from other users propagate
    setActivePod(prev => {
      if (!prev) return prev;
      return podList.find(p => p.id === prev.id) ?? prev;
    });
  }, []);

  const loadProjects = React.useCallback(async () => {
    if (!user || !company) return;
    let projs: Project[];
    try {
      projs = await fetchProjects(company.id);
    } catch {
      toast.error('Could not load projects.');
      return;
    }
    setProjects(projs);
    if (activeProject && !projs.find(p => p.id === activeProject.id)) {
      setActiveProject(null);
    }
  }, [user, company, activeProject]);

  const loadPodData = React.useCallback(async (podId: string) => {
    try {
      setTasks(await fetchPodTasks(podId));
    } catch {
      toast.error('Could not load tasks for this pod.');
    }
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
      // Don't clear pods — sidebar needs them for navigation
      setActivePod(null);
      setTasks([]);
      setMilestones([]);
      setCustomFieldDefs([]);
      setTaskTemplates([]);
      setSelectedTaskIds(new Set());
      setSelectedTask(null);
      setTaskDialogOpen(false);
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

  // Keep sidebar pods populated regardless of active view
  React.useEffect(() => {
    if (projects.length === 0) { setPods([]); return; }
    Promise.all(projects.map(p => fetchPods(p.id).catch(() => [] as Pod[]))).then(results => {
      setPods(results.flat());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map(p => p.id).join(',')]);

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
  }, [searchQuery]); // searchQuery is the correct dep here

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

  // Load sprints when active project changes
  React.useEffect(() => {
    if (!activeProject) { setSprints([]); return; }
    fetchSprints(activeProject.id).then(setSprints).catch(() => {});
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load goals when company changes
  React.useEffect(() => {
    if (!company) { setGoals([]); return; }
    fetchGoals(company.id).then(setGoals).catch(() => {});
  }, [company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load all milestones for roadmap view
  React.useEffect(() => {
    if (projects.length === 0) { setAllMilestones([]); return; }
    Promise.all(projects.map(p => fetchMilestones(p.id).catch(() => [] as Milestone[])))
      .then(results => setAllMilestones(results.flat()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map(p => p.id).join(',')]);

  React.useEffect(() => {
    if (!activeProject) { setAutomations([]); return; }
    fetchAutomations(activeProject.id).then(rules => {
      setAutomations(rules);
      // Warn about automations that reference a user who's no longer a company member
      const memberIds = new Set(companyUserIds);
      rules.forEach(rule => {
        if (rule.actionType === 'set_assignee' && rule.actionValue && !memberIds.has(rule.actionValue)) {
          toast.warning(`Automation "${rule.name}" assigns to a user who is no longer a member.`);
        }
      });
    }).catch(() => {});
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

  // Refresh task data when tab regains focus only after extended absence (>60s).
  // Realtime handles in-session updates; this is a fallback for missed events.
  const hiddenAtRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (hiddenMs > 60_000 && activePod) {
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
    } else if (type === 'notifications:changed') {
      fetchNotifications().then(setNotifications).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activePodId]));

  useKeyboardShortcuts({
    onNewTask: () => {
      if (!activePod) return;
      setSelectedTask(null);
      setDefaultStatus('todo');
      setDefaultDueDate('');
      setTaskDialogOpen(true);
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onShowShortcuts: () => setShortcutsHelpOpen(true),
    onGoTimeline: () => { if (activePod) setActiveView('timeline'); },
    onGoBoard: () => { setActiveView('board'); setActiveGlobalView(null); },
    onGoAnalytics: () => { setActiveView('analytics'); setActiveGlobalView(null); },
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

  const companyUserIds = React.useMemo(
    () => (company ? [...new Set([company.ownerId, ...(company.memberIds ?? []), ...(company.viewerIds ?? [])])] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [company?.ownerId, company?.memberIds?.join(','), company?.viewerIds?.join(',')],
  );

  const companyUsers = React.useMemo(() => {
    return users.filter(u => companyUserIds.includes(u.uid))
      .sort((a, b) => (a.uid === company?.ownerId ? -1 : b.uid === company?.ownerId ? 1 : 0));
  }, [users, companyUserIds, company?.ownerId]);

  const executeAutomations = React.useCallback(async (
    projectId: string,
    taskId: string,
    updates: Partial<Task>,
  ) => {
    const rules = automationsRef.current.filter(r => r.isActive && r.projectId === projectId);
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
      } else if (rule.actionType === 'set_assignee' && rule.actionValue) {
        actionUpdates.assigneeId = rule.actionValue;
      }

      if (Object.keys(actionUpdates).length > 0) {
        // Snapshot the affected fields so we can roll back if the write fails.
        const prevFields: Partial<Task> = {};
        setTasks(prev => prev.map(t => {
          if (t.id !== taskId) return t;
          (Object.keys(actionUpdates) as (keyof Task)[]).forEach(k => { (prevFields as any)[k] = t[k]; });
          return { ...t, ...actionUpdates };
        }));
        setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...actionUpdates } : t));
        updateTask(projectId, taskId, actionUpdates).catch(() => {
          // Roll back the optimistic automation update on failure.
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...prevFields } : t));
          setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...prevFields } : t));
          toast.error('Automation could not be applied');
        });
      }
    }
  }, []);

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
      const prevTasks = tasks;
      const prevAllTasks = allTasks;
      const updatedTask = { ...selectedTask, ...taskData };
      const becameClosed = isTaskClosed(updatedTask) && !isTaskClosed(selectedTask);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      try {
        await updateTask(targetProjectId, selectedTask.id, taskData);
        toast.success('Task updated');
        addActivityLog(selectedTask.id, targetProjectId, 'task_updated').catch(() => {});
        executeAutomations(targetProjectId, selectedTask.id, taskData);
        if (becameClosed) spawnRecurrenceIfNeeded(updatedTask);
      } catch {
        setTasks(prevTasks);
        setAllTasks(prevAllTasks);
        toast.error('Failed to save task');
      }
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
      } catch {
        setTasks(prev => prev.filter(t => t.id !== tempId));
        setAllTasks(prev => prev.filter(t => t.id !== tempId));
        toast.error('Failed to create task');
      }
    }
  };

  const handleDuplicateTask = async (task: Task) => {
    const targetPodId = task.podId ?? activePod?.id;
    const targetProjectId = task.projectId ?? activeProject?.id;
    if (!targetPodId || !targetProjectId) return;
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = task;
    const dupeData: Partial<Task> = { ...rest, title: `${task.title} (Copy)` };
    const tempId = `temp-dup-${Date.now()}`;
    const tempTask: Task = { ...task, id: tempId, title: dupeData.title! };
    setTasks(prev => [...prev, tempTask]);
    setAllTasks(prev => [...prev, tempTask]);
    try {
      const newId = await createTask(targetPodId, targetProjectId, dupeData);
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
      setAllTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: newId } : t));
      toast.success('Task duplicated');
    } catch {
      setTasks(prev => prev.filter(t => t.id !== tempId));
      setAllTasks(prev => prev.filter(t => t.id !== tempId));
      toast.error('Failed to duplicate task');
    }
  };

  const handleDeleteTask = async (taskId: string, projectId?: string) => {
    if (isViewer) { toast.error('Viewers cannot delete tasks'); return; }
    const targetProjectId = projectId ?? selectedTask?.projectId ?? activeProject?.id;
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
    const todayMidnight = new Date(todayTs);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayStr = todayMidnight.toISOString().split('T')[0];

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
            matchesDate = new Date(taskDate) < todayMidnight;
          } else if (filterDate === 'today') {
            matchesDate = taskDate === todayStr;
          } else if (filterDate === 'week') {
            const weekEnd = new Date(todayMidnight.getTime() + 7 * 86400000);
            const taskD = new Date(taskDate);
            matchesDate = taskD >= todayMidnight && taskD <= weekEnd;
          }
        }
      }

      return matchesSearch && matchesAssignee && matchesCreator && matchesPriority && matchesDate;
    });
  }, [tasks, debouncedSearch, filterAssignee, filterCreator, filterPriority, filterDueDate, todayTs]);

  // Public intake form page — render without auth
  if (intakeToken) {
    return <IntakeFormPage token={intakeToken} />;
  }

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
                activeGlobalView={activeGlobalView}
                onNewPod={() => { setSelectedPodForEdit(null); setPodDialogOpen(true); setSidebarOpen(false); }}
                onEditPod={(pod) => { setSelectedPodForEdit(pod); setPodDialogOpen(true); setSidebarOpen(false); }}
                onCompanySettings={() => { setShowCompanySettings(true); setSidebarOpen(false); }}
                onProjectSelect={(p) => { setActiveProject(p); setActivePod(null); setActiveView('board'); setActiveGlobalView(null); setShowCompanySettings(false); setSidebarOpen(false); }}
                onPodSelect={(pod) => { setActivePod(pod); setActiveView('board'); setActiveGlobalView(null); setSidebarOpen(false); }}
                onNewProject={() => { setSelectedProjectForEdit(null); setProjectDialogOpen(true); setSidebarOpen(false); }}
                onEditProject={(proj) => { setSelectedProjectForEdit(proj); setProjectDialogOpen(true); setSidebarOpen(false); }}
                onDashboardSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('board'); setActiveGlobalView(null); setShowCompanySettings(false); setSidebarOpen(false); }}
                onAnalyticsSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('analytics'); setActiveGlobalView(null); setShowCompanySettings(false); setSidebarOpen(false); }}
                onMyWorkSelect={() => { setActiveGlobalView('my-work'); setShowCompanySettings(false); setSidebarOpen(false); }}
                onRoadmapSelect={() => { setActiveGlobalView('roadmap'); setShowCompanySettings(false); setSidebarOpen(false); }}
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
        activeGlobalView={activeGlobalView}
        onNewPod={() => { setSelectedPodForEdit(null); setPodDialogOpen(true); }}
        onEditPod={(pod) => { setSelectedPodForEdit(pod); setPodDialogOpen(true); }}
        onCompanySettings={() => setShowCompanySettings(true)}
        onProjectSelect={(p) => { setActiveProject(p); setActivePod(null); setActiveView('board'); setActiveGlobalView(null); setShowCompanySettings(false); }}
        onPodSelect={(pod) => { setActivePod(pod); setActiveView('board'); setActiveGlobalView(null); }}
        onNewProject={() => { setSelectedProjectForEdit(null); setProjectDialogOpen(true); }}
        onEditProject={(proj) => { setSelectedProjectForEdit(proj); setProjectDialogOpen(true); }}
        onDashboardSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('board'); setActiveGlobalView(null); setShowCompanySettings(false); }}
        onAnalyticsSelect={() => { setActiveProject(null); setActivePod(null); setActiveView('analytics'); setActiveGlobalView(null); setShowCompanySettings(false); }}
        onMyWorkSelect={() => { setActiveGlobalView('my-work'); setShowCompanySettings(false); }}
        onRoadmapSelect={() => { setActiveGlobalView('roadmap'); setShowCompanySettings(false); }}
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
        ) : activeGlobalView === 'my-work' ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="lg:hidden h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-4">
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground">My Work</h2>
            </div>
            <MyWorkView
              allTasks={allTasks}
              projects={projects}
              users={users}
              milestones={allMilestones}
              currentUserId={user.uid}
              pinnedTaskIds={pinnedTaskIds}
              isClosed={isTaskClosed}
              onTaskClick={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
              onPinToggle={handlePinToggle}
            />
          </div>
        ) : activeGlobalView === 'roadmap' ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="lg:hidden h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-4">
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Roadmap</h2>
            </div>
            <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-sm">Loading…</div>}>
              <RoadmapView
                projects={projects}
                allMilestones={allMilestones}
                allTasks={allTasks}
                isClosed={isTaskClosed}
              />
            </React.Suspense>
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
            <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-sm">Loading…</div>}>
              <AnalyticsDashboard
                tasks={allTasks}
                projects={projects}
                users={users}
                currentUserId={user.uid}
                activeProjectId={activeProject?.id}
              />
            </React.Suspense>
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
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm shrink-0">
              {/* Main row */}
              <div className="flex items-center h-14 px-4 md:px-5 gap-2">

                {/* Mobile hamburger */}
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden shrink-0 h-8 w-8 mr-1">
                  <Menu className="w-4 h-4" />
                </Button>

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1.5 min-w-0 mr-2">
                  <button
                    onClick={() => setActivePod(null)}
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors truncate max-w-[110px]"
                    title={activeProject.name}
                  >
                    {activeProject.name}
                  </button>
                  <span className="hidden sm:block text-muted-foreground/25 text-xs select-none">/</span>
                  <span className="font-semibold text-foreground text-sm truncate max-w-[140px] leading-none" title={activePod.name}>
                    {activePod.name}
                  </span>
                  <button
                    title="Pod settings"
                    className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
                    onClick={() => { setSelectedPodForEdit(activePod); setPodDialogOpen(true); }}
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>

                {/* ── Meta badges (desktop) ── */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground/50 bg-muted/40 px-2 py-0.5 rounded-full">
                    {tasks.length} tasks
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400/70 bg-emerald-400/8 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* ── Spacer ── */}
                <div className="flex-1" />

                {/* ── Search (desktop) ── */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tasks…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-8 w-48 bg-muted/40 border-border/30 text-sm placeholder:text-muted-foreground/40 rounded-lg focus-visible:ring-primary/40"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors text-xs leading-none"
                    >✕</button>
                  ) : (
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-mono pointer-events-none">/</kbd>
                  )}
                </div>

                {/* ── Mobile search toggle ── */}
                <button
                  className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setMobileSearchOpen(o => !o)}
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* ── Divider ── */}
                <div className="hidden md:block w-px h-5 bg-border/50 mx-1" />

                {/* ── Board / Timeline / Calendar tab ── */}
                <div className="hidden md:flex items-center bg-muted/50 border border-border/30 rounded-lg p-0.5 gap-0.5">
                  {(['Board', 'Timeline', 'Calendar'] as const).map(label => {
                    const val = label.toLowerCase() as 'board' | 'timeline' | 'calendar';
                    return (
                      <button key={label} onClick={() => setActiveView(val)}
                        className={cn(
                          "px-3 h-7 rounded-md text-xs font-semibold transition-all",
                          activeView === val
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground/60 hover:text-muted-foreground"
                        )}>
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* ── Filter ── */}
                <Popover>
                  <PopoverTrigger className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: cn(
                      "h-8 gap-1.5 border-border/40 bg-muted/30 hover:bg-muted/60 font-medium text-muted-foreground hover:text-foreground rounded-lg px-3",
                      [filterPriority, filterAssignee, filterCreator, filterDueDate].some(Boolean) && "border-primary/40 text-primary"
                    )
                  })}>
                    <Filter className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Filter</span>
                    {[filterPriority, filterAssignee, filterCreator, filterDueDate].filter(Boolean).length > 0 && (
                      <span className="bg-primary text-primary-foreground min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center px-1">
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

                {/* ── More menu ── */}
                <DropdownMenu>
                  <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 w-8 p-0 border-border/40 bg-muted/30 hover:bg-muted/60 rounded-lg hidden md:flex items-center justify-center" })}>
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
                    {activeProject && (
                      <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5" onClick={() => setSprintDialogOpen(true)}>
                        <Zap className="w-3.5 h-3.5 text-primary/70" />
                        <span className="text-sm font-medium">Sprints</span>
                        {sprints.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{sprints.filter(s => s.status === 'active').length} active</span>}
                      </DropdownMenuItem>
                    )}
                    {company && (
                      <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5" onClick={() => setGoalDialogOpen(true)}>
                        <Target className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Goals & OKRs</span>
                        {goals.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{goals.filter(g => g.status === 'active').length} active</span>}
                      </DropdownMenuItem>
                    )}
                    {activeProject && (
                      <DropdownMenuItem className="rounded-lg h-9 cursor-pointer gap-2.5" onClick={() => setIntakeFormDialogOpen(true)}>
                        <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Intake Forms</span>
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

                {/* ── Divider ── */}
                <div className="w-px h-5 bg-border/50 mx-1 hidden md:block" />

                {/* ── Notifications ── */}
                <NotificationBell
                  notifications={notifications}
                  onNotificationsChange={setNotifications}
                  onTaskClick={(taskId) => {
                    const task = allTasks.find(t => t.id === taskId);
                    if (task) { setSelectedTask(task); setTaskDialogOpen(true); }
                  }}
                />

                {/* ── New task ── */}
                {!isViewer && (
                  <Button
                    className="h-8 px-3 font-semibold text-primary-foreground shadow-md shadow-primary/20 border-0 hover:opacity-90 transition-opacity gap-1.5 rounded-lg text-xs"
                    style={{ background: 'linear-gradient(135deg, oklch(0.67 0.30 285), oklch(0.60 0.26 310))' }}
                    onClick={() => { if (!activePod) return; setSelectedTask(null); setDefaultStatus('todo'); setDefaultDueDate(''); setTaskDialogOpen(true); }}
                  >
                    <span className="text-sm leading-none font-light">+</span>
                    <span className="hidden sm:inline">New task</span>
                  </Button>
                )}
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

            {/* Board, Timeline or Calendar */}
            {activeView === 'timeline' ? (
              <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-sm">Loading…</div>}>
                <GanttView
                  tasks={filteredTasks}
                  stages={activePod.stages?.length ? activePod.stages : DEFAULT_STAGES}
                  users={companyUsers}
                  onTaskClick={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
                />
              </React.Suspense>
            ) : activeView === 'calendar' ? (
              <CalendarView
                tasks={filteredTasks}
                projects={projects}
                isClosed={isTaskClosed}
                onTaskClick={(task) => { setSelectedTask(task); setTaskDialogOpen(true); }}
                onNewTask={(dueDate) => {
                  if (!activePod) return;
                  setSelectedTask(null);
                  setDefaultStatus('todo');
                  setDefaultDueDate(dueDate);
                  setTaskDialogOpen(true);
                }}
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
                isViewer={isViewer}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDialogOpen(true);
                }}
                onAddTask={(status) => {
                  setSelectedTask(null);
                  setDefaultStatus(status);
                  setDefaultDueDate('');
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
                  const becameClosed = task && prevStatus !== newStatus &&
                    isTaskClosed({ ...task, status: newStatus as TaskStatus }) &&
                    !isTaskClosed(task);
                  updateTask(activeProject.id, taskId, { status: newStatus })
                    .then(() => {
                      executeAutomations(activeProject.id, taskId, { status: newStatus });
                      if (becameClosed && task) spawnRecurrenceIfNeeded({ ...task, status: newStatus as TaskStatus });
                    })
                    .catch(() => {
                      if (prevStatus !== undefined) applyStatus(prevStatus);
                      toast.error('Failed to update status');
                    });
                }}
                onSelectionChange={setSelectedTaskIds}
                onInlineEdit={async (taskId, newTitle) => {
                  const prev = tasks.find(t => t.id === taskId)?.title;
                  setTasks(pv => pv.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
                  setAllTasks(pv => pv.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
                  updateTask(activeProject.id, taskId, { title: newTitle }).catch(() => {
                    if (prev !== undefined) {
                      setTasks(pv => pv.map(t => t.id === taskId ? { ...t, title: prev } : t));
                      setAllTasks(pv => pv.map(t => t.id === taskId ? { ...t, title: prev } : t));
                    }
                    toast.error('Failed to rename task');
                  });
                }}
                onSwimlaneChange={(taskId, newAssigneeId, newPriority) => {
                  const task = tasks.find(t => t.id === taskId);
                  const updates: Partial<Task> = {};
                  if (swimlaneBy === 'assignee') updates.assigneeId = newAssigneeId ?? undefined;
                  else if (swimlaneBy === 'priority' && newPriority) updates.priority = newPriority;
                  if (!Object.keys(updates).length) return;
                  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                  setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                  updateTask(activeProject.id, taskId, updates).catch(() => {
                    if (task) {
                      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
                      setAllTasks(prev => prev.map(t => t.id === taskId ? task : t));
                    }
                    toast.error('Failed to update task');
                  });
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
          defaultDueDate={defaultDueDate}
          users={companyUsers}
          stages={activePod?.stages?.length ? activePod.stages : DEFAULT_STAGES}
          milestones={milestones}
          customFieldDefs={customFieldDefs}
          templates={taskTemplates}
          allTasks={allTasks}
          sprints={sprints}
          currentUserId={user.uid}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
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
            onMilestoneDeleted={(milestoneId) => {
              setMilestones(prev => prev.filter(m => m.id !== milestoneId));
              setTasks(prev => prev.map(t => t.milestoneId === milestoneId ? { ...t, milestoneId: undefined } : t));
              setAllTasks(prev => prev.map(t => t.milestoneId === milestoneId ? { ...t, milestoneId: undefined } : t));
            }}
            onMilestonesChanged={() => {
              if (activeProject) fetchMilestones(activeProject.id).then(setMilestones).catch(() => {});
            }}
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

        {/* Sprint Dialog */}
        {activeProject && (
          <SprintDialog
            open={sprintDialogOpen}
            onOpenChange={setSprintDialogOpen}
            projectId={activeProject.id}
            sprints={sprints}
            tasks={tasks}
            isClosed={isTaskClosed}
            onSprintsChange={setSprints}
            onAssignTaskToSprint={async (taskId, sprintId) => {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprintId: sprintId ?? undefined } : t));
              setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprintId: sprintId ?? undefined } : t));
              updateTask(activeProject.id, taskId, { sprintId: sprintId ?? undefined }).catch(() => {});
            }}
          />
        )}

        {/* Goal Dialog */}
        {company && (
          <GoalDialog
            open={goalDialogOpen}
            onOpenChange={setGoalDialogOpen}
            companyId={company.id}
            projects={projects}
            goals={goals}
            currentUserId={user.uid}
            onGoalsChange={setGoals}
          />
        )}

        {/* Intake Form Dialog */}
        {activeProject && (
          <IntakeFormDialog
            open={intakeFormDialogOpen}
            onOpenChange={setIntakeFormDialogOpen}
            projectId={activeProject.id}
            pods={pods.filter(p => p.projectId === activeProject.id)}
          />
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          open={shortcutsHelpOpen}
          onOpenChange={setShortcutsHelpOpen}
        />

        {/* Password Recovery Dialog */}
        <PasswordRecoveryDialog
          open={passwordRecoveryOpen}
          onClose={() => setPasswordRecoveryOpen(false)}
        />

        <Toaster richColors position="bottom-right" />

        {/* Bulk action bar */}
        <BulkActionBar
          selectedIds={selectedTaskIds}
          loading={bulkLoading}
          isViewer={isViewer}
          onClear={() => { setSelectedTaskIds(new Set()); setBulkLoading(false); }}
          stages={activePod?.stages?.length ? activePod.stages : DEFAULT_STAGES}
          users={companyUsers}
          milestones={milestones}
          onMoveToStage={async (status) => {
            if (isViewer) { toast.error('Viewers cannot edit tasks'); return; }
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            const prevAll = allTasks;
            setBulkLoading(true);
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, status } : x));
            setAllTasks(t => t.map(x => ids.includes(x.id) ? { ...x, status } : x));
            bulkUpdateTasks(ids, { status })
              .catch(() => { setTasks(prev); setAllTasks(prevAll); toast.error('Bulk update failed'); })
              .finally(() => { setBulkLoading(false); setSelectedTaskIds(new Set()); });
          }}
          onAssign={async (assigneeId) => {
            if (isViewer) { toast.error('Viewers cannot edit tasks'); return; }
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            const prevAll = allTasks;
            setBulkLoading(true);
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, assigneeId: assigneeId ?? undefined } : x));
            setAllTasks(t => t.map(x => ids.includes(x.id) ? { ...x, assigneeId: assigneeId ?? undefined } : x));
            bulkUpdateTasks(ids, { assigneeId: assigneeId ?? undefined })
              .catch(() => { setTasks(prev); setAllTasks(prevAll); toast.error('Bulk update failed'); })
              .finally(() => { setBulkLoading(false); setSelectedTaskIds(new Set()); });
          }}
          onSetPriority={async (priority: TaskPriority) => {
            if (isViewer) { toast.error('Viewers cannot edit tasks'); return; }
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            const prevAll = allTasks;
            setBulkLoading(true);
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, priority } : x));
            setAllTasks(t => t.map(x => ids.includes(x.id) ? { ...x, priority } : x));
            bulkUpdateTasks(ids, { priority })
              .catch(() => { setTasks(prev); setAllTasks(prevAll); toast.error('Bulk update failed'); })
              .finally(() => { setBulkLoading(false); setSelectedTaskIds(new Set()); });
          }}
          onSetMilestone={async (milestoneId) => {
            if (isViewer) { toast.error('Viewers cannot edit tasks'); return; }
            const ids = Array.from(selectedTaskIds);
            const prev = tasks;
            const prevAll = allTasks;
            setBulkLoading(true);
            setTasks(t => t.map(x => ids.includes(x.id) ? { ...x, milestoneId: milestoneId ?? undefined } : x));
            setAllTasks(t => t.map(x => ids.includes(x.id) ? { ...x, milestoneId: milestoneId ?? undefined } : x));
            bulkUpdateTasks(ids, { milestoneId: milestoneId ?? undefined })
              .catch(() => { setTasks(prev); setAllTasks(prevAll); toast.error('Bulk update failed'); })
              .finally(() => { setBulkLoading(false); setSelectedTaskIds(new Set()); });
          }}
          onDelete={async () => {
            if (isViewer) { toast.error('Viewers cannot delete tasks'); return; }
            const ids = Array.from(selectedTaskIds);
            const prevTasks = tasks;
            const prevAll = allTasks;
            setBulkLoading(true);
            setTasks(t => t.filter(x => !ids.includes(x.id)));
            setAllTasks(t => t.filter(x => !ids.includes(x.id)));
            bulkDeleteTasks(ids)
              .then(() => toast.success(`${ids.length} tasks deleted`))
              .catch(() => { setTasks(prevTasks); setAllTasks(prevAll); toast.error('Bulk delete failed'); })
              .finally(() => { setBulkLoading(false); setSelectedTaskIds(new Set()); });
          }}
        />
      </main>
    </div>
  );
}

function PasswordRecoveryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) { setError(err.message); return; }
    toast.success('Password updated successfully.');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <UiDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <UiDialogContent className="sm:max-w-[380px] bg-card border-border">
        <UiDialogHeader>
          <UiDialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Set new password
          </UiDialogTitle>
          <UiDialogDescription>
            Enter and confirm your new password to complete the reset.
          </UiDialogDescription>
        </UiDialogHeader>
        <div className="space-y-3 py-2">
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="h-9 bg-muted/50 border-border/50"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="h-9 bg-muted/50 border-border/50"
          />
        </div>
        <UiDialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !newPassword.trim()}>
            {saving ? 'Saving…' : 'Update password'}
          </Button>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
}
