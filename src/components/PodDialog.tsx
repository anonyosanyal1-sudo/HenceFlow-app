import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pod, UserProfile } from '../types';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pod?: Pod | null;
  users: UserProfile[];
  currentUserId: string;
  onSave: (data: { name: string; description?: string; color: string; members: string[] }) => void;
  onDelete?: (podId: string) => void;
}

const POD_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

export function PodDialog({ open, onOpenChange, pod, users, currentUserId, onSave, onDelete }: PodDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState(POD_COLORS[0]);
  const [members, setMembers] = React.useState<string[]>([currentUserId]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (pod) {
      setName(pod.name);
      setDescription(pod.description || '');
      setColor(pod.color);
      setMembers(pod.members);
    } else {
      setName('');
      setDescription('');
      setColor(POD_COLORS[0]);
      setMembers([currentUserId]);
    }
    setConfirmDelete(false);
  }, [pod, open, currentUserId]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description || undefined, color, members });
    onOpenChange(false);
  };

  const toggleMember = (uid: string) => {
    setMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {pod ? 'Edit Pod' : 'Create Pod'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pod Name</label>
            <Input
              placeholder="e.g. Frontend Team"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-10"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <Textarea
              placeholder="What does this pod work on?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
            <div className="flex gap-2 flex-wrap">
              {POD_COLORS.map(c => (
                <button
                  key={c}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all border-2",
                    color === c ? "border-white scale-110 shadow-md" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</label>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {users.map(u => (
                <label key={u.uid} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={members.includes(u.uid)}
                    onChange={() => toggleMember(u.uid)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">{u.displayName || u.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          {pod && onDelete && (
            confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => { onDelete(pod.id); onOpenChange(false); }}>
                  Confirm Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 gap-1.5" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete Pod
              </Button>
            )
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {pod ? 'Save Changes' : 'Create Pod'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
