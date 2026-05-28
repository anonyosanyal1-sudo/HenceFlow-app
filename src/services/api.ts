import { supabase } from '../lib/supabase';
import {
  Task, Project, UserProfile, Comment, Company, Pod,
  TaskDependency, TimeEntry, Milestone, ActivityLog,
  CustomFieldDefinition, CustomFieldValue, TaskTemplate, Subtask,
  Notification, TaskWatcher, SavedFilter, AutomationRule,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user!.id;
}

// ── Row mappers ──────────────────────────────────────────────────────────────
// DB returns snake_case; mappers normalise to frontend camelCase types.

function mapUser(r: Record<string, any>): UserProfile {
  return {
    uid: r.uid ?? r.id,
    email: r.email,
    displayName: r.display_name ?? null,
    photoURL: r.photo_url ?? null,
    createdAt: r.updated_at ?? r.created_at,
  };
}

function mapCompany(r: Record<string, any>): Company {
  return {
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    adminIds: r.admin_ids ?? [],
    memberIds: r.member_ids ?? [],
    viewerIds: r.viewer_ids ?? [],
    location: r.location ?? undefined,
    website: r.website ?? undefined,
    industry: r.industry ?? undefined,
    createdAt: r.created_at,
  };
}

function mapPod(r: Record<string, any>): Pod {
  return {
    id: r.id,
    companyId: r.company_id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color,
    ownerId: r.owner_id,
    members: r.members ?? [],
    createdAt: r.created_at,
  };
}

function mapProject(r: Record<string, any>): Project {
  return {
    id: r.id,
    companyId: r.company_id,
    podId: r.pod_id ?? undefined,
    name: r.name,
    description: r.description ?? undefined,
    ownerId: r.owner_id,
    members: r.members ?? [],
    color: r.color,
    stages: r.stages ?? [],
    isArchived: r.is_archived ?? false,
    createdAt: r.created_at,
  };
}

function mapTask(r: Record<string, any>): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    assigneeId: r.assignee_id ?? undefined,
    creatorId: r.creator_id,
    dueDate: r.due_date ?? undefined,
    tags: r.tags ?? [],
    subtasks: r.subtasks ?? [],
    recurrenceRule: r.recurrence_rule ?? undefined,
    recurrenceParentId: r.recurrence_parent_id ?? undefined,
    milestoneId: r.milestone_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapComment(r: Record<string, any>): Comment {
  return {
    id: r.id,
    taskId: r.task_id,
    projectId: r.project_id,
    userId: r.user_id,
    content: r.content,
    attachments: r.attachments ?? [],
    likes: r.likes ?? [],
    dislikes: r.dislikes ?? [],
    isEdited: r.is_edited ?? false,
    createdAt: r.created_at,
  };
}

function mapDependency(r: Record<string, any>): TaskDependency {
  return {
    id: r.id,
    taskId: r.task_id,
    dependsOnId: r.depends_on_id,
    createdAt: r.created_at,
  };
}

function mapTimeEntry(r: Record<string, any>): TimeEntry {
  return {
    id: r.id,
    taskId: r.task_id,
    projectId: r.project_id,
    userId: r.user_id,
    minutes: r.minutes,
    note: r.note ?? undefined,
    loggedAt: r.logged_at,
  };
}

function mapMilestone(r: Record<string, any>): Milestone {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    dueDate: r.due_date ?? undefined,
    createdAt: r.created_at,
  };
}

function mapActivityLog(r: Record<string, any>): ActivityLog {
  return {
    id: r.id,
    taskId: r.task_id,
    projectId: r.project_id,
    userId: r.user_id,
    action: r.action,
    field: r.field ?? undefined,
    oldValue: r.old_value ?? undefined,
    newValue: r.new_value ?? undefined,
    createdAt: r.created_at,
  };
}

function mapCustomFieldDef(r: Record<string, any>): CustomFieldDefinition {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    fieldType: r.field_type,
    options: r.options ?? [],
    createdAt: r.created_at,
  };
}

function mapCustomFieldValue(r: Record<string, any>): CustomFieldValue {
  return {
    id: r.id,
    taskId: r.task_id,
    fieldId: r.field_id,
    value: r.value ?? '',
  };
}

function mapTemplate(r: Record<string, any>): TaskTemplate {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    template: r.template ?? {},
    createdAt: r.created_at,
  };
}

// ── User Profile ──────────────────────────────────────────────────────────────

