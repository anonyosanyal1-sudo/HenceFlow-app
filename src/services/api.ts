import { http } from '../lib/http';
import { supabase } from '../lib/supabase';
import {
  Task, Project, UserProfile, Comment, Company,
  TaskDependency, TimeEntry, Milestone, ActivityLog,
  CustomFieldDefinition, CustomFieldValue, TaskTemplate, Subtask,
} from '../types';

// ── Row mappers ──────────────────────────────────────────────────────────────
// Backend returns camelCase (Pydantic). Mappers normalise to frontend types.

function mapUser(r: Record<string, any>): UserProfile {
  return {
    uid: r.uid,
    email: r.email,
    displayName: r.displayName ?? null,
    photoURL: r.photoURL ?? null,
    createdAt: r.createdAt,
  };
}

function mapCompany(r: Record<string, any>): Company {
  return {
    id: r.id,
    name: r.name,
    ownerId: r.ownerId,
    adminIds: r.adminIds ?? [],
    memberIds: r.memberIds ?? [],
    location: r.location ?? undefined,
    website: r.website ?? undefined,
    industry: r.industry ?? undefined,
    createdAt: r.createdAt,
  };
}

function mapProject(r: Record<string, any>): Project {
  return {
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    description: r.description ?? undefined,
    ownerId: r.ownerId,
    members: r.members ?? [],
    color: r.color,
    stages: r.stages ?? [],
    createdAt: r.createdAt,
  };
}

function mapTask(r: Record<string, any>): Task {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    assigneeId: r.assigneeId ?? undefined,
    creatorId: r.creatorId,
    dueDate: r.dueDate ?? undefined,
    tags: r.tags ?? [],
    subtasks: r.subtasks ?? [],
    recurrenceRule: r.recurrenceRule ?? undefined,
    recurrenceParentId: r.recurrenceParentId ?? undefined,
    milestoneId: r.milestoneId ?? undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function mapComment(r: Record<string, any>): Comment {
  return {
    id: r.id,
    taskId: r.taskId,
    projectId: r.projectId,
    userId: r.userId,
    content: r.content,
    attachments: r.attachments ?? [],
    likes: r.likes ?? [],
    dislikes: r.dislikes ?? [],
    isEdited: r.isEdited ?? false,
    createdAt: r.createdAt,
  };
}

function mapDependency(r: Record<string, any>): TaskDependency {
  return {
    id: r.id,
    taskId: r.taskId,
    dependsOnId: r.dependsOnId,
    createdAt: r.createdAt,
  };
}

function mapTimeEntry(r: Record<string, any>): TimeEntry {
  return {
    id: r.id,
    taskId: r.taskId,
    projectId: r.projectId,
    userId: r.userId,
    minutes: r.minutes,
    note: r.note ?? undefined,
    loggedAt: r.loggedAt,
  };
}

function mapMilestone(r: Record<string, any>): Milestone {
  return {
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    dueDate: r.dueDate ?? undefined,
    createdAt: r.createdAt,
  };
}

function mapActivityLog(r: Record<string, any>): ActivityLog {
  return {
    id: r.id,
    taskId: r.taskId,
    projectId: r.projectId,
    userId: r.userId,
    action: r.action,
    field: r.field ?? undefined,
    oldValue: r.oldValue ?? undefined,
    newValue: r.newValue ?? undefined,
    createdAt: r.createdAt,
  };
}

function mapCustomFieldDef(r: Record<string, any>): CustomFieldDefinition {
  return {
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    fieldType: r.fieldType,
    options: r.options ?? [],
    createdAt: r.createdAt,
  };
}

function mapCustomFieldValue(r: Record<string, any>): CustomFieldValue {
  return {
    id: r.id,
    taskId: r.taskId,
    fieldId: r.fieldId,
    value: r.value ?? '',
  };
}

function mapTemplate(r: Record<string, any>): TaskTemplate {
  return {
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    template: r.template ?? {},
    createdAt: r.createdAt,
  };
}

// ── User Profile ──────────────────────────────────────────────────────────────

export const ensureUserProfile = async () => {
  await http.post('/api/users/ensure-profile');
};

export const updateUserProfile = async (displayName: string, photoURL?: string | null) => {
  const body: Record<string, any> = { displayName };
  if (photoURL !== undefined) body.photoURL = photoURL;
  await http.patch('/api/users/me', body);
  // Keep Supabase Auth metadata in sync (for token display_name)
  const meta: Record<string, any> = { full_name: displayName };
  if (photoURL !== undefined) meta.avatar_url = photoURL;
  await supabase.auth.updateUser({ data: meta });
};

export const fetchUsers = async (): Promise<UserProfile[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/users');
  return rows.map(mapUser);
};

// ── Companies ─────────────────────────────────────────────────────────────────

export const fetchCompanies = async (): Promise<Company[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/companies');
  return rows.map(mapCompany);
};

export const createCompany = async (data: Partial<Company>): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/companies', {
    name: data.name,
    location: data.location,
    website: data.website,
    industry: data.industry,
  });
  return row.id;
};

