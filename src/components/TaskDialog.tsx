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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Task, TaskStatus, TaskPriority, UserProfile, Stage } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskComments } from './TaskComments';
import { cn } from '@/lib/utils';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  users: UserProfile[];
  stages: Stage[];
  activeProjectId?: string;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

const MAX_DESCRIPTION_LENGTH = 1000;

export function TaskDialog({ open, onOpenChange, task, defaultStatus, users, stages, activeProjectId, onSave, onDelete }: TaskDialogProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>('todo');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState('details');
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assigneeId);
      setDueDate(task.dueDate || '');
      setActiveTab('details');
      setIsConfirmingDelete(false);
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || 'todo');
      setPriority('medium');
      setAssigneeId(undefined);
      setDueDate('');
      setActiveTab('details');
      setIsConfirmingDelete(false);
    }
  }, [task, defaultStatus, open]);

  const isDescriptionTooLong = description.length > MAX_DESCRIPTION_LENGTH;

  const handleSave = () => {
    if (!title.trim() || isDescriptionTooLong) return;
    onSave({
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate: dueDate || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px] flex flex-col h-[90vh] md:h-auto md:max-h-[85vh] bg-card border-border", task && "sm:max-w-[800px]")}>
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {task ? 'Task Details' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {task ? `Task ID: ${task.id.slice(0, 8)}` : 'Enter the details for your task.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {task ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted p-1 rounded-xl shrink-0">
              <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Details</TabsTrigger>
              <TabsTrigger value="discussion" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Discussion</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0">
              <TabsContent value="details" className="h-full overflow-y-auto space-y-6 mt-0 pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                        Title
                        <span className="text-red-500 ml-1 font-bold">*</span>
                      </label>
                      <Input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="What needs to be done?"
                        className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary transition-all font-medium text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                        <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                          <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                            <SelectValue placeholder="Select status">
                              {(() => {
                                const currentStage = stages.find(s => s.id === status);
                                const solidColor = currentStage ? currentStage.color.split(' ').find(c => c.startsWith('bg-'))?.split('/')[0] : '';
                                return currentStage ? (
                                  <div className="flex items-center">
                                    <div className={cn("w-2 h-2 rounded-full mr-2", solidColor)} />
                                    <span className="font-medium text-sm">{currentStage.label}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm">{status}</span>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {stages.map((s) => {
                              const solidColor = s.color.split(' ').find(c => c.startsWith('bg-'))?.split('/')[0];
                              return (
                                <SelectItem key={s.id} value={s.id}>
                                  <div className="flex items-center">
                                    <div className={cn("w-2 h-2 rounded-full mr-2", solidColor)} />
                                    <span className="text-sm">{s.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                        <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                          <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignee</label>
                      <Select value={assigneeId || "unassigned"} onValueChange={(v) => setAssigneeId(v === "unassigned" ? undefined : v)}>
                        <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-10">
                          <SelectValue placeholder="Select assignee">
                            {assigneeId && users.find(u => u.uid === assigneeId) ? (
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const user = users.find(u => u.uid === assigneeId);
                                  return (
                                    <>
                                      <Avatar className="h-5 w-5 border border-border">
                                        <AvatarImage src={user?.photoURL || undefined} />
                                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                          {user?.displayName?.[0] || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{user?.displayName || 'Unnamed User'}</span>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] bg-popover border-border">
                          <SelectItem value="unassigned" className="font-medium text-muted-foreground italic">
                            <div className="flex items-center space-x-2 py-0.5">
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                              </div>
                              <span>Unassigned</span>
                            </div>
                          </SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.uid} value={user.uid}>
                              <div className="flex items-center space-x-2 py-0.5">
                                <Avatar className="h-5 w-5 border border-border shadow-sm">
                                  <AvatarImage src={user.photoURL || undefined} />
                                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                                    {user.displayName?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm text-foreground">{user.displayName || 'Unnamed User'}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
                      <Input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary transition-all font-medium h-10 text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        isDescriptionTooLong ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {description.length}/{MAX_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                    <Textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Add more details about this task..."
                      className={cn(
                        "min-h-[220px] bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm transition-all text-foreground",
                        isDescriptionTooLong && "ring-1 ring-red-500"
                      )}
                    />
                    {isDescriptionTooLong && (
                      <p className="text-[10px] text-red-500 font-medium">Description exceeds character limit</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="discussion" className="mt-0 h-full overflow-hidden">
                <TaskComments 
                  key={task.id}
                  projectId={task.projectId || activeProjectId || ''} 
                  taskId={task.id} 
                  users={users} 
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 py-4 pr-2 -mr-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center">
                Title
                <span className="text-red-500 ml-1 font-bold">*</span>
              </label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="What needs to be done?"
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary transition-all font-medium text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                    <SelectValue placeholder="Select status">
                      {(() => {
                        const currentStage = stages.find(s => s.id === status);
                        return currentStage ? (
                          <div className="flex items-center">
                            <div className={cn("w-2 h-2 rounded-full mr-2", currentStage.color.split(' ')[0])} />
                            <span className="font-medium text-sm">{currentStage.label}</span>
                          </div>
                        ) : (
                          <span className="text-sm">{status}</span>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center">
                          <div className={cn("w-2 h-2 rounded-full mr-2", s.color.split(' ')[0])} />
                          <span className="text-sm">{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                  <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assignee</label>
              <Select value={assigneeId || "unassigned"} onValueChange={(v) => setAssigneeId(v === "unassigned" ? undefined : v)}>
                <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary text-foreground h-10">
                  <SelectValue placeholder="Select assignee">
                    {assigneeId && users.find(u => u.uid === assigneeId) ? (
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const user = users.find(u => u.uid === assigneeId);
                          return (
                            <>
                              <Avatar className="h-5 w-5 border border-border">
                                <AvatarImage src={user?.photoURL || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                  {user?.displayName?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{user?.displayName || 'Unnamed User'}</span>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-popover border-border">
                  <SelectItem value="unassigned" className="font-medium text-muted-foreground italic">
                    <div className="flex items-center space-x-2 py-0.5">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      </div>
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      <div className="flex items-center space-x-2 py-0.5">
                        <Avatar className="h-5 w-5 border border-border shadow-sm">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                            {user.displayName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-foreground">{user.displayName || 'Unnamed User'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <Input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary transition-all font-medium h-10 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Description</label>
                <span className={cn(
                  "text-[10px] font-bold tabular-nums",
                  isDescriptionTooLong ? "text-red-500" : "text-muted-foreground"
                )}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Add more details about this task..."
                className={cn(
                  "min-h-[120px] bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary resize-none text-sm transition-all text-foreground",
                  isDescriptionTooLong && "ring-1 ring-red-500"
                )}
              />
              {isDescriptionTooLong && (
                <p className="text-[10px] text-red-500 font-medium">Description exceeds character limit</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-4 bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-xl">
          {task && onDelete && (
            <div className="flex items-center gap-2">
              {isConfirmingDelete ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground font-semibold"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 font-bold"
                    onClick={() => {
                      onDelete(task.id);
                      onOpenChange(false);
                    }}
                  >
                    Confirm Delete
                  </Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-red-400 hover:text-red-500 hover:bg-red-400/10 font-semibold"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  Delete Task
                </Button>
              )}
            </div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-muted-foreground">Cancel</Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold rounded-xl px-6" 
            onClick={handleSave}
            disabled={!title.trim() || isDescriptionTooLong}
          >
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
