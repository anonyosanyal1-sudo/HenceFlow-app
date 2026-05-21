import React from 'react';
import { Task, TaskStatus, TaskPriority, Stage, UserProfile } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const PRIORITY_CONFIG: Record<TaskPriority, { badge: string; dot: string; label: string }> = {
  low:    { badge: 'bg-slate-700/50 text-slate-300 border border-slate-600/40', dot: 'bg-slate-400', label: 'Low' },
  medium: { badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/35',       dot: 'bg-sky-400',   label: 'Medium' },
  high:   { badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/35', dot: 'bg-amber-400', label: 'High' },
  urgent: { badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/45 shadow-[0_0_8px_oklch(0.63_0.24_25_/_0.35)]', dot: 'bg-rose-400', label: 'Urgent' },
};

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
      <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-transparent relative z-10">
        <div className="flex space-x-4 md:space-x-5 min-h-full">
          {stages.map((col) => {
            const bgColorRaw = col.color.split(' ').find(c => c.startsWith('bg-'));
            const bgColor = bgColorRaw ? bgColorRaw.split('/')[0] : 'bg-violet-500';
            const borderColorRaw = col.color.split(' ').find(c => c.startsWith('border-'));
            const borderSolid = borderColorRaw
              ? borderColorRaw.split('/')[0].replace('border-', 'bg-')
              : bgColor;
            const colTasks = getTasksByStatus(col.id);

            return (
              <div key={col.id} className="w-72 md:w-80 flex-shrink-0 flex flex-col">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("px-3 py-1 text-xs font-bold rounded-full border tracking-wide truncate max-w-[160px]", col.color)}>
                      {col.label}
                    </div>
                    <span className={cn(
                      "text-xs font-bold tabular-nums w-5 h-5 rounded-full flex items-center justify-center",
                      colTasks.length > 0 ? bgColor + ' text-white/90' : 'bg-muted text-muted-foreground'
                    )}>
                      {colTasks.length}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 transition-colors"
                    onClick={() => onAddTask(col.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 space-y-3 pb-4 rounded-xl px-1 pt-1 transition-all duration-200 min-h-[80px]",
                        snapshot.isDraggingOver
                          ? "bg-primary/8 ring-1 ring-primary/25 ring-inset"
                          : "bg-transparent"
                      )}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => {
                            const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
                            const u = users.find(u => u.uid === (task.assigneeId || task.creatorId));
                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                            const isToday = task.dueDate === new Date().toISOString().split('T')[0];

                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "cursor-grab active:cursor-grabbing outline-none",
                                  snapshot.isDragging ? "z-50" : ""
                                )}
                                onClick={() => {
                                  if (!snapshot.isDragging) onTaskClick(task);
                                }}
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  whileHover={snapshot.isDragging ? undefined : { y: -2, scale: 1.005 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <Card className={cn(
                                    "relative overflow-hidden border-border/40 transition-all duration-200 group cursor-pointer select-none",
                                    snapshot.isDragging
                                      ? "shadow-[0_16px_48px_-8px_oklch(0.67_0.30_285_/_0.50)] border-primary/60 scale-[1.03] bg-card"
                                      : "bg-card/70 hover:bg-card hover:border-border/70 hover:shadow-[0_4px_20px_-4px_oklch(0.67_0.30_285_/_0.18)]"
                                  )}>
                                    {/* Left accent bar */}
                                    <div className={cn("absolute inset-y-0 left-0 w-[3px]", bgColor)} />

                                    <CardContent className="p-4 pl-5 space-y-3">
                                      {/* Priority + menu */}
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge className={cn(
                                          "text-[10px] uppercase tracking-wider font-bold border-none rounded-full px-2 py-0.5",
                                          pCfg.badge,
                                          task.priority === 'urgent' && 'animate-pulse'
                                        )}>
                                          <span className={cn("inline-block w-1 h-1 rounded-full mr-1.5 shrink-0", pCfg.dot)} />
                                          {pCfg.label}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                      </div>

                                      {/* Title */}
                                      <h4 className="text-sm font-semibold text-foreground leading-snug">
                                        {task.title}
                                      </h4>

                                      {/* Description preview */}
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}

                                      {/* Footer */}
                                      <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center text-[10px] text-muted-foreground/70 font-medium gap-1">
                                            <Clock className="w-3 h-3" />
                                            {task.createdAt
                                              ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                              : 'Just now'}
                                          </div>
                                          {task.dueDate && (
                                            <div className={cn(
                                              "flex items-center text-[10px] font-bold gap-1",
                                              isOverdue ? "text-rose-400" : isToday ? "text-amber-400" : "text-emerald-400"
                                            )}>
                                              <Calendar className="w-3 h-3" />
                                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                          )}
                                        </div>
                                        <UserAvatar
                                          photoURL={u?.photoURL}
                                          displayName={u?.displayName}
                                          className="h-6 w-6 text-[10px] ring-2 ring-background shadow-sm shrink-0"
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              </div>
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div
                          className="border border-dashed border-border/30 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer group/empty hover:border-primary/30 hover:bg-primary/[0.03] transition-all"
                          onClick={() => onAddTask(col.id)}
                        >
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center opacity-40 group-hover/empty:opacity-70 transition-opacity", bgColor + '/20')}>
                            <Plus className={cn("w-3.5 h-3.5", bgColor.replace('bg-', 'text-').replace('-500', '-400'))} />
                          </div>
                          <span className="text-xs text-muted-foreground/50 group-hover/empty:text-muted-foreground/70 transition-colors">Add a task</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
