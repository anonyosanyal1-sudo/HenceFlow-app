import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type ServerEventHandler = (type: string, data: Record<string, unknown>) => void;

// Tables scoped to a project_id
const PROJECT_SCOPED_TABLES: { table: string; event: string }[] = [
  { table: 'tasks',                    event: 'tasks:changed' },
  { table: 'milestones',               event: 'milestones:changed' },
  { table: 'comments',                 event: 'comments:changed' },
  { table: 'time_entries',             event: 'time_entries:changed' },
  { table: 'custom_field_definitions', event: 'custom_fields:changed' },
  { table: 'task_templates',           event: 'templates:changed' },
  { table: 'activity_logs',            event: 'activity_logs:changed' },
];

// Tables that are global (no project_id filter).
// 'projects' is here because the projects table has no project_id column.
const GLOBAL_TABLES: { table: string; event: string }[] = [
  { table: 'pods',      event: 'pods:changed' },
  { table: 'companies', event: 'companies:changed' },
  { table: 'projects',  event: 'projects:changed' },
];

export function useServerEvents(
  projectIds: string[],
  onEvent: ServerEventHandler,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const key = projectIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Per-project channels for project-scoped tables
    for (const pid of projectIds) {
      for (const { table, event } of PROJECT_SCOPED_TABLES) {
        const channel = supabase
          .channel(`${table}:${pid}`)
          .on(
            'postgres_changes' as any,
            {
              event: '*',
              schema: 'public',
              table,
              filter: `project_id=eq.${pid}`,
            },
            (payload: Record<string, unknown>) => {
              onEventRef.current(event, payload);
            },
          )
          .subscribe();
        channels.push(channel);
      }
    }

    // Single channel for global tables
    for (const { table, event } of GLOBAL_TABLES) {
      const channel = supabase
        .channel(`global:${table}`)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table },
          (payload: Record<string, unknown>) => {
            onEventRef.current(event, payload);
          },
        )
        .subscribe();
      channels.push(channel);
    }

    return () => {
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
