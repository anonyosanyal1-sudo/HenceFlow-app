import React from 'react';
import { Task, TaskStatus, TaskPriority, Stage, UserProfile } from '../types';
import { CardContent } from '@/components/ui/card';
import { Plus, MoreHorizontal, Clock, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { UserAvatar } from './UserAvatar';

interface TaskBoardProps {
  tasks: Task[];
  stages: Stage[];
  users?: UserProfile[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { text: string; dot: string; label: string }> = {
  low:    { text: 'text-slate-400',   dot: 'bg-slate-400',   label: 'LOW' },
  medium: { text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'MEDIUM' },
  high:   { text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'HIGH' },
  urgent: { text: 'text-rose-400',    dot: 'bg-rose-500',    label: 'URGENT' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function TaskBoard({ tasks, stages, users = [], onTaskClick, onAddTask, onStatusChange }: TaskBoardProps) {
  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (destination.droppableId !== source.droppableId) {
      onStatusChange(draggableId, destination.droppableId as TaskStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-x-auto px-4 md:px-6 py-5 bg-transparent relative z-10">
        <div className="flex gap-4 min-h-full items-start">
          {stages.map((col) => {
            const bgColorRaw = col.color.split(' ').find(c => c.startsWith('bg-'));
            const bgColor = bgColorRaw ? bgColorRaw.split('/')[0] : 'bg-violet-500';
            const colTasks = getTasksByStatus(col.id);

            return (
              <div key={col.id} className="w-[320px] flex-shrink-0 flex flex-col rounded-2xl bg-card/50 border border-border/30">
                {/* Column header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", bgColor)} />
                    <span className="text-sm font-semibold text-foreground truncate">{col.label}</span>
                    <span className="text-xs font-bold text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-lg"
                      onClick={() => onAddTask(col.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-lg"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 flex flex-col gap-2.5 px-3 min-h-[60px] transition-all duration-150",
                        snapshot.isDraggingOver ? "bg-primary/5 rounded-xl" : ""
                      )}
                    >
                      {colTasks.map((task, index) => {
                        const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
                        const isOverdue = task.dueDate &&
                          new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                        const isToday = task.dueDate === new Date().toISOString().split('T')[0];

                        // Collect unique users to show (assignee first, then creator, max 3)
                        const seenIds = new Set<string>();
                        const taskUserIds = [task.assigneeId, task.creatorId]
                          .filter((id): id is string => !!id && !seenIds.has(id) && !!seenIds.add(id))
                          .slice(0, 3);
                        const taskUsers = taskUserIds
                          .map(id => users.find(u => u.uid === id))
                          .filter((u): u is UserProfile => !!u);

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn("cursor-grab active:cursor-grabbing outline-none", snapshot.isDragging ? "z-50" : "")}
                                onClick={() => { if (!snapshot.isDragging) onTaskClick(task); }}
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  whileHover={snapshot.isDragging ? undefined : { y: -1 }}
                                  transition={{ duration: 0.12 }}
                                >
                                  <div className={cn(
                                    "rounded-xl border transition-all duration-150 select-none",
                                    snapshot.isDragging
                                      ? "bg-card border-primary/50 shadow-[0_12px_40px_-8px_oklch(0.67_0.30_285_/_0.45)] scale-[1.02]"
                                      : "bg-card border-border/30 hover:border-border/70 hover:shadow-md cursor-pointer"
                                  )}>
                                    <CardContent className="p-4 space-y-2.5">
                                      {/* Priority + tags */}
                                      <div className="flex items-center justify-between gap-2">
                                        <div className={cn("flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase", pCfg.text)}>
                                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pCfg.dot,
                                            task.priority === 'urgent' ? 'animate-pulse' : ''
                                          )} />
                                          {pCfg.label}
                                        </div>
                                        {task.tags && task.tags.length > 0 && (
                                          <span className="text-[10px] text-muted-foreground/50 truncate max-w-[120px]">
                                            {task.tags.slice(0, 2).join(' · ')}
                                          </span>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <h4 className="text-sm font-semibold text-foreground leading-snug">
                                        {task.title}
                                      </h4>

                                      {/* Description */}
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Footer: dates + avatars */}
                                      <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                                        <div className="flex items-center gap-3">
                                          {task.createdAt && (
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 font-medium">
                                              <Clock className="w-3 h-3" />
                                              {formatDate(task.createdAt)}
                                            </span>
                                          )}
                                          {task.dueDate && (
                                            <span className={cn(
                                              "flex items-center gap-1 text-[10px] font-semibold",
                                              isOverdue ? "text-rose-400" : isToday ? "text-amber-400" : "text-muted-foreground/60"
                                            )}>
                                              <Calendar className="w-3 h-3" />
                                              {isToday ? (
                                                <span className={cn(isToday ? "text-amber-400 font-bold" : "")}>
                                                  {formatDate(task.dueDate)}
                                                </span>
                                              ) : formatDate(task.dueDate)}
                                            </span>
                                          )}
                                        </div>

                                        {/* Stacked avatars */}
                                        {taskUsers.length > 0 && (
                                          <div className="flex items-center -space-x-2">
                                            {taskUsers.map((u, i) => (
                                              <UserAvatar
                                                key={u.uid}
                                                photoURL={u.photoURL}
                                                displayName={u.displayName}
                                                className={cn(
                                                  "h-6 w-6 text-[9px] ring-2 ring-card shadow-sm shrink-0",
                                                  i > 0 ? "relative" : ""
                                                )}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add task footer */}
                <button
                  className="flex items-center justify-center gap-1.5 mx-3 my-3 py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors rounded-lg hover:bg-muted/30 font-medium"
                  onClick={() => onAddTask(col.id)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
