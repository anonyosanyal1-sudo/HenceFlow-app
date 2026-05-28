import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { Project, UserProfile, CustomFieldDefinition } from '../types';
import {
  subscribeToCustomFieldDefinitions,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '../services/api';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  users: UserProfile[];
  currentUserId: string;
  onSave: (data: { name: string; description: string; members: string[]; managerId?: string; color?: string }) => void;
  onDelete?: (projectId: string) => void;
}

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

export function ProjectDialog({
  open, onOpenChange, project, users, currentUserId, onSave, onDelete,
}: ProjectDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [managerId, setManagerId] = React.useState<string>('');
  const [members, setMembers] = React.useState<string[]>([]);
  const [color, setColor] = React.useState(PROJECT_COLORS[0]);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  const [customFields, setCustomFields] = React.useState<CustomFieldDefinition[]>([]);
  const [newFieldName, setNewFieldName] = React.useState('');
  const [newFieldType, setNewFieldType] = React.useState<CustomFieldDefinition['fieldType']>('text');

  React.useEffect(() => {
    if (!project?.id) return;
    const unsub = subscribeToCustomFieldDefinitions(project.id, setCustomFields);
    return () => unsub();
  }, [project?.id]);

  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setManagerId(project.managerId || project.ownerId || currentUserId);
      setMembers(project.members || []);
      setColor(project.color || PROJECT_COLORS[0]);
      setIsConfirmingDelete(false);
    } else {
      setName('');
      setDescription('');
      setManagerId(currentUserId);
      setMembers([currentUserId]);
      setColor(PROJECT_COLORS[0]);
      setIsConfirmingDelete(false);
    }
  }, [project, open, currentUserId]);

  const handleSave = () => {
    if (!name.trim()) return;
    const validUserIds = new Set(users.map(u => u.uid));
    const cleanedMembers = members.filter(id => validUserIds.has(id));
    onSave({ name: name.trim(), description, members: cleanedMembers, managerId: managerId || currentUserId, color });
    onOpenChange(false);
  };

  const toggleMember = (uid: string) => {
    const isOwner = uid === (project?.ownerId ?? currentUserId);
    if (isOwner) return;
    setMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAddField = async () => {
    if (!newFieldName.trim() || !project?.id) return;
    await createCustomFieldDefinition(project.id, { name: newFieldName.trim(), fieldType: newFieldType, options: [] });
    setNewFieldName('');
    setNewFieldType('text');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border sm:max-w-[520px] h-[82vh] flex flex-col p-0 gap-0">

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-lg font-bold text-foreground">
            {project ? 'Project Settings' : 'New Project'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-0.5">
            {project ? 'Update project details and members.' : 'Create a new project for your team.'}
          </DialogDescription>
        </div>

        <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-6 pt-3">
            <TabsList className="bg-muted/40 border border-border/30 rounded-xl h-9 p-1">
              <TabsTrigger value="general" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm h-7 px-3">General</TabsTrigger>
              {project && (
                <TabsTrigger value="custom-fields" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm h-7 px-3">Custom Fields</TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── General tab ─────────────────────────────────────────────────── */}
          <TabsContent value="general" className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 pt-4 space-y-4 mt-0">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Name *</label>
              <Input
                placeholder="e.g. Website Redesign"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Textarea
                placeholder="What is this project about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="resize-none h-20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Manager</label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>
                      <div className="flex items-center gap-2">
                        <UserAvatar photoURL={u.photoURL} displayName={u.displayName} className="w-5 h-5 text-[9px]" />
                        <span>{u.displayName || u.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</span>
                <span className="text-xs text-muted-foreground">{users.filter(u => members.includes(u.uid)).length} selected</span>
              </label>
              <ScrollArea className="h-[140px] border border-border rounded-lg bg-muted/20 p-2">
                <div className="space-y-0.5">
                  {users.map(user => {
                    const isOwner = user.uid === (project?.ownerId ?? currentUserId);
                    const isSelected = members.includes(user.uid);
                    return (
                      <div
                        key={user.uid}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                        onClick={() => toggleMember(user.uid)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isOwner}
                          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                        <UserAvatar photoURL={user.photoURL} displayName={user.displayName} className="h-7 w-7 text-xs shadow-sm shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{user.displayName || 'Anonymous'}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                        </div>
                        {isOwner && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Owner</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={cn("w-7 h-7 rounded-full transition-all border-2", color === c ? "border-white scale-110 shadow-md" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Custom Fields tab ────────────────────────────────────────────── */}
          {project && (
            <TabsContent value="custom-fields" className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 pt-4 mt-0">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Custom fields are available on all tasks in this project.</p>
                {customFields.map(field => (
                  <div key={field.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{field.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{field.fieldType}</p>
                    </div>
                    <button
                      onClick={() => deleteCustomFieldDefinition(field.id).then(() => setCustomFields(prev => prev.filter(f => f.id !== field.id)))}
                      className="text-muted-foreground/40 hover:text-rose-400 transition-colors p-1 rounded-md hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Field name"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    className="h-9 flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddField(); }}
                  />
                  <Select value={newFieldType} onValueChange={v => setNewFieldType(v as CustomFieldDefinition['fieldType'])}>
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddField} disabled={!newFieldName.trim()} className="h-9 px-3">Add</Button>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="shrink-0 px-6 py-4 border-t border-border/40 flex items-center justify-between gap-2">
            {project && onDelete && (
              isConfirmingDelete ? (
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { onDelete(project.id); onOpenChange(false); }}>
                    Confirm Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 gap-1.5" onClick={() => setIsConfirmingDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              )
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                {project ? 'Save Changes' : 'Create Project'}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