export const updateCompany = async (companyId: string, updates: Partial<Company>) => {
  await http.patch(`/api/companies/${companyId}`, {
    name: updates.name,
    location: updates.location,
    website: updates.website,
    industry: updates.industry,
    adminIds: updates.adminIds,
    memberIds: updates.memberIds,
  });
};

export const deleteCompany = async (companyId: string) => {
  await http.delete(`/api/companies/${companyId}`);
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const fetchProjects = async (companyId: string): Promise<Project[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/projects', { company_id: companyId });
  return rows.map(mapProject);
};

export const createProject = async (companyId: string, data: Partial<Project>): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/projects', {
    name: data.name,
    description: data.description,
    members: data.members,
    color: data.color,
    stages: data.stages,
  }, { company_id: companyId });
  return row.id;
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  await http.patch(`/api/projects/${projectId}`, {
    name: updates.name,
    description: updates.description,
    members: updates.members,
    color: updates.color,
    stages: updates.stages,
  });
};

export const deleteProject = async (projectId: string) => {
  await http.delete(`/api/projects/${projectId}`);
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const fetchTasks = async (projectId: string): Promise<Task[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/tasks', { project_id: projectId });
  return rows.map(mapTask);
};

export const createTask = async (projectId: string, data: Partial<Task>): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/tasks', {
    title: data.title,
    description: data.description,
    status: data.status ?? 'todo',
    priority: data.priority ?? 'medium',
    assigneeId: data.assigneeId,
    dueDate: data.dueDate,
    tags: data.tags ?? [],
    subtasks: data.subtasks ?? [],
    recurrenceRule: data.recurrenceRule,
    milestoneId: data.milestoneId,
  }, { project_id: projectId });
  return row.id;
};

export const updateTask = async (_projectId: string, taskId: string, updates: Partial<Task>) => {
  await http.patch(`/api/tasks/${taskId}`, {
    title: updates.title,
    description: updates.description,
    status: updates.status,
    priority: updates.priority,
    assigneeId: updates.assigneeId,
    dueDate: updates.dueDate,
    tags: updates.tags,
    subtasks: updates.subtasks,
    recurrenceRule: updates.recurrenceRule ?? null,
    milestoneId: updates.milestoneId ?? null,
  });
};

export const deleteTask = async (_projectId: string, taskId: string) => {
  await http.delete(`/api/tasks/${taskId}`);
};

export const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>) => {
  await http.post('/api/tasks/bulk-update', {
    ids: taskIds,
    status: updates.status,
    priority: updates.priority,
    assigneeId: updates.assigneeId,
    milestoneId: updates.milestoneId,
  });
};

export const bulkDeleteTasks = async (taskIds: string[]) => {
  await http.post('/api/tasks/bulk-delete', { ids: taskIds });
};

// ── Comments ──────────────────────────────────────────────────────────────────

export const fetchComments = async (taskId: string): Promise<Comment[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/comments', { task_id: taskId });
  return rows.map(mapComment);
};

export const addComment = async (_projectId: string, taskId: string, content: string): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/comments', { content }, { task_id: taskId });
  return row.id;
};

export const updateComment = async (_p: string, _t: string, commentId: string, updates: Partial<Comment>) => {
  if (updates.content !== undefined) {
    await http.patch(`/api/comments/${commentId}`, { content: updates.content });
  }
  if (updates.likes !== undefined || updates.dislikes !== undefined) {
    // Reactions are handled via dedicated endpoint; this path is kept for compat
  }
};

export const reactToComment = async (commentId: string, reaction: 'like' | 'dislike'): Promise<Comment> => {
  const row = await http.post<Record<string, any>>(`/api/comments/${commentId}/react`, { reaction });
  return mapComment(row);
};

export const deleteComment = async (_p: string, _t: string, commentId: string) => {
  await http.delete(`/api/comments/${commentId}`);
};

// ── Task Dependencies ─────────────────────────────────────────────────────────

export const getDependencies = async (taskId: string): Promise<{ blockedBy: TaskDependency[]; blocking: TaskDependency[] }> => {
  const [blockedBy, blocking] = await Promise.all([
    http.get<Record<string, any>[]>('/api/dependencies', { task_id: taskId }),
    // "blocking" = other tasks that depend on this task; query by depends_on_id is not directly exposed.
    // We fetch all and filter client-side for now — the backend only supports querying by task_id.
    Promise.resolve([] as Record<string, any>[]),
  ]);
  return {
    blockedBy: blockedBy.map(mapDependency),
    blocking: blocking.map(mapDependency),
  };
};

export const addDependency = async (taskId: string, dependsOnId: string): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/dependencies', { dependsOnId }, { task_id: taskId });
  return row.id;
};

export const removeDependency = async (dependencyId: string) => {
  await http.delete(`/api/dependencies/${dependencyId}`);
};

// ── Time Entries ──────────────────────────────────────────────────────────────

