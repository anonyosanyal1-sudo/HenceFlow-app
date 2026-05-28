import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Pod, UserProfile, Stage, DEFAULT_STAGES } from '../types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pod?: Pod | null;
  users: UserProfile[];
  currentUserId: string;
  onSave: (data: { name: string; description?: string; color: string; members: string[]; stages: Stage[] }) => void;
  onDelete?: (podId: string) => void;
}

const POD_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

const STAGE_COLORS = [
  { label: 'Zinc',    value: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { label: 'Violet',  value: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { label: 'Blue',    value: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { label: 'Sky',     value: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { label: 'Amber',   value: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { label: 'Emerald', value: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { label: 'Rose',    value: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { label: 'Green',   value: 'bg-green-500/20 text-green-300 border-green-500/40' },
  { label: 'Orange',  value: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { label: 'Red',     value: 'bg-red-500/20 text-red-300 border-red-500/40' },
  { label: 'Indigo',  value: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { label: 'Pink',    value: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
];

export function PodDialog({ open, onOpenChange, pod, users, currentUserId, onSave, onDelete }: PodDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState(POD_COLORS[0]);
  const [members, setMembers] = React.useState<string[]>([currentUserId]);
  const [stages, setStages] = React.useState<Stage[]>([...DEFAULT_STAGES]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (pod) {
      setName(pod.name);
      setDescription(pod.description || '');
      setColor(pod.color);
      setMembers(pod.members.length > 0 ? pod.members : [currentUserId]);
      setStages(pod.stages?.length > 0 ? [...pod.stages] : [...DEFAULT_STAGES]);
    } else {
      setName('');
      setDescription('');
      setColor(POD_COLORS[0]);
      setMembers([currentUserId]);
      setStages([...DEFAULT_STAGES]);
    }
    setConfirmDelete(false);
  }, [pod, open, currentUserId]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description || undefined, color, members, stages });
    onOpenChange(false);
  };

  const toggleMember = (uid: string) => {
    setMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAddStage = () => {
    setStages(prev => [...prev, {
      id: `stage-${Date.now()}`,
      label: 'New Stage',
      color: STAGE_COLORS[0].value,
    }]);
  };

  const updateStageLabel = (index: number, label: string) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, label } : s));
  };

  const updateStageColor = (index: number, stageColor: string) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, color: stageColor } : s));
  };

  const removeStage = (index: number) => {
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[520px] h-[82vh] flex flex-col p-0 gap-0 bg-card border-border">

        <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-lg font-bold text-foreground">
            {pod ? 'Pod Settings' : 'New Pod'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pod ? 'Update pod details, members and workflow stages.' : 'Create a new pod to organize work.'}
          </p>
        </div>

        <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-6 pt-3">
            <TabsList className="bg-muted/40 border border-border/30 rounded-xl h-9 p-1">
              <TabsTrigger value="general" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm h-7 px-3">General</TabsTrigger>
              <TabsTrigger value="stages" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm h-7 px-3">Stages</TabsTrigger>
            </TabsList>
          </div>

          {/* General */}
          <TabsContent value="general" className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 pt-4 mt-0 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pod Name *</label>
              <Input placeholder="e.g. Frontend Team" value={name} onChange={e => setName(e.target.value)} className="h-10" autoFocus />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea placeholder="What does this pod work on?" value={description} onChange={e => setDescription(e.target.value)} className="resize-none h-20" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
              <div className="flex gap-2 flex-wrap">
                {POD_COLORS.map(c => (
                  <button key={c} type="button"
                    className={cn("w-7 h-7 rounded-full transition-all border-2", color === c ? "border-white scale-110 shadow-md" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                <span>Members</span>
                <span className="normal-case font-normal text-muted-foreground/70">{users.filter(u => members.includes(u.uid)).length} selected</span>
              </label>
              <ScrollArea className="h-[130px] border border-border rounded-lg bg-muted/20 p-2">
                <div className="space-y-0.5">
                  {users.map(u => (
                    <div key={u.uid}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                      onClick={() => toggleMember(u.uid)}
                    >
                      <Checkbox checked={members.includes(u.uid)} className="border-primary data-[state=checked]:bg-primary" />
                      <UserAvatar photoURL={u.photoURL} displayName={u.displayName} className="w-7 h-7 text-xs shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{u.displayName || 'Anonymous'}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Stages */}
          <TabsContent value="stages" className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 pt-4 mt-0">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Board Columns</label>
              <Button variant="outline" size="sm" onClick={handleAddStage} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Stage
              </Button>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/30">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  <div className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 min-w-[70px] text-center truncate", stage.color)}>
                    {stage.label || 'Stage'}
                  </div>
                  <Input
                    value={stage.label}
                    onChange={e => updateStageLabel(index, e.target.value)}
                    className="h-7 text-xs flex-1 bg-transparent border-none focus-visible:ring-0 px-2"
                    placeholder="Stage name"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0">Color</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <div className="grid grid-cols-3 gap-1.5">
                        {STAGE_COLORS.map(sc => (
                          <button key={sc.value} onClick={() => updateStageColor(index, sc.value)}
                            className={cn("px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all", sc.value, stage.color === sc.value && "ring-2 ring-primary ring-offset-1")}>
                            {sc.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button onClick={() => removeStage(index)} disabled={stages.length <= 1}
                    className="text-muted-foreground/40 hover:text-rose-400 transition-colors p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-3">
              The last stage is treated as "completed" for progress tracking.
            </p>
          </TabsContent>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-border/40 flex items-center justify-between gap-2">
            {pod && onDelete && (
              confirmDelete ? (
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { onDelete(pod.id); onOpenChange(false); }}>Confirm Delete</Button>
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
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                {pod ? 'Save Changes' : 'Create Pod'}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
