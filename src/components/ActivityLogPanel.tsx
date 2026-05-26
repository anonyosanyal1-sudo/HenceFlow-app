import React from 'react';
import { ActivityLog, UserProfile } from '../types';
import { getActivityLogs } from '../services/api';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from './UserAvatar';

interface ActivityLogPanelProps {
  taskId: string;
  users: UserProfile[];
}

const ACTION_LABELS: Record<string, string> = {
  task_created: 'created this task',
  status_changed: 'changed status',
  priority_changed: 'changed priority',
  assignee_changed: 'changed assignee',
  title_changed: 'updated title',
  description_changed: 'updated description',
  due_date_changed: 'changed due date',
  milestone_changed: 'changed milestone',
  recurrence_changed: 'changed recurrence',
  subtask_added: 'added a subtask',
  subtask_completed: 'completed a subtask',
  time_logged: 'logged time',
  comment_added: 'added a comment',
};

export function ActivityLogPanel({ taskId, users }: ActivityLogPanelProps) {
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchLogs = React.useCallback(() => {
    setLoading(true);
    getActivityLogs(taskId).then(data => {
      setLogs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [taskId]);

  React.useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel(`activity_logs:task:${taskId}`)
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'activity_logs',
        filter: `task_id=eq.${taskId}`,
      }, () => { fetchLogs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, fetchLogs]);

  const getUser = (uid: string) => users.find(u => u.uid === uid);

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Loading activity…</div>;
  }

  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground/50 italic text-center py-8">No activity recorded yet</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const user = getUser(log.userId);
        return (
          <div key={log.id} className="flex items-start gap-3 text-xs">
            <UserAvatar
              photoURL={user?.photoURL ?? null}
              displayName={user?.displayName ?? null}
              className="h-6 w-6 text-[9px] shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground">
                {user?.displayName ?? 'Someone'}
              </span>
              {' '}
              <span className="text-muted-foreground">
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
              {log.oldValue && log.newValue && (
                <span className="text-muted-foreground">
                  {' '}from{' '}
                  <span className="text-muted-foreground/70 line-through">{log.oldValue}</span>
                  {' '}to{' '}
                  <span className="text-foreground/80">{log.newValue}</span>
                </span>
              )}
              {!log.oldValue && log.newValue && (
                <span className="text-muted-foreground">
                  {' '}→ <span className="text-foreground/80">{log.newValue}</span>
                </span>
              )}
              <p className="text-muted-foreground/40 mt-0.5">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
