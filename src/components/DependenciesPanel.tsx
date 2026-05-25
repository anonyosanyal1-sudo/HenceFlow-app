import React from 'react';
import { Task, TaskDependency } from '../types';
import { getDependencies, addDependency, removeDependency } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Link, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DependenciesPanelProps {
  task: Task;
  allTasks: Task[];
}

export function DependenciesPanel({ task, allTasks }: DependenciesPanelProps) {
  const [blockedBy, setBlockedBy] = React.useState<TaskDependency[]>([]);
  const [blocking, setBlocking] = React.useState<TaskDependency[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await getDependencies(task.id);
    setBlockedBy(result.blockedBy);
    setBlocking(result.blocking);
    setLoading(false);
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

  const handleAdd = async (dependsOnId: string) => {
    await addDependency(task.id, dependsOnId);
    setSearch('');
    load();
  };

  const handleRemove = async (depId: string) => {
    await removeDependency(depId);
    load();
  };

  const getTask = (id: string) => allTasks.find(t => t.id === id);

  if (loading) return <div className="text-xs text-muted-foreground py-2">Loading…</div>;

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Dependencies
      </label>

      {blockedBy.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Blocked by
          </p>
          {blockedBy.map(dep => {
            const t = getTask(dep.dependsOnId);
            return (
              <div key={dep.id} className="flex items-center gap-2 group">
                <span className="text-xs flex-1 text-muted-foreground truncate">
                  {t?.title ?? dep.dependsOnId.slice(0, 8)}
                </span>
                <button
                  onClick={() => handleRemove(dep.id)}
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
            return (
              <div key={dep.id} className="flex items-center gap-2">
                <span className="text-xs flex-1 text-muted-foreground truncate">
                  {t?.title ?? dep.taskId.slice(0, 8)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {blockedBy.length === 0 && blocking.length === 0 && (
        <p className="text-xs text-muted-foreground/50 italic">No dependencies set</p>
      )}

      <div className="relative">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Add dependency…"
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
  );
}