export const ensureUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      uid: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      photo_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
};

export const updateUserProfile = async (displayName: string, photoURL?: string | null) => {
  const userId = await getCurrentUserId();
  const updates: Record<string, any> = { display_name: displayName };
  if (photoURL !== undefined) updates.photo_url = photoURL;
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw new Error(error.message);
  // Keep Supabase Auth metadata in sync (for token display_name)
  const meta: Record<string, any> = { full_name: displayName };
  if (photoURL !== undefined) meta.avatar_url = photoURL;
  await supabase.auth.updateUser({ data: meta });
};

export const fetchUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUser);
};

// ── Companies ─────────────────────────────────────────────────────────────────

export const fetchCompanies = async (): Promise<Company[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .or(`owner_id.eq.${userId},admin_ids.cs.{${userId}},member_ids.cs.{${userId}}`);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCompany);
};

export const createCompany = async (data: Partial<Company>): Promise<string> => {
  const userId = await getCurrentUserId();
  // Always include the owner in member_ids and admin_ids so RLS policies work
  const memberIds = [...new Set([userId, ...(data.memberIds ?? [])])];
  const adminIds = [...new Set([userId, ...(data.adminIds ?? [])])];
  const { data: row, error } = await supabase
    .from('companies')
    .insert({
      name: data.name,
      owner_id: userId,
      admin_ids: adminIds,
      member_ids: memberIds,
      location: data.location ?? null,
      website: data.website ?? null,
      industry: data.industry ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updateCompany = async (companyId: string, updates: Partial<Company>) => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.website !== undefined) payload.website = updates.website;
  if (updates.industry !== undefined) payload.industry = updates.industry;
  if (updates.adminIds !== undefined) payload.admin_ids = updates.adminIds;
  if (updates.memberIds !== undefined) payload.member_ids = updates.memberIds;
  if (updates.viewerIds !== undefined) payload.viewer_ids = updates.viewerIds;
  const { error } = await supabase.from('companies').update(payload).eq('id', companyId);
  if (error) throw new Error(error.message);
};

export const deleteCompany = async (companyId: string) => {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) throw new Error(error.message);
};

// ── Pods ──────────────────────────────────────────────────────────────────────

export const fetchPods = async (companyId: string): Promise<Pod[]> => {
  const { data, error } = await supabase.from('pods').select('*').eq('company_id', companyId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPod);
};

export const createPod = async (companyId: string, data: Partial<Pod>): Promise<string> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('pods')
    .insert({
      company_id: companyId,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? '#6366f1',
      owner_id: userId,
      members: data.members ?? [],
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updatePod = async (podId: string, updates: Partial<Pod>) => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.members !== undefined) payload.members = updates.members;
  const { error } = await supabase.from('pods').update(payload).eq('id', podId);
  if (error) throw new Error(error.message);
};

export const deletePod = async (podId: string) => {
  const { error } = await supabase.from('pods').delete().eq('id', podId);
  if (error) throw new Error(error.message);
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const fetchProjects = async (companyId: string, podId?: string): Promise<Project[]> => {
  let query = supabase.from('projects').select('*').eq('company_id', companyId);
  if (podId) query = query.eq('pod_id', podId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProject);
};

export const createProject = async (companyId: string, data: Partial<Project> & { podId?: string }): Promise<string> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('projects')
    .insert({
      company_id: companyId,
      pod_id: data.podId ?? null,
      name: data.name,
      description: data.description ?? null,
      owner_id: userId,
      members: data.members ?? [],
      color: data.color ?? '#6366f1',
      stages: data.stages ?? [],
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.members !== undefined) payload.members = updates.members;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.stages !== undefined) payload.stages = updates.stages;
  if (updates.isArchived !== undefined) payload.is_archived = updates.isArchived;
  const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
  if (error) throw new Error(error.message);
};

export const archiveProject = async (projectId: string, archive: boolean) => {
  const { error } = await supabase.from('projects').update({ is_archived: archive }).eq('id', projectId);
  if (error) throw new Error(error.message);
};

export const deleteProject = async (projectId: string) => {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const fetchTasks = async (projectId: string): Promise<Task[]> => {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTask);
};

