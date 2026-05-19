import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { Project, UserProfile, Stage, DEFAULT_STAGES } from '../types';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  users: UserProfile[]; // Users in the current company
  currentUserId: string;
  onSave: (project: { name: string; description: string; members: string[]; stages: Stage[] }) => void;
  onDelete?: (projectId: string) => void;
}

const STAGE_COLORS = [
  { label: 'Slate', value: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { label: 'Gray', value: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  { label: 'Zinc', value: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { label: 'Neutral', value: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
  { label: 'Stone', value: 'bg-stone-500/10 text-stone-400 border-stone-500/20' },
  { label: 'Red', value: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { label: 'Orange', value: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { label: 'Amber', value: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { label: 'Yellow', value: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { label: 'Lime', value: 'bg-lime-500/10 text-lime-500 border-lime-500/20' },
  { label: 'Green', value: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { label: 'Emerald', value: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { label: 'Teal', value: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  { label: 'Cyan', value: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { label: 'Sky', value: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  { label: 'Blue', value: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { label: 'Indigo', value: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { label: 'Violet', value: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  { label: 'Purple', value: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { label: 'Fuchsia', value: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20' },
  { label: 'Pink', value: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { label: 'Rose', value: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { label: 'Primary', value: 'bg-primary/20 text-primary border-primary/30' },
  { label: 'Secondary', value: 'bg-secondary/20 text-secondary border-secondary/30' },
  { label: 'Accent', value: 'bg-accent/20 text-accent-foreground border-accent/30' },
];

export function ProjectDialog({ open, onOpenChange, project, users, currentUserId, onSave, onDelete }: ProjectDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [members, setMembers] = React.useState<string[]>([]);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setMembers(project.members || []);
      setStages(project.stages || [...DEFAULT_STAGES]);
      setIsConfirmingDelete(false);
    } else {
      setName('');
      setDescription('');
      setMembers([currentUserId]);
      setStages([...DEFAULT_STAGES]);
      setIsConfirmingDelete(false);
    }
  }, [project, open, currentUserId]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name, description, members, stages });
    onOpenChange(false);
  };

  const toggleMember = (uid: string) => {
    if (members.includes(uid)) {
      if (uid === project?.ownerId || (!project && uid === currentUserId)) return; // Prevent owner removal
      setMembers(prev => prev.filter(id => id !== uid));
    } else {
      setMembers(prev => [...prev, uid]);
    }
  };

  const handleAddStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      label: 'New Stage',
      color: 'bg-muted text-muted-foreground border-border',
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (index: number, newLabel: string) => {
    setStages(stages.map((s, i) => i === index ? { ...s, label: newLabel } : s));
  };

  const updateStageColor = (index: number, newColor: string) => {
    setStages(stages.map((s, i) => i === index ? { ...s, color: newColor } : s));
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {project ? 'Workspace Settings' : 'New Workspace'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {project 
              ? 'Update your workspace details and members.' 
              : 'Create a new workspace to organize your projects and tasks.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="stages" className="flex-1">Stages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 focus-visible:outline-none">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Workspace Name</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Mobile App, Marketing Campaign" 
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description (Optional)</label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="What is this workspace about?" 
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none h-24 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span>Workspace Members</span>
                <span className="text-xs text-muted-foreground">{members.length} selected</span>
              </label>
              <ScrollArea className="h-[150px] border border-border rounded-lg bg-muted/20 p-2">
                <div className="space-y-1">
                  {users.map(user => {
                    const isOwner = user.uid === (project?.ownerId || currentUserId);
                    const isSelected = members.includes(user.uid);
                    
                    return (
                      <div 
                        key={user.uid} 
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                        onClick={() => toggleMember(user.uid)}
                      >
                         <Checkbox 
                           checked={isSelected}
                           disabled={isOwner}
                           className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                         />
                         <Avatar className="h-8 w-8 border border-border shadow-sm">
                           <AvatarImage src={user.photoURL || undefined} />
                           <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                             {user.displayName?.[0] || 'U'}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col flex-1 min-w-0">
                           <span className="text-sm font-medium text-foreground truncate">
                             {user.displayName || 'Anonymous User'}
                           </span>
                           <span className="text-[10px] text-muted-foreground truncate">
                             {user.email}
                           </span>
                         </div>
                         {isOwner && (
                           <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                             Owner
                           </span>
                         )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="stages" className="space-y-4 focus-visible:outline-none">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Board Columns</label>
              <Button variant="outline" size="sm" onClick={handleAddStage} className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Stage
              </Button>
            </div>
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center space-x-2 group">
                    <Popover>
                      <PopoverTrigger asChild>
                         <button 
                           className={cn(
                             "flex-shrink-0 w-6 h-6 rounded-full border border-border cursor-pointer transition-transform hover:scale-110",
                             stage.color.split(' ')[0]
                           )} 
                           title="Change Color"
                         />
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 bg-card border-border shadow-2xl z-[100]" align="start">
                        <div className="grid grid-cols-5 gap-2">
                          {STAGE_COLORS.map((c) => (
                            <button
                              key={c.value}
                              className={cn(
                                "w-9 h-9 rounded-full border transition-all hover:scale-110",
                                c.value.split(' ')[0],
                                stage.color === c.value ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-border"
                              )}
                              onClick={() => updateStageColor(index, c.value)}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input 
                      value={stage.label}
                      onChange={(e) => updateStage(index, e.target.value)}
                      className="h-8 bg-muted/50 border-none focus-visible:ring-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeStage(index)}
                      className="h-8 w-8 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-500/10"
                      disabled={stages.length <= 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">Adding, removing, or renaming columns applies instantly to the workspace board.</p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-4">
          {project && onDelete && (
            <div className="flex items-center gap-2">
              {isConfirmingDelete ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground mr-1"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      onDelete(project.id);
                      onOpenChange(false);
                    }}
                  >
                    Confirm
                  </Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-red-400 hover:text-red-500 hover:bg-red-400/10 font-semibold"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  Delete Workspace
                </Button>
              )}
            </div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">Cancel</Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold px-6" 
            onClick={handleSave}
            disabled={!name.trim() || stages.length === 0}
          >
            {project ? 'Save Changes' : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
