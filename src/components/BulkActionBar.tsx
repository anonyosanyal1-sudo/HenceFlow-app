import React from 'react';
import { Task, TaskStatus, TaskPriority, UserProfile, Stage, Milestone } from '../types';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Trash2, ArrowRight, User, Flag, Milestone as MilestoneIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  stages: Stage[];
  users: UserProfile[];
  milestones: Milestone[];
  onMoveToStage: (status: TaskStatus) => void;
  onAssign: (assigneeId: string | null) => void;
  onSetPriority: (priority: TaskPriority) => void;
  onSetMilestone: (milestoneId: string | null) => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedIds, onClear, stages, users, milestones,
  onMoveToStage, onAssign, onSetPriority, onSetMilestone, onDelete,
}: BulkActionBarProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const count = selectedIds.size;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 bg-card border border-border shadow-2xl rounded-2xl px-4 py-3">
            <span className="text-sm font-bold text-foreground min-w-[60px]">
              {count} selected
            </span>
            <div className="w-px h-6 bg-border" />

            {/* Move to stage */}
            <Select onValueChange={onMoveToStage}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-36">
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <SelectValue placeholder="Move to…" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assign */}
            <Select onValueChange={(v: string) => onAssign(v === 'unassigned' ? null : v)}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-32">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <SelectValue placeholder="Assign…" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned" className="text-xs italic text-muted-foreground">Unassign</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.uid} value={u.uid} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={u.photoURL || undefined} />
                        <AvatarFallback className="text-[8px]">{u.displayName?.[0] ?? 'U'}</AvatarFallback>
                      </Avatar>
                      {u.displayName ?? 'Unnamed'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select onValueChange={v => onSetPriority(v as TaskPriority)}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-32">
                <div className="flex items-center gap-1.5">
                  <Flag className="w-3 h-3 text-muted-foreground" />
                  <SelectValue placeholder="Priority…" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Milestone */}
            {milestones.length > 0 && (
              <Select onValueChange={(v: string) => onSetMilestone(v === 'none' ? null : v)}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-36">
                  <div className="flex items-center gap-1.5">
                    <MilestoneIcon className="w-3 h-3 text-muted-foreground" />
                    <SelectValue placeholder="Milestone…" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs italic text-muted-foreground">None</SelectItem>
                  {milestones.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="w-px h-6 bg-border" />

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs bg-red-500" onClick={() => { onDelete(); setConfirmDelete(false); }}>
                  Delete {count}
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/50" onClick={onClear}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