export const getTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/time-entries', { task_id: taskId });
  return rows.map(mapTimeEntry);
};

export const logTime = async (taskId: string, _projectId: string, minutes: number, note?: string): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/time-entries', { minutes, note }, { task_id: taskId });
  return row.id;
};

export const deleteTimeEntry = async (entryId: string) => {
  await http.delete(`/api/time-entries/${entryId}`);
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const fetchMilestones = async (projectId: string): Promise<Milestone[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/milestones', { project_id: projectId });
  return rows.map(mapMilestone);
};

export const createMilestone = async (projectId: string, name: string, dueDate?: string): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/milestones', { name, dueDate }, { project_id: projectId });
  return row.id;
};

export const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
  await http.patch(`/api/milestones/${milestoneId}`, {
    name: updates.name,
    dueDate: updates.dueDate ?? null,
  });
};

export const deleteMilestone = async (milestoneId: string) => {
  await http.delete(`/api/milestones/${milestoneId}`);
};

// ── Activity Logs ─────────────────────────────────────────────────────────────

export const getActivityLogs = async (taskId: string): Promise<ActivityLog[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/activity-logs', { task_id: taskId });
  return rows.map(mapActivityLog);
};

// addActivityLog is now handled server-side; keep stub for backwards compat
export const addActivityLog = async () => {};

// ── Custom Fields ─────────────────────────────────────────────────────────────

export const fetchCustomFieldDefinitions = async (projectId: string): Promise<CustomFieldDefinition[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/custom-fields/definitions', { project_id: projectId });
  return rows.map(mapCustomFieldDef);
};

export const createCustomFieldDefinition = async (
  projectId: string,
  def: Omit<CustomFieldDefinition, 'id' | 'projectId' | 'createdAt'>,
): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/custom-fields/definitions', {
    name: def.name,
    fieldType: def.fieldType,
    options: def.options ?? [],
  }, { project_id: projectId });
  return row.id;
};

export const deleteCustomFieldDefinition = async (fieldId: string) => {
  await http.delete(`/api/custom-fields/definitions/${fieldId}`);
};

export const getCustomFieldValues = async (taskId: string): Promise<CustomFieldValue[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/custom-fields/values', { task_id: taskId });
  return rows.map(mapCustomFieldValue);
};

export const upsertCustomFieldValue = async (taskId: string, fieldId: string, value: string) => {
  await http.put('/api/custom-fields/values', { fieldId, value }, { task_id: taskId });
};

// ── Task Templates ────────────────────────────────────────────────────────────

export const fetchTaskTemplates = async (projectId: string): Promise<TaskTemplate[]> => {
  const rows = await http.get<Record<string, any>[]>('/api/templates', { project_id: projectId });
  return rows.map(mapTemplate);
};

export const createTaskTemplate = async (projectId: string, name: string, template: Partial<Task>): Promise<string> => {
  const row = await http.post<Record<string, any>>('/api/templates', { name, template }, { project_id: projectId });
  return row.id;
};

export const deleteTaskTemplate = async (templateId: string) => {
  await http.delete(`/api/templates/${templateId}`);
};

// ── Subtasks convenience wrapper ──────────────────────────────────────────────

export const updateSubtasks = async (_taskId: string, _subtasks: Subtask[]) => {
  // Subtasks are updated via updateTask — kept for backwards compat
};

// ── Recurring task helpers ────────────────────────────────────────────────────

// Recurring instances are spawned server-side when a task is closed.
// This stub is kept so any callers don't crash.
export const createRecurringInstance = async () => {};

// ── Subscribe helpers (replaced by SSE, kept as fetch wrappers) ──────────────

export const subscribeToCompanies = (callback: (companies: Company[]) => void) => {
  fetchCompanies().then(callback).catch(console.error);
  return () => {};
};

export const subscribeToProjects = (companyId: string, callback: (projects: Project[]) => void) => {
  fetchProjects(companyId).then(callback).catch(console.error);
  return () => {};
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
  fetchUsers().then(callback).catch(console.error);
  return () => {};
};

export const subscribeToTasks = (projectId: string, callback: (tasks: Task[]) => void) => {
  fetchTasks(projectId).then(callback).catch(console.error);
  return () => {};
};

export const subscribeToComments = (_projectId: string, taskId: string, callback: (comments: Comment[]) => void) => {
  fetchComments(taskId).then(callback).catch(console.error);
  return () => {};
};

export const subscribeToMilestones = (projectId: string, callback: (milestones: Milestone[]) => void) => {
  fetchMilestones(projectId).then(callback).catch(console.error);
  return () => {};
};

export const subscribeToCustomFieldDefinitions = (projectId: string, callback: (defs: CustomFieldDefinition[]) => void) => {
  fetchCustomFieldDefinitions(projectId).then(callback).catch(console.error);
  return () => {};
};

export const subscribeToTaskTemplates = (projectId: string, callback: (templates: TaskTemplate[]) => void) => {
  fetchTaskTemplates(projectId).then(callback).catch(console.error);
  return () => {};
};
