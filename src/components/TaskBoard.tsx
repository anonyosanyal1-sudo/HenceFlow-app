import React from 'react';
import { Task, TaskStatus, TaskPriority, Stage, UserProfile } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    'bg-muted/60 text-muted-foreground border border-border/60',
  medium: 'bg-chart-4/20 text-chart-4 border border-chart-4/40',
  high:   'bg-chart-2/20 text-chart-2 border border-chart-2/40',
  urgent: 'bg-destructive/25 text-destructive border border-destructive/40 animate-pulse',
};

export function TaskBoard({ tasks, stages, users = [], onTaskClick, onAddTask, onStatusChange }: TaskBoardProps) {
  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update status if dropped in a different column
    if (destination.droppableId !== source.droppableId) {
      onStatusChange(draggableId, destination.droppableId as TaskStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-transparent relative z-10">
        <div className="flex space-x-4 md:space-x-6 min-h-full">
          {stages.map((col) => {
            const borderColor = col.color.split(' ').find(c => c.startsWith('border-'));
            const bgColorRaw = col.color.split(' ').find(c => c.startsWith('bg-'));
            const bgColor = bgColorRaw ? bgColorRaw.split('/')[0] : '';
            const borderSolidColor = borderColor ? borderColor.split('/')[0].replace('border-', 'bg-') : bgColor;

            return (
              <div key={col.id} className="w-72 md:w-80 flex-shrink-0 flex flex-col relative">
                {/* Column color accent line */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-60", borderSolidColor)} />
                
                <div className="flex items-center justify-between mb-4 px-2 pt-3">
                  <div className="flex items-center space-x-2">
                    <div className={cn("px-2.5 py-0.5 text-xs font-semibold rounded-full border", col.color)}>
                      {col.label}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {getTasksByStatus(col.id).length}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onAddTask(col.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "flex-1 space-y-3 pb-4 transition-colors rounded-xl px-1",
                      snapshot.isDraggingOver ? "bg-primary/8 ring-1 ring-primary/30" : ""
                    )}
                  >
                    <AnimatePresence>
                      {getTasksByStatus(col.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-grab active:cursor-grabbing outline-none",
                                snapshot.isDragging ? "z-50" : ""
                              )}
                              onClick={() => {
                                if (!snapshot.isDragging) {
                                  onTaskClick(task);
                                }
                              }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                whileHover={{ y: -4, scale: 1.01 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                layout
                              >
                                <Card className={cn(
                                  "bg-card border-border hover:border-primary/50 transition-all duration-200 shadow-sm group cursor-pointer",
                                  snapshot.isDragging
                                    ? "shadow-[0_0_30px_-4px_oklch(0.65_0.27_285_/_0.35)] border-primary ring-2 ring-primary/20 scale-105"
                                    : "hover:shadow-[0_4px_20px_-4px_oklch(0.65_0.27_285_/_0.2)] hover:bg-primary/[0.04]"
                                )}>
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <Badge className={cn("text-[10px] uppercase tracking-wider font-bold border-none", PRIORITY_STYLES[task.priority])}>
                                        {task.priority}
                                      </Badge>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                    </div>
                                    
                                    <h4 className="text-sm font-medium text-foreground leading-snug">
                                      {task.title}
                                    </h4>

                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                                      <div className="flex flex-col space-y-1.5">
                                        <div className="flex items-center text-[10px] text-muted-foreground font-medium">
                                          <Clock className="w-3 h-3 mr-1" />
                                          {task.createdAt 
                                            ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                            : 'Just now'}
                                        </div>
                                        {task.dueDate && (
                                          <div className={cn(
                                            "flex items-center text-[10px] font-bold",
                                            new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                                              ? "text-destructive" 
                                              : task.dueDate === new Date().toISOString().split('T')[0]
                                                ? "text-orange-400"
                                                : "text-secondary"
                                          )}>
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                          </div>
                                        )}
                                      </div>
                                      {(() => {
                                        const u = users.find(u => u.uid === (task.assigneeId || task.creatorId));
                                        return (
                                          <UserAvatar
                                            photoURL={u?.photoURL}
                                            displayName={u?.displayName}
                                            className="h-6 w-6 text-[10px] ring-2 ring-card shadow-sm shrink-0"
                                          />
                                        );
                                      })()}
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                    
                    {getTasksByStatus(col.id).length === 0 && !snapshot.isDraggingOver && (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">No tasks here</span>
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

function CheckSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}