export const createTask = async (projectId: string, data: Partial<Task>): Promise<string> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      assignee_id: data.assigneeId ?? null,
      creator_id: userId,
      due_date: data.dueDate ?? null,
      tags: data.tags ?? [],
      subtasks: data.subtasks ?? [],
      recurrence_rule: data.recurrenceRule ?? null,
      milestone_id: data.milestoneId ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updateTask = async (_projectId: string, taskId: string, updates: Partial<Task>) => {
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.subtasks !== undefined) payload.subtasks = updates.subtasks;
  if ('recurrenceRule' in updates) payload.recurrence_rule = updates.recurrenceRule ?? null;
  if ('milestoneId' in updates) payload.milestone_id = updates.milestoneId ?? null;
  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
  if (error) throw new Error(error.message);
};

export const deleteTask = async (_projectId: string, taskId: string) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
};

export const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>) => {
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
  if ('milestoneId' in updates) payload.milestone_id = updates.milestoneId ?? null;
  const { error } = await supabase.from('tasks').update(payload).in('id', taskIds);
  if (error) throw new Error(error.message);
};

export const bulkDeleteTasks = async (taskIds: string[]) => {
  const { error } = await supabase.from('tasks').delete().in('id', taskIds);
  if (error) throw new Error(error.message);
};

// ── Comments ──────────────────────────────────────────────────────────────────

export const fetchComments = async (taskId: string): Promise<Comment[]> => {
  const { data, error } = await supabase.from('comments').select('*').eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapComment);
};

export const addComment = async (projectId: string, taskId: string, content: string): Promise<string> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      project_id: projectId,
      user_id: userId,
      content,
      attachments: [],
      likes: [],
      dislikes: [],
      is_edited: false,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updateComment = async (_p: string, _t: string, commentId: string, updates: Partial<Comment>) => {
  if (updates.content !== undefined) {
    const { error } = await supabase
      .from('comments')
      .update({ content: updates.content, is_edited: true })
      .eq('id', commentId);
    if (error) throw new Error(error.message);
  }
};

export const reactToComment = async (commentId: string, reaction: 'like' | 'dislike'): Promise<Comment> => {
  const userId = await getCurrentUserId();
  // Read current comment
  const { data: existing, error: fetchError } = await supabase
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const likes: string[] = existing.likes ?? [];
  const dislikes: string[] = existing.dislikes ?? [];

  let newLikes = likes;
  let newDislikes = dislikes;

  if (reaction === 'like') {
    newDislikes = dislikes.filter(id => id !== userId);
    if (likes.includes(userId)) {
      newLikes = likes.filter(id => id !== userId);
    } else {
      newLikes = [...likes, userId];
    }
  } else {
    newLikes = likes.filter(id => id !== userId);
    if (dislikes.includes(userId)) {
      newDislikes = dislikes.filter(id => id !== userId);
    } else {
      newDislikes = [...dislikes, userId];
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('comments')
    .update({ likes: newLikes, dislikes: newDislikes })
    .eq('id', commentId)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);
  return mapComment(updated);
};

export const deleteComment = async (_p: string, _t: string, commentId: string) => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
};

// ── Task Dependencies ─────────────────────────────────────────────────────────

export const getDependencies = async (taskId: string): Promise<{ blockedBy: TaskDependency[]; blocking: TaskDependency[] }> => {
  const [{ data: blockedByData, error: err1 }, { data: blockingData, error: err2 }] = await Promise.all([
    supabase.from('task_dependencies').select('*').eq('task_id', taskId),
    supabase.from('task_dependencies').select('*').eq('depends_on_id', taskId),
  ]);
  if (err1) throw new Error(err1.message);
  if (err2) throw new Error(err2.message);
  return {
    blockedBy: (blockedByData ?? []).map(mapDependency),
    blocking: (blockingData ?? []).map(mapDependency),
  };
};

export const addDependency = async (taskId: string, dependsOnId: string): Promise<string> => {
  const { data: row, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_id: dependsOnId })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const removeDependency = async (dependencyId: string) => {
  const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);
  if (error) throw new Error(error.message);
};

// ── Time Entries ──────────────────────────────────────────────────────────────

export const getTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
  const { data, error } = await supabase.from('time_entries').select('*').eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTimeEntry);
};

