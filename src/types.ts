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
  { id: 'analysis-in-progress', label: 'Analysis', color: 'bg-primary/20 text-primary border-primary/30' },
  { id: 'dev-in-progress', label: 'Development', color: 'bg-secondary/20 text-secondary border-secondary/30' },
  { id: 'dev-complete', label: 'Dev Complete', color: 'bg-chart-4/20 text-chart-4 border-chart-4/30' },
  { id: 'test-in-progress', label: 'Testing', color: 'bg-chart-3/20 text-chart-3 border-chart-3/30' },
  { id: 'test-passed', label: 'Test Passed', color: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30' },
  { id: 'ready-for-migration', label: 'Ready for Migration', color: 'bg-chart-5/20 text-chart-5 border-chart-5/30' },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-900/40 text-emerald-500 border-emerald-800/50' },
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

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
