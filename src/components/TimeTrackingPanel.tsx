import React from 'react';
import { TimeEntry, UserProfile } from '../types';
import { getTimeEntries, logTime, deleteTimeEntry } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Trash2, Play, Square } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TimeTrackingPanelProps {
  taskId: string;
  projectId: string;
  currentUserId: string;
  users: UserProfile[];
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TimeTrackingPanel({ taskId, projectId, currentUserId, users }: TimeTrackingPanelProps) {
  const [entries, setEntries] = React.useState<TimeEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hours, setHours] = React.useState('');
  const [minutes, setMinutes] = React.useState('');
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Live timer state
  const [timerRunning, setTimerRunning] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTimeEntries(taskId);
      setEntries(data);
    } catch {
      setLoadError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const stopTimer = () => {
    setTimerRunning(false);
    const mins = Math.max(1, Math.round(timerSeconds / 60));
    setMinutes(String(mins));
    setTimerSeconds(0);
  };

  const handleLog = async () => {
    const totalMins = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');
    if (totalMins <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await logTime(taskId, projectId, totalMins, note.trim() || undefined);
      setHours('');
      setMinutes('');
      setNote('');
      load();
    } catch {
      setSaveError('Failed to log time');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeEntry(id);
      load();
    } catch {
      // entry will reappear on next load
    }
  };

  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  const myTotal = entries.filter(e => e.userId === currentUserId).reduce((sum, e) => sum + e.minutes, 0);

  const getUserName = (uid: string) => users.find(u => u.uid === uid)?.displayName ?? 'Unknown';

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
  };

  if (loadError) {
    return <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mt-2">{loadError}</p>;
  }

  return (
    <div className="space-y-4">
      {saveError && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{saveError}</p>
      )}
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground font-medium">Total logged</p>
          <p className="text-lg font-bold text-foreground">{formatMinutes(total)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground font-medium">My time</p>
          <p className="text-lg font-bold text-primary">{formatMinutes(myTotal)}</p>
        </div>
      </div>

      {/* Live timer */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-mono text-sm font-semibold text-foreground flex-1">
          {formatTimer(timerSeconds)}
        </span>
        {!timerRunning ? (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setTimerRunning(true)}>
            <Play className="w-3 h-3" /> Start
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs border-amber-400/40 text-amber-400 hover:bg-amber-400/10" onClick={stopTimer}>
            <Square className="w-3 h-3" /> Stop
          </Button>
        )}
      </div>

      {/* Manual log form */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Log time manually</p>
        <div className="flex gap-2">
          <Input
            value={hours}
            onChange={e => setHours(e.target.value.replace(/\D/g, ''))}
            placeholder="0h"
            className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary w-16"
          />
          <Input
            value={minutes}
            onChange={e => setMinutes(e.target.value.replace(/\D/g, ''))}
            placeholder="0m"
            className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary w-16"
          />
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary flex-1"
          />
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={handleLog}
            disabled={saving || (parseInt(hours || '0') * 60 + parseInt(minutes || '0')) <= 0}
          >
            Log
          </Button>
        </div>
      </div>

      {/* History */}
      {!loading && entries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">History</p>
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 group text-xs py-1">
              <span className="font-semibold text-foreground w-12 shrink-0">{formatMinutes(entry.minutes)}</span>
              <span className="text-muted-foreground flex-1 truncate">
                {getUserName(entry.userId)}
                {entry.note && <span className="text-muted-foreground/50"> · {entry.note}</span>}
              </span>
              <span className="text-muted-foreground/40 shrink-0">
                {entry.loggedAt ? formatDistanceToNow(new Date(entry.loggedAt), { addSuffix: true }) : ''}
              </span>
              {entry.userId === currentUserId && (
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic text-center py-4">No time logged yet</p>
      )}
    </div>
  );
}
