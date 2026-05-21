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
  { id: 'todo',                 label: 'To Do',               color: 'bg-muted/70 text-muted-foreground border-border' },
  { id: 'analysis-in-progress', label: 'Analysis',            color: 'bg-primary/20 text-primary border-primary/40' },
  { id: 'dev-in-progress',      label: 'Development',         color: 'bg-chart-5/20 text-chart-5 border-chart-5/40' },
  { id: 'dev-complete',         label: 'Dev Complete',        color: 'bg-chart-4/20 text-chart-4 border-chart-4/40' },
  { id: 'test-in-progress',     label: 'Testing',             color: 'bg-chart-2/20 text-chart-2 border-chart-2/40' },
  { id: 'test-passed',          label: 'Test Passed',         color: 'bg-chart-3/20 text-chart-3 border-chart-3/40' },
  { id: 'ready-for-migration',  label: 'Ready for Migration', color: 'bg-chart-1/20 text-chart-1 border-chart-1/40' },
  { id: 'closed',               label: 'Closed',              color: 'bg-chart-3/30 text-chart-3 border-chart-3/50' },
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