export const logTime = async (taskId: string, projectId: string, minutes: number, note?: string): Promise<string> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('time_entries')
    .insert({
      task_id: taskId,
      project_id: projectId,
      user_id: userId,
      minutes,
      note: note ?? null,
      logged_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const deleteTimeEntry = async (entryId: string) => {
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
  if (error) throw new Error(error.message);
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const fetchMilestones = async (projectId: string): Promise<Milestone[]> => {
  const { data, error } = await supabase.from('milestones').select('*').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMilestone);
};

export const createMilestone = async (projectId: string, name: string, dueDate?: string): Promise<string> => {
  const { data: row, error } = await supabase
    .from('milestones')
    .insert({ project_id: projectId, name, due_date: dueDate ?? null })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  payload.due_date = updates.dueDate ?? null;
  const { error } = await supabase.from('milestones').update(payload).eq('id', milestoneId);
  if (error) throw new Error(error.message);
};

export const deleteMilestone = async (milestoneId: string) => {
  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
  if (error) throw new Error(error.message);
};

// ── Activity Logs ─────────────────────────────────────────────────────────────

export const getActivityLogs = async (taskId: string): Promise<ActivityLog[]> => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapActivityLog);
};

// addActivityLog writes to DB; server-side triggers also create logs automatically
export const addActivityLog = async (
  taskId: string,
  projectId: string,
  action: string,
  opts?: { field?: string; oldValue?: string; newValue?: string }
): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('activity_logs').insert({
    task_id: taskId,
    project_id: projectId,
    user_id: userId,
    action,
    field: opts?.field ?? null,
    old_value: opts?.oldValue ?? null,
    new_value: opts?.newValue ?? null,
  });
  if (error) console.error('addActivityLog:', error.message);
};

// ── Custom Fields ─────────────────────────────────────────────────────────────

export const fetchCustomFieldDefinitions = async (projectId: string): Promise<CustomFieldDefinition[]> => {
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomFieldDef);
};

export const createCustomFieldDefinition = async (
  projectId: string,
  def: Omit<CustomFieldDefinition, 'id' | 'projectId' | 'createdAt'>,
): Promise<string> => {
  const { data: row, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      project_id: projectId,
      name: def.name,
      field_type: def.fieldType,
      options: def.options ?? [],
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const deleteCustomFieldDefinition = async (fieldId: string) => {
  const { error } = await supabase.from('custom_field_definitions').delete().eq('id', fieldId);
  if (error) throw new Error(error.message);
};

export const getCustomFieldValues = async (taskId: string): Promise<CustomFieldValue[]> => {
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*')
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomFieldValue);
};

export const upsertCustomFieldValue = async (taskId: string, fieldId: string, value: string) => {
  const { error } = await supabase
    .from('custom_field_values')
    .upsert({ task_id: taskId, field_id: fieldId, value }, { onConflict: 'task_id,field_id' });
  if (error) throw new Error(error.message);
};

// ── Task Templates ────────────────────────────────────────────────────────────

export const fetchTaskTemplates = async (projectId: string): Promise<TaskTemplate[]> => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTemplate);
};

export const createTaskTemplate = async (projectId: string, name: string, template: Partial<Task>): Promise<string> => {
  const { data: row, error } = await supabase
    .from('task_templates')
    .insert({ project_id: projectId, name, template })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
};

export const deleteTaskTemplate = async (templateId: string) => {
  const { error } = await supabase.from('task_templates').delete().eq('id', templateId);
  if (error) throw new Error(error.message);
};

// ── Subtasks convenience wrapper ──────────────────────────────────────────────

export const updateSubtasks = async (taskId: string, subtasks: Subtask[], projectId?: string) => {
  const { data: taskRow } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
  const pid = projectId ?? taskRow?.project_id ?? '';
  await updateTask(pid, taskId, { subtasks });
};

// ── Recurring task helpers ────────────────────────────────────────────────────

// Recurring instances are spawned server-side when a task is closed.
// This stub is kept so any callers don't crash.
export const createRecurringInstance = async () => {};

// ── Subscribe helpers (fetch wrappers, real-time handled by useServerEvents) ──

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

// ── Notifications ─────────────────────────────────────────────────────────────

export const fetchNotifications = async (): Promise<Notification[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    taskId: r.task_id ?? undefined,
    projectId: r.project_id ?? undefined,
    isRead: r.is_read,
    createdAt: r.created_at,
  }));
};

export const markNotificationsRead = async (ids?: string[]) => {
  const userId = await getCurrentUserId();
  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  if (ids && ids.length > 0) query = query.in('id', ids);
  const { error } = await query;
  if (error) throw new Error(error.message);
};

