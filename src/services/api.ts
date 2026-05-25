import { supabase } from '../lib/supabase';
import {
  Task, Project, UserProfile, DatabaseErrorInfo, Comment, Company,
  TaskDependency, TimeEntry, Milestone, ActivityLog,
  CustomFieldDefinition, CustomFieldValue, TaskTemplate, Subtask,
} from '../types';

let _channelSeq = 0;
const uid = () => `${++_channelSeq}`;

async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

async function handleError(
  error: unknown,
  operationType: DatabaseErrorInfo['operationType'],
  path: string | null
): Promise<never> {
  const user = await getUser().catch(() => null);
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: user?.id, email: user?.email },
    operationType,
    path,
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function mapUser(row: Record<string, any>): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    createdAt: row.updated_at,
  };
}

function mapCompany(row: Record<string, any>): Company {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    adminIds: row.admin_ids ?? [],
    memberIds: row.member_ids ?? [],
    location: row.location ?? undefined,
    website: row.website ?? undefined,
    industry: row.industry ?? undefined,
    createdAt: row.created_at,
  };
}

function mapProject(row: Record<string, any>): Project {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description ?? undefined,
    ownerId: row.owner_id,
    members: row.members ?? [],
    color: row.color,
    stages: row.stages ?? [],
    createdAt: row.created_at,
  };
}

function mapTask(row: Record<string, any>): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id ?? undefined,
    creatorId: row.creator_id,
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
    subtasks: row.subtasks ?? [],
    recurrenceRule: row.recurrence_rule ?? undefined,
    recurrenceParentId: row.recurrence_parent_id ?? undefined,
    milestoneId: row.milestone_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapComment(row: Record<string, any>): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    userId: row.user_id,
    content: row.content,
    attachments: row.attachments ?? [],
    likes: row.likes ?? [],
    dislikes: row.dislikes ?? [],
    isEdited: row.is_edited ?? false,
    createdAt: row.created_at,
  };
}

function mapDependency(row: Record<string, any>): TaskDependency {
  return {
    id: row.id,
    taskId: row.task_id,
    dependsOnId: row.depends_on_id,
    createdAt: row.created_at,
  };
}

function mapTimeEntry(row: Record<string, any>): TimeEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    userId: row.user_id,
    minutes: row.minutes,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  };
}

function mapMilestone(row: Record<string, any>): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
  };
}

function mapActivityLog(row: Record<string, any>): ActivityLog {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    userId: row.user_id,
    action: row.action,
    field: row.field ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    createdAt: row.created_at,
  };
}

function mapCustomFieldDef(row: Record<string, any>): CustomFieldDefinition {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    fieldType: row.field_type,
    options: row.options ?? [],
    createdAt: row.created_at,
  };
}

function mapCustomFieldValue(row: Record<string, any>): CustomFieldValue {
  return {
    id: row.id,
    taskId: row.task_id,
    fieldId: row.field_id,
    value: row.value ?? '',
  };
}

function mapTemplate(row: Record<string, any>): TaskTemplate {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    template: row.template ?? {},
    createdAt: row.created_at,
  };
}

// ── User Profile ─────────────────────────────────────────────────────────────

export const ensureUserProfile = async () => {
  const user = await getUser();
  if (!user) return;
  await supabase.from('users').upsert(
    {
      id: user.id,
      uid: user.id,
      email: user.email ?? '',
      display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      photo_url: user.user_metadata?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
};

export const updateUserProfile = async (displayName: string, photoURL?: string | null) => {
  const user = await getUser();
  if (!user) return;
  const metaData: Record<string, any> = { full_name: displayName };
  if (photoURL !== undefined) metaData.avatar_url = photoURL;
  await supabase.auth.updateUser({ data: metaData });
  const updates: Record<string, any> = { display_name: displayName, updated_at: new Date().toISOString() };
  if (photoURL !== undefined) updates.photo_url = photoURL;
  const { error } = await supabase.from('users').update(updates).eq('id', user.id);
  if (error) await handleError(error, 'update', `users/${user.id}`);
};

// ── Companies ────────────────────────────────────────────────────────────────

export const createCompany = async (companyData: Partial<Company>) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: companyData.name,
      owner_id: user.id,
      admin_ids: [user.id],
      member_ids: [user.id],
      location: companyData.location ?? null,
      website: companyData.website ?? null,
      industry: companyData.industry ?? null,
    })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'companies');
  return data?.id as string;
};

