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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { Project, UserProfile, Stage, DEFAULT_STAGES, CustomFieldDefinition } from '../types';
import {
  subscribeToCustomFieldDefinitions,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '../services/api';

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
  { label: 'Slate', value: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  { label: 'Gray', value: 'bg-gray-500/20 text-gray-300 border-gray-500/40' },
  { label: 'Zinc', value: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  { label: 'Neutral', value: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/40' },
  { label: 'Stone', value: 'bg-stone-500/20 text-stone-300 border-stone-500/40' },
  { label: 'Red', value: 'bg-red-500/20 text-red-300 border-red-500/40' },
  { label: 'Orange', value: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { label: 'Amber', value: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { label: 'Yellow', value: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { label: 'Lime', value: 'bg-lime-500/20 text-lime-300 border-lime-500/40' },
  { label: 'Green', value: 'bg-green-500/20 text-green-300 border-green-500/40' },
  { label: 'Emerald', value: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { label: 'Teal', value: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { label: 'Cyan', value: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { label: 'Sky', value: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { label: 'Blue', value: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { label: 'Indigo', value: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { label: 'Violet', value: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { label: 'Purple', value: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { label: 'Fuchsia', value: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
  { label: 'Pink', value: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { label: 'Rose', value: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { label: 'Primary', value: 'bg-primary/20 text-primary border-primary/40' },
  { label: 'Secondary', value: 'bg-secondary/40 text-secondary-foreground border-secondary/60' },
  { label: 'Accent', value: 'bg-accent/40 text-accent-foreground border-accent/60' },
];

export function ProjectDialog({ open, onOpenChange, project, users, currentUserId, onSave, onDelete }: ProjectDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [members, setMembers] = React.useState<string[]>([]);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  // Custom fields state (only for existing projects)
  const [customFields, setCustomFields] = React.useState<CustomFieldDefinition[]>([]);
  const [newFieldName, setNewFieldName] = React.useState('');
  const [newFieldType, setNewFieldType] = React.useState<CustomFieldDefinition['fieldType']>('text');
  const [newFieldOptions, setNewFieldOptions] = React.useState('');

  React.useEffect(() => {
    if (!project?.id) return;
    const unsub = subscribeToCustomFieldDefinitions(project.id, setCustomFields);
    return () => unsub();
  }, [project?.id]);

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
    const validUserIds = new Set(users.map(u => u.uid));
    const cleanedMembers = members.filter(id => validUserIds.has(id));
    onSave({ name, description, members: cleanedMembers, stages });
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
            {project ? 'Pod Settings' : 'New Pod'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {project
              ? 'Update your pod details and members.'
              : 'Create a new pod to organize your projects and tasks.'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
            <TabsTrigger value="stages" className="flex-1 text-xs">Stages</TabsTrigger>
            {project && <TabsTrigger value="fields" className="flex-1 text-xs">Custom Fields</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 focus-visible:outline-none">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pod Name</label>
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
                placeholder="What is this pod about?"
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none h-24 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span>Pod Members</span>
                <span className="text-xs text-muted-foreground">{users.filter(u => members.includes(u.uid)).length} selected</span>
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
                         <UserAvatar
                           photoURL={user.photoURL}
                           displayName={user.displayName}
                           className="h-8 w-8 text-xs shadow-sm shrink-0"
                         />
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
                      <PopoverTrigger
                        className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full border border-border cursor-pointer transition-transform hover:scale-110",
                          stage.color.split(' ')[0].split('/')[0]
                        )} 
                        title="Change Color"
                      />
                      <PopoverContent className="w-64 p-3 bg-card border-border shadow-2xl z-[100]" align="start">
                        <div className="grid grid-cols-5 gap-2">
                          {STAGE_COLORS.map((c) => (
                            <button
                              key={c.value}
                              className={cn(
                                "w-9 h-9 rounded-full border transition-all hover:scale-110",
                                c.value.split(' ')[0].split('/')[0],
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
            <p className="text-xs text-muted-foreground">Adding, removing, or renaming columns applies instantly to the pod board.</p>
          </TabsContent>

          {project && (
            <TabsContent value="fields" className="space-y-4 focus-visible:outline-none">
              <p className="text-xs text-muted-foreground">
                Custom fields appear in every task in this pod. Only owners can manage them.
              </p>
              <div className="space-y-2">
                {customFields.length === 0 && (
                  <p className="text-sm text-muted-foreground/50 italic py-2">No custom fields yet.</p>
                )}
                {customFields.map(f => (
                  <div key={f.id} className="flex items-center gap-2 group">
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-full capitalize shrink-0">{f.fieldType}</span>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400"
                      onClick={() => deleteCustomFieldDefinition(f.id).then(() => setCustomFields(prev => prev.filter(x => x.id !== f.id)))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-xs font-semibold text-muted-foreground">Add new field</p>
                <div className="flex gap-2">
                  <Input
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    placeholder="Field name…"
                    className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary flex-1"
                  />
                  <Select value={newFieldType} onValueChange={(v: CustomFieldDefinition['fieldType']) => setNewFieldType(v)}>
                    <SelectTrigger className="h-8 text-xs bg-muted/50 border-none w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text" className="text-xs">Text</SelectItem>
                      <SelectItem value="number" className="text-xs">Number</SelectItem>
                      <SelectItem value="url" className="text-xs">URL</SelectItem>
                      <SelectItem value="select" className="text-xs">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newFieldType === 'select' && (
                  <Input
                    value={newFieldOptions}
                    onChange={e => setNewFieldOptions(e.target.value)}
                    placeholder="Options (comma-separated)"
                    className="h-8 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={!newFieldName.trim()}
                  onClick={async () => {
                    if (!newFieldName.trim() || !project?.id) return;
                    const options = newFieldType === 'select'
                      ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
                      : [];
                    await createCustomFieldDefinition(project.id, { name: newFieldName.trim(), fieldType: newFieldType, options });
                    setNewFieldName('');
                    setNewFieldOptions('');
                    setNewFieldType('text');
                  }}
                >
                  <Plus className="w-3 h-3" /> Add Field
                </Button>
              </div>
            </TabsContent>
          )}
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
                  Delete Pod
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
            {project ? 'Save Changes' : 'Create Pod'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
