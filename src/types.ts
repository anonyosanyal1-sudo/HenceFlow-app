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
  { id: 'todo', label: 'To Do', color: 'bg-muted text-muted-foreground' },
  { id: 'analysis-in-progress', label: 'Analysis', color: 'bg-primary/10 text-primary border-primary/20' },
  { id: 'dev-in-progress', label: 'Development', color: 'bg-secondary/40 text-secondary-foreground border-secondary/60' },
  { id: 'dev-complete', label: 'Dev Complete', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
  { id: 'test-in-progress', label: 'Testing', color: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
  { id: 'test-passed', label: 'Test Passed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { id: 'ready-for-migration', label: 'Ready for Migration', color: 'bg-chart-5/10 text-chart-5 border-chart-5/20' },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

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