export const updateCompany = async (companyId: string, updates: Partial<Company>) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.adminIds !== undefined) dbUpdates.admin_ids = updates.adminIds;
  if (updates.memberIds !== undefined) dbUpdates.member_ids = updates.memberIds;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.website !== undefined) dbUpdates.website = updates.website;
  if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
  const { error } = await supabase.from('companies').update(dbUpdates).eq('id', companyId);
  if (error) await handleError(error, 'update', `companies/${companyId}`);
};

export const deleteCompany = async (companyId: string) => {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) await handleError(error, 'delete', `companies/${companyId}`);
};

export const subscribeToCompanies = (callback: (companies: Company[]) => void) => {
  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*');
    if (!error && data) callback(data.map(mapCompany));
  };
  fetchCompanies();
  const channel = supabase
    .channel(`companies-changes-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, fetchCompanies)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Projects ─────────────────────────────────────────────────────────────────

export const createProject = async (companyId: string, projectData: Partial<Project>) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('projects')
    .insert({
      company_id: companyId,
      name: projectData.name,
      description: projectData.description ?? null,
      owner_id: user.id,
      members: projectData.members ?? [user.id],
      color: projectData.color ?? '#6366f1',
      stages: projectData.stages ?? [],
    })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'projects');
  return data?.id as string;
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.members !== undefined) dbUpdates.members = updates.members;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.stages !== undefined) dbUpdates.stages = updates.stages;
  const { error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId);
  if (error) await handleError(error, 'update', `projects/${projectId}`);
};

export const deleteProject = async (projectId: string) => {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) await handleError(error, 'delete', `projects/${projectId}`);
};

export const subscribeToProjects = (companyId: string, callback: (projects: Project[]) => void) => {
  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').eq('company_id', companyId);
    if (!error && data) callback(data.map(mapProject));
  };
  fetchProjects();
  const channel = supabase
    .channel(`projects-${companyId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `company_id=eq.${companyId}` }, fetchProjects)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) callback(data.map(mapUser));
  };
  fetchUsers();
  const channel = supabase
    .channel(`users-changes-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export const createTask = async (projectId: string, taskData: Partial<Task>) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title: taskData.title,
      description: taskData.description ?? null,
      status: taskData.status ?? 'todo',
      priority: taskData.priority ?? 'medium',
      assignee_id: taskData.assigneeId ?? null,
      creator_id: user.id,
      due_date: taskData.dueDate ?? null,
      tags: taskData.tags ?? [],
      subtasks: taskData.subtasks ?? [],
      recurrence_rule: taskData.recurrenceRule ?? null,
      milestone_id: taskData.milestoneId ?? null,
    })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'tasks');
  return data?.id as string;
};

export const updateTask = async (_projectId: string, taskId: string, updates: Partial<Task>) => {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks;
  if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;
  if ('recurrenceRule' in updates && updates.recurrenceRule === undefined) dbUpdates.recurrence_rule = null;
  if (updates.milestoneId !== undefined) dbUpdates.milestone_id = updates.milestoneId;
  if ('milestoneId' in updates && updates.milestoneId === undefined) dbUpdates.milestone_id = null;
  const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
  if (error) await handleError(error, 'update', `tasks/${taskId}`);
};

export const deleteTask = async (_projectId: string, taskId: string) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) await handleError(error, 'delete', `tasks/${taskId}`);
};

export const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>) => {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
  if (updates.milestoneId !== undefined) dbUpdates.milestone_id = updates.milestoneId;
  const { error } = await supabase.from('tasks').update(dbUpdates).in('id', taskIds);
  if (error) await handleError(error, 'update', 'tasks/bulk');
};

export const bulkDeleteTasks = async (taskIds: string[]) => {
  const { error } = await supabase.from('tasks').delete().in('id', taskIds);
  if (error) await handleError(error, 'delete', 'tasks/bulk');
};

export const subscribeToTasks = (projectId: string, callback: (tasks: Task[]) => void) => {
  const fetchTasks = async () => {
    const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
    if (!error && data) callback(data.map(mapTask));
  };
  fetchTasks();
  const channel = supabase
    .channel(`tasks-${projectId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, fetchTasks)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Comments ─────────────────────────────────────────────────────────────────

export const addComment = async (projectId: string, taskId: string, content: string, attachments?: string[]) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, project_id: projectId, user_id: user.id, content, attachments: attachments ?? [] })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'comments');
  return data?.id as string;
};

