import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type ServerEventHandler = (type: string, data: Record<string, unknown>) => void;

export function useServerEvents(
  projectIds: string[],
  onEvent: ServerEventHandler,
) {
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const key = projectIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;

    let es: EventSource | null = null;
    let closed = false;

    const connect = async () => {
      if (closed) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const url = new URL('/api/events', window.location.origin);
      url.searchParams.set('token', token);
      url.searchParams.set('project_ids', key);

      es = new EventSource(url.toString());
      esRef.current = es;

      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as { type: string } & Record<string, unknown>;
          const { type, ...rest } = payload;
          if (type !== 'ping' && type !== 'connected') {
            onEventRef.current(type, rest);
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es?.close();
        if (!closed) {
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      es?.close();
      esRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
