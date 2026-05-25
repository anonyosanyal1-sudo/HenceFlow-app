import React from 'react';
import { Subtask } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubtasksPanelProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  readOnly?: boolean;
}

export function SubtasksPanel({ subtasks, onChange, readOnly }: SubtasksPanelProps) {
  const [newTitle, setNewTitle] = React.useState('');

  const completed = subtasks.filter(s => s.completed).length;

  const addSubtask = () => {
    if (!newTitle.trim()) return;
    onChange([...subtasks, { id: crypto.randomUUID(), title: newTitle.trim(), completed: false }]);
    setNewTitle('');
  };

  const toggle = (id: string) =>
    onChange(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));

  const remove = (id: string) =>
    onChange(subtasks.filter(s => s.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Subtasks
        </label>
        {subtasks.length > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {completed}/{subtasks.length} done
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="w-full bg-muted/40 rounded-full h-1 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-300"
            style={{ width: `${subtasks.length ? (completed / subtasks.length) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((s) => (
          <div key={s.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={s.completed}
              onCheckedChange={() => toggle(s.id)}
              className="shrink-0"
              disabled={readOnly}
            />
            <span className={cn(
              'text-sm flex-1 leading-snug',
              s.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            )}>
              {s.title}
            </span>
            {!readOnly && (
              <button
                onClick={() => remove(s.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubtask()}
            placeholder="Add subtask…"
            className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={addSubtask}
            disabled={!newTitle.trim()}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
