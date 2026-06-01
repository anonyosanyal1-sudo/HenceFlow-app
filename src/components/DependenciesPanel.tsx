import React from 'react';
import { Task, TaskRelation, DependencyRelationType } from '../types';
import { getDependencies, addDependency, removeDependency } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Link, AlertTriangle, Copy, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

const RELATION_TYPES: { value: DependencyRelationType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'blocks',      label: 'Blocks',      icon: AlertTriangle, color: 'text-amber-400' },
  { value: 'relates_to',  label: 'Relates to',  icon: Link,          color: 'text-sky-400'   },
  { value: 'duplicates',  label: 'Duplicates',  icon: Copy,          color: 'text-violet-400' },
];

interface DependenciesPanelProps {
  task: Task;
  allTasks: Task[];
}

export function DependenciesPanel({ task, allTasks }: DependenciesPanelProps) {
  const [blockedBy, setBlockedBy] = React.useState<TaskRelation[]>([]);
  const [blocking, setBlocking] = React.useState<TaskRelation[]>([]);
  const [search, setSearch] = React.useState('');
  const [relationType, setRelationType] = React.useState<DependencyRelationType>('blocks');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDependencies(task.id);
      setBlockedBy(result.blockedBy);
      setBlocking(result.blocking);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  React.useEffect(() => { load(); }, [load]);

  const blockedByIds = new Set(blockedBy.map(d => d.dependsOnId));
  const blockingIds = new Set(blocking.map(d => d.taskId));
  const selfId = task.id;

  const suggestions = search.trim()
    ? allTasks.filter(t =>
        t.id !== selfId &&
        !blockedByIds.has(t.id) &&
        !blockingIds.has(t.id) &&
        t.title.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  // BFS to detect if adding task → dependsOnId would create a cycle.
  const wouldCreateCycle = (newDepId: string): boolean => {
    // Walk "blocking" edges starting from newDepId to see if we reach task.id.
    const visited = new Set<string>();
    const queue = [newDepId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === task.id) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      // Find tasks that current blocks (i.e. current is a dependency of them).
      const downstreamIds = blocking
        .filter(d => d.taskId === current)
        .map(d => d.dependsOnId);
      queue.push(...downstreamIds);
    }
    return false;
  };

  const handleAdd = async (dependsOnId: string) => {
    setError(null);
    if (relationType === 'blocks' && wouldCreateCycle(dependsOnId)) {
      setError('This dependency would create a circular reference.');
      return;
    }
    try {
      await addDependency(task.id, dependsOnId, relationType);
      setSearch('');
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add dependency');
    }
  };

  const handleRemove = async (depId: string) => {
    setError(null);
    const prevBlockedBy = blockedBy;
    const prevBlocking = blocking;
    setBlockedBy(prev => prev.filter(d => d.id !== depId));
    setBlocking(prev => prev.filter(d => d.id !== depId));
    try {
      await removeDependency(depId);
    } catch (e: any) {
      setBlockedBy(prevBlockedBy);
      setBlocking(prevBlocking);
      setError(e?.message ?? 'Failed to remove dependency');
    }
  };

  const getTask = (id: string) => allTasks.find(t => t.id === id);

  if (loading) return <div className="text-xs text-muted-foreground py-2">Loading…</div>;

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Dependencies
      </label>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-2 py-1.5">{error}</p>
      )}

      {blockedBy.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Blocked by
          </p>
          {blockedBy.map(dep => {
            const t = getTask(dep.dependsOnId);
            const rt = RELATION_TYPES.find(r => r.value === dep.relationType) ?? RELATION_TYPES[0];
            return (
              <div key={dep.id} className="flex items-center gap-2 group">
                <rt.icon className={cn("w-3 h-3 shrink-0", rt.color)} />
                <span className="text-xs flex-1 text-muted-foreground truncate">
                  {t?.title ?? dep.dependsOnId.slice(0, 8)}
                </span>
                <button
                  onClick={() => handleRemove(dep.id)}
                  aria-label="Remove dependency"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {blocking.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-sky-400 flex items-center gap-1">
            <Link className="w-3 h-3" /> Blocking
          </p>
          {blocking.map(dep => {
            const t = getTask(dep.taskId);
            const rt = RELATION_TYPES.find(r => r.value === dep.relationType) ?? RELATION_TYPES[0];
            return (
              <div key={dep.id} className="flex items-center gap-2 group">
                <rt.icon className={cn("w-3 h-3 shrink-0", rt.color)} />
                <span className="text-xs flex-1 text-muted-foreground truncate">
                  {t?.title ?? dep.taskId.slice(0, 8)}
                </span>
                <button
                  onClick={() => handleRemove(dep.id)}
                  aria-label="Remove dependency"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {blockedBy.length === 0 && blocking.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic">No dependencies set</p>
      )}

      <div className="space-y-1.5">
        {/* Relation type selector */}
        <div className="flex gap-1">
          {RELATION_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => setRelationType(rt.value)}
              className={cn(
                "flex items-center gap-1 px-2 h-6 rounded-md text-[11px] font-semibold transition-all border",
                relationType === rt.value
                  ? cn("bg-muted/60", rt.color, "border-current/30")
                  : "text-muted-foreground/40 border-border/20 hover:text-muted-foreground"
              )}
            >
              <rt.icon className="w-3 h-3" />
              {rt.label}
            </button>
          ))}
        </div>
        <div className="relative">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks to link…"
          className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {suggestions.map(t => (
              <button
                key={t.id}
                onClick={() => handleAdd(t.id)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors truncate"
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
