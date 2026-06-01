import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Milestone } from '../types';
import { createMilestone, updateMilestone, deleteMilestone } from '../services/api';
import { Plus, Trash2, Pencil, Check, X, Milestone as MilestoneIcon } from 'lucide-react';
import { format } from 'date-fns';

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestones: Milestone[];
  onMilestoneDeleted?: (milestoneId: string) => void;
}

export function MilestoneDialog({ open, onOpenChange, projectId, milestones, onMilestoneDeleted }: MilestoneDialogProps) {
  const [newName, setNewName] = React.useState('');
  const [newDate, setNewDate] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await createMilestone(projectId, newName.trim(), newDate || undefined);
    setNewName('');
    setNewDate('');
    setSaving(false);
  };

  const startEdit = (m: Milestone) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditDate(m.dueDate ?? '');
  };

  const handleUpdate = async (milestoneId: string) => {
    setSaving(true);
    await updateMilestone(milestoneId, { name: editName.trim() || undefined, dueDate: editDate || undefined });
    setEditingId(null);
    setSaving(false);
  };

  const handleDelete = async (milestoneId: string) => {
    await deleteMilestone(milestoneId);
    onMilestoneDeleted?.(milestoneId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Milestones</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage project milestones and link tasks to them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {milestones.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MilestoneIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground/50">No milestones yet</p>
            </div>
          )}

          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2 group">
              {editingId === m.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary flex-1"
                  />
                  <Input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary w-32"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400" onClick={() => handleUpdate(m.id)} disabled={saving}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    {m.dueDate && (
                      <p className="text-[11px] text-muted-foreground">
                        Due {format(new Date(m.dueDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    onClick={() => startEdit(m)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="New milestone name…"
              className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary flex-1"
            />
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary w-32"
            />
            <Button
              size="icon" variant="ghost"
              className="h-8 w-8 text-primary"
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