export const subscribeToComments = (_projectId: string, taskId: string, callback: (comments: Comment[]) => void) => {
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (!error && data) callback(data.map(mapComment));
  };
  fetchComments();
  const channel = supabase
    .channel(`comments-${taskId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, fetchComments)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const updateComment = async (_p: string, _t: string, commentId: string, updates: Partial<Comment>) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.likes !== undefined) dbUpdates.likes = updates.likes;
  if (updates.dislikes !== undefined) dbUpdates.dislikes = updates.dislikes;
  if (updates.isEdited !== undefined) dbUpdates.is_edited = updates.isEdited;
  const { error } = await supabase.from('comments').update(dbUpdates).eq('id', commentId);
  if (error) await handleError(error, 'update', `comments/${commentId}`);
};

export const deleteComment = async (_p: string, _t: string, commentId: string) => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) await handleError(error, 'delete', `comments/${commentId}`);
};

// ── Task Dependencies ─────────────────────────────────────────────────────────

export const addDependency = async (taskId: string, dependsOnId: string) => {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_id: dependsOnId })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'task_dependencies');
  return data?.id as string;
};

export const removeDependency = async (dependencyId: string) => {
  const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);
  if (error) await handleError(error, 'delete', `task_dependencies/${dependencyId}`);
};

export const getDependencies = async (taskId: string): Promise<{ blocking: TaskDependency[]; blockedBy: TaskDependency[] }> => {
  const [{ data: blockedBy }, { data: blocking }] = await Promise.all([
    supabase.from('task_dependencies').select('*').eq('task_id', taskId),
    supabase.from('task_dependencies').select('*').eq('depends_on_id', taskId),
  ]);
  return {
    blockedBy: (blockedBy ?? []).map(mapDependency),
    blocking: (blocking ?? []).map(mapDependency),
  };
};

// ── Time Entries ──────────────────────────────────────────────────────────────

export const logTime = async (taskId: string, projectId: string, minutes: number, note?: string) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ task_id: taskId, project_id: projectId, user_id: user.id, minutes, note: note ?? null })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'time_entries');
  return data?.id as string;
};

export const getTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries').select('*').eq('task_id', taskId).order('logged_at', { ascending: false });
  if (error) await handleError(error, 'list', 'time_entries');
  return (data ?? []).map(mapTimeEntry);
};

export const deleteTimeEntry = async (entryId: string) => {
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
  if (error) await handleError(error, 'delete', `time_entries/${entryId}`);
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const createMilestone = async (projectId: string, name: string, dueDate?: string) => {
  const { data, error } = await supabase
    .from('milestones')
    .insert({ project_id: projectId, name, due_date: dueDate ?? null })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'milestones');
  return data?.id as string;
};

export const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  const { error } = await supabase.from('milestones').update(dbUpdates).eq('id', milestoneId);
  if (error) await handleError(error, 'update', `milestones/${milestoneId}`);
};

export const deleteMilestone = async (milestoneId: string) => {
  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
  if (error) await handleError(error, 'delete', `milestones/${milestoneId}`);
};

export const subscribeToMilestones = (projectId: string, callback: (milestones: Milestone[]) => void) => {
  const fetchMilestones = async () => {
    const { data, error } = await supabase
      .from('milestones').select('*').eq('project_id', projectId).order('due_date', { ascending: true, nullsFirst: false });
    if (!error && data) callback(data.map(mapMilestone));
  };
  fetchMilestones();
  const channel = supabase
    .channel(`milestones-${projectId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, fetchMilestones)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Activity Logs ─────────────────────────────────────────────────────────────

export const addActivityLog = async (
  taskId: string,
  projectId: string,
  action: string,
  field?: string,
  oldValue?: string,
  newValue?: string
) => {
  const user = await getUser();
  if (!user) return;
  await supabase.from('activity_logs').insert({
    task_id: taskId,
    project_id: projectId,
    user_id: user.id,
    action,
    field: field ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  });
};

export const getActivityLogs = async (taskId: string): Promise<ActivityLog[]> => {
  const { data, error } = await supabase
    .from('activity_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
  if (error) await handleError(error, 'list', 'activity_logs');
  return (data ?? []).map(mapActivityLog);
};

// ── Custom Fields ─────────────────────────────────────────────────────────────

export const createCustomFieldDefinition = async (projectId: string, def: Omit<CustomFieldDefinition, 'id' | 'projectId' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({ project_id: projectId, name: def.name, field_type: def.fieldType, options: def.options ?? [] })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'custom_field_definitions');
  return data?.id as string;
};

export const deleteCustomFieldDefinition = async (fieldId: string) => {
  const { error } = await supabase.from('custom_field_definitions').delete().eq('id', fieldId);
  if (error) await handleError(error, 'delete', `custom_field_definitions/${fieldId}`);
};

export const subscribeToCustomFieldDefinitions = (projectId: string, callback: (defs: CustomFieldDefinition[]) => void) => {
  const fetch = async () => {
    const { data, error } = await supabase
      .from('custom_field_definitions').select('*').eq('project_id', projectId).order('created_at');
    if (!error && data) callback(data.map(mapCustomFieldDef));
  };
  fetch();
  const channel = supabase
    .channel(`custom-fields-${projectId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_field_definitions', filter: `project_id=eq.${projectId}` }, fetch)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const getCustomFieldValues = async (taskId: string): Promise<CustomFieldValue[]> => {
  const { data, error } = await supabase.from('custom_field_values').select('*').eq('task_id', taskId);
  if (error) await handleError(error, 'list', 'custom_field_values');
  return (data ?? []).map(mapCustomFieldValue);
};

export const upsertCustomFieldValue = async (taskId: string, fieldId: string, value: string) => {
  const { error } = await supabase
    .from('custom_field_values')
    .upsert({ task_id: taskId, field_id: fieldId, value }, { onConflict: 'task_id,field_id' });
  if (error) await handleError(error, 'write', 'custom_field_values');
};

// ── Task Templates ────────────────────────────────────────────────────────────

export const createTaskTemplate = async (projectId: string, name: string, template: Partial<Task>) => {
  const { data, error } = await supabase
    .from('task_templates')
    .insert({ project_id: projectId, name, template })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'task_templates');
  return data?.id as string;
};

export const deleteTaskTemplate = async (templateId: string) => {
  const { error } = await supabase.from('task_templates').delete().eq('id', templateId);
  if (error) await handleError(error, 'delete', `task_templates/${templateId}`);
};

export const subscribeToTaskTemplates = (projectId: string, callback: (templates: TaskTemplate[]) => void) => {
  const fetch = async () => {
    const { data, error } = await supabase
      .from('task_templates').select('*').eq('project_id', projectId).order('created_at');
    if (!error && data) callback(data.map(mapTemplate));
  };
  fetch();
  const channel = supabase
    .channel(`templates-${projectId}-${uid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates', filter: `project_id=eq.${projectId}` }, fetch)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Recurring task helpers ────────────────────────────────────────────────────

export const createRecurringInstance = async (projectId: string, parentTask: Task) => {
  if (!parentTask.recurrenceRule) return;
  const dueDate = (() => {
    if (!parentTask.dueDate) return undefined;
    const d = new Date(parentTask.dueDate);
    if (parentTask.recurrenceRule === 'daily') d.setDate(d.getDate() + 1);
    if (parentTask.recurrenceRule === 'weekly') d.setDate(d.getDate() + 7);
    if (parentTask.recurrenceRule === 'monthly') d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  })();
  return createTask(projectId, {
    title: parentTask.title,
    description: parentTask.description,
    priority: parentTask.priority,
    assigneeId: parentTask.assigneeId,
    tags: parentTask.tags,
    status: 'todo',
    dueDate,
    recurrenceRule: parentTask.recurrenceRule,
    recurrenceParentId: parentTask.id,
    milestoneId: parentTask.milestoneId,
  });
};

// ── Subtasks (stored on task row, convenience wrapper) ────────────────────────

export const updateSubtasks = async (taskId: string, subtasks: Subtask[]) => {
  const { error } = await supabase
    .from('tasks')
    .update({ subtasks, updated_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) await handleError(error, 'update', `tasks/${taskId}/subtasks`);
};