export const deleteNotification = async (id: string) => {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ── Task Watchers ─────────────────────────────────────────────────────────────

export const fetchWatchers = async (taskId: string): Promise<TaskWatcher[]> => {
  const { data, error } = await supabase
    .from('task_watchers')
    .select('*')
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    taskId: r.task_id,
    userId: r.user_id,
    createdAt: r.created_at,
  }));
};

export const watchTask = async (taskId: string): Promise<TaskWatcher> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('task_watchers')
    .insert({ task_id: taskId, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { id: row.id, taskId: row.task_id, userId: row.user_id, createdAt: row.created_at };
};

export const unwatchTask = async (taskId: string) => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('task_watchers')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
};

// ── Saved Filters ─────────────────────────────────────────────────────────────

export const fetchSavedFilters = async (projectId: string): Promise<SavedFilter[]> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    userId: r.user_id,
    name: r.name,
    filters: r.filters,
    createdAt: r.created_at,
  }));
};

export const createSavedFilter = async (projectId: string, name: string, filters: SavedFilter['filters']): Promise<SavedFilter> => {
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from('saved_filters')
    .insert({ project_id: projectId, user_id: userId, name, filters })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    name: row.name,
    filters: row.filters,
    createdAt: row.created_at,
  };
};

export const deleteSavedFilter = async (filterId: string) => {
  const { error } = await supabase.from('saved_filters').delete().eq('id', filterId);
  if (error) throw new Error(error.message);
};

// ── Automation Rules ──────────────────────────────────────────────────────────

export const fetchAutomations = async (projectId: string): Promise<AutomationRule[]> => {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    triggerType: r.trigger_type,
    triggerValue: r.trigger_value ?? undefined,
    actionType: r.action_type,
    actionValue: r.action_value ?? undefined,
    isActive: r.is_active,
    createdAt: r.created_at,
  }));
};

export const createAutomation = async (projectId: string, rule: Omit<AutomationRule, 'id' | 'projectId' | 'createdAt'>): Promise<AutomationRule> => {
  const { data: row, error } = await supabase
    .from('automation_rules')
    .insert({
      project_id: projectId,
      name: rule.name,
      trigger_type: rule.triggerType,
      trigger_value: rule.triggerValue ?? null,
      action_type: rule.actionType,
      action_value: rule.actionValue ?? null,
      is_active: rule.isActive,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: row.id, projectId: row.project_id, name: row.name,
    triggerType: row.trigger_type, triggerValue: row.trigger_value ?? undefined,
    actionType: row.action_type, actionValue: row.action_value ?? undefined,
    isActive: row.is_active, createdAt: row.created_at,
  };
};

export const updateAutomation = async (ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> => {
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.triggerType !== undefined) payload.trigger_type = updates.triggerType;
  if ('triggerValue' in updates) payload.trigger_value = updates.triggerValue ?? null;
  if (updates.actionType !== undefined) payload.action_type = updates.actionType;
  if ('actionValue' in updates) payload.action_value = updates.actionValue ?? null;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  const { data: row, error } = await supabase
    .from('automation_rules')
    .update(payload)
    .eq('id', ruleId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: row.id, projectId: row.project_id, name: row.name,
    triggerType: row.trigger_type, triggerValue: row.trigger_value ?? undefined,
    actionType: row.action_type, actionValue: row.action_value ?? undefined,
    isActive: row.is_active, createdAt: row.created_at,
  };
};

export const deleteAutomation = async (ruleId: string) => {
  const { error } = await supabase.from('automation_rules').delete().eq('id', ruleId);
  if (error) throw new Error(error.message);
};

// ── Export ────────────────────────────────────────────────────────────────────

export const exportTasksCSV = async (projectId: string) => {
  const tasks = await fetchTasks(projectId);
  const headers = [
    'id', 'title', 'status', 'priority', 'assigneeId', 'creatorId',
    'dueDate', 'tags', 'milestoneId', 'createdAt', 'updatedAt',
  ];
  const escape = (v: any) => {
    const s = v === undefined || v === null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = [
    headers.join(','),
    ...tasks.map(t =>
      [
        t.id, t.title, t.status, t.priority,
        t.assigneeId ?? '', t.creatorId,
        t.dueDate ?? '', (t.tags ?? []).join(';'),
        t.milestoneId ?? '', t.createdAt, t.updatedAt,
      ].map(escape).join(',')
    ),
  ];
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks_${projectId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
