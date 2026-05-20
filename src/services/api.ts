import { supabase } from '../lib/supabase';
import { Task, Project, UserProfile, DatabaseErrorInfo, Comment, Company } from '../types';

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

// ── Row mappers (snake_case DB → camelCase app) ──────────────────────────────

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

// ── User Profile ─────────────────────────────────────────────────────────────

export const ensureUserProfile = async () => {
  const user = await getUser();
  if (!user) return;
  await supabase.from('users').upsert(
    {
      id: user.id,
      uid: user.id,
      email: user.email ?? '',
      display_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      photo_url: user.user_metadata?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
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
    .channel('companies-changes')
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
  // Tasks and comments cascade-delete via FK constraints
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) await handleError(error, 'delete', `projects/${projectId}`);
};

export const subscribeToProjects = (
  companyId: string,
  callback: (projects: Project[]) => void
) => {
  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId);
    if (!error && data) callback(data.map(mapProject));
  };

  fetchProjects();

  const channel = supabase
    .channel(`projects-${companyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects', filter: `company_id=eq.${companyId}` },
      fetchProjects
    )
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
    .channel('users-changes')
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
    })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'tasks');
  return data?.id as string;
};

export const updateTask = async (
  _projectId: string,
  taskId: string,
  updates: Partial<Task>
) => {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
  if (error) await handleError(error, 'update', `tasks/${taskId}`);
};

export const deleteTask = async (_projectId: string, taskId: string) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) await handleError(error, 'delete', `tasks/${taskId}`);
};

export const subscribeToTasks = (projectId: string, callback: (tasks: Task[]) => void) => {
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);
    if (!error && data) callback(data.map(mapTask));
  };

  fetchTasks();

  const channel = supabase
    .channel(`tasks-${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
      fetchTasks
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

// ── Comments ─────────────────────────────────────────────────────────────────

export const addComment = async (
  projectId: string,
  taskId: string,
  content: string,
  attachments?: string[]
) => {
  const user = await getUser();
  if (!user) return;
  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      project_id: projectId,
      user_id: user.id,
      content,
      attachments: attachments ?? [],
    })
    .select()
    .single();
  if (error) await handleError(error, 'create', 'comments');
  return data?.id as string;
};

export const subscribeToComments = (
  _projectId: string,
  taskId: string,
  callback: (comments: Comment[]) => void
) => {
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (!error && data) callback(data.map(mapComment));
  };

  fetchComments();

  const channel = supabase
    .channel(`comments-${taskId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
      fetchComments
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

export const updateComment = async (
  _projectId: string,
  _taskId: string,
  commentId: string,
  updates: Partial<Comment>
) => {
  const dbUpdates: Record<string, any> = {};
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.likes !== undefined) dbUpdates.likes = updates.likes;
  if (updates.dislikes !== undefined) dbUpdates.dislikes = updates.dislikes;
  if (updates.isEdited !== undefined) dbUpdates.is_edited = updates.isEdited;
  const { error } = await supabase.from('comments').update(dbUpdates).eq('id', commentId);
  if (error) await handleError(error, 'update', `comments/${commentId}`);
};

export const deleteComment = async (
  _projectId: string,
  _taskId: string,
  commentId: string
) => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) await handleError(error, 'delete', `comments/${commentId}`);
};
