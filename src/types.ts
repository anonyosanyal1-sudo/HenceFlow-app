export type TaskStatus = string;
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string;
  photoURL: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  location?: string;
  website?: string;
  industry?: string;
  createdAt: string;
}

export interface Stage {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_STAGES: Stage[] = [
  { id: 'todo',                 label: 'To Do',               color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { id: 'analysis-in-progress', label: 'Analysis',            color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { id: 'dev-in-progress',      label: 'Development',         color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'dev-complete',         label: 'Dev Complete',        color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { id: 'test-in-progress',     label: 'Testing',             color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'test-passed',          label: 'Test Passed',         color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'ready-for-migration',  label: 'Ready for Migration', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'closed',               label: 'Closed',              color: 'bg-green-500/20 text-green-300 border-green-500/40' },
];

// Tailwind safelist — solid bg classes dynamically constructed in TaskBoard.tsx (accent bars).
// List every color used in ProjectDialog's STAGE_COLORS + the defaults.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _STAGE_ACCENT_SAFELIST =
  'bg-slate-500 bg-gray-500 bg-zinc-500 bg-neutral-500 bg-stone-500 ' +
  'bg-red-500 bg-orange-500 bg-amber-500 bg-yellow-500 bg-lime-500 ' +
  'bg-green-500 bg-emerald-500 bg-teal-500 bg-cyan-500 bg-sky-500 ' +
  'bg-blue-500 bg-indigo-500 bg-violet-500 bg-purple-500 bg-fuchsia-500 ' +
  'bg-pink-500 bg-rose-500';

export interface Project {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  color: string;
  stages?: Stage[]; // Custom stages for the project
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  content: string;
  attachments?: string[]; // Array of data URLs or URLs
  createdAt: any; // Using any for Timestamp/ServerTimestamp flexibility
  likes?: string[]; // Array of userIds
  dislikes?: string[]; // Array of userIds
  isEdited?: boolean;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

/** @deprecated Use DatabaseErrorInfo */
export type FirestoreErrorInfo = DatabaseErrorInfo;
