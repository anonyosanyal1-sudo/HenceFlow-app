import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type ServerEventHandler = (type: string, data: Record<string, unknown>) => void;

// Tables with a project_id column — one shared channel per table (no per-project filter).
// The handler receives a projectId from the payload and can ignore irrelevant projects.
const PROJECT_SCOPED_TABLES: { table: string; event: string }[] = [
  { table: 'tasks',                    event: 'tasks:changed' },
  { table: 'milestones',               event: 'milestones:changed' },
  { table: 'comments',                 event: 'comments:changed' },
  { table: 'time_entries',             event: 'time_entries:changed' },
  { table: 'custom_field_definitions', event: 'custom_fields:changed' },
  { table: 'task_templates',           event: 'templates:changed' },
  { table: 'activity_logs',            event: 'activity_logs:changed' },
];

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

  const projectIdsRef = useRef(projectIds);
  projectIdsRef.current = projectIds;

  // Stable key: only re-subscribe when the set of project IDs actually changes.
  const key = projectIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // One channel per project-scoped table (global, filtered client-side by projectId).
    // This is O(tables) instead of O(projects × tables).
    for (const { table, event } of PROJECT_SCOPED_TABLES) {
      const channel = supabase
        .channel(`global_table:${table}`)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table },
          (payload: Record<string, unknown>) => {
            // Only fire for projects we're watching
            const record = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
            const pid = record.project_id as string | undefined;
            if (pid && !projectIdsRef.current.includes(pid)) return;
            onEventRef.current(event, { ...payload, projectId: pid });
          },
        )
        .subscribe();
      channels.push(channel);
    }

    // One channel per global table.
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
