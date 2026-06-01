import React from 'react';
import { supabase } from '../lib/supabase';
import { addComment, fetchComments, deleteComment, updateComment, reactToComment } from '../services/api';
import { Comment, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, MessageSquare, Send, Clock, ThumbsUp, ThumbsDown, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCommentsProps {
  projectId: string;
  taskId: string;
  users: UserProfile[];
}

export function TaskComments({ projectId, taskId, users }: TaskCommentsProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Resolve current user once on mount
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const refetchComments = React.useCallback(() => {
    fetchComments(taskId).then(data => {
      setComments(data);
      setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }).catch(() => {});
  }, [taskId]);

  React.useEffect(() => { refetchComments(); }, [refetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await addComment(projectId, taskId, newComment.trim());
      setNewComment('');
      refetchComments();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    deleteComment(projectId, taskId, commentId).catch(() => { refetchComments(); });
  };

  const handleLike = async (comment: Comment) => {
    if (!currentUserId) return;
    const updated = await reactToComment(comment.id, 'like').catch(() => null);
    if (updated) setComments(prev => prev.map(c => c.id === comment.id ? updated : c));
  };

  const handleDislike = async (comment: Comment) => {
    if (!currentUserId) return;
    const updated = await reactToComment(comment.id, 'dislike').catch(() => null);
    if (updated) setComments(prev => prev.map(c => c.id === comment.id ? updated : c));
  };

  const saveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateComment(projectId, taskId, commentId, { content: editContent.trim() });
      setEditingId(null);
      setEditContent('');
      refetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const getUser = (userId: string) => users.find(u => u.uid === userId);

  if (!projectId || !taskId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Comments not available for this task.</p>
        <p className="text-[10px] text-muted-foreground/60 italic">Missing Project ID</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full bg-card">
      <div className="flex items-center space-x-2 text-sm font-semibold text-foreground pb-2 border-b border-border">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span>Discussion ({comments.length})</span>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[0]">
        <AnimatePresence initial={false}>
          {comments.map((comment) => {
            const user = getUser(comment.userId);
            const isMe = currentUserId === comment.userId;

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex space-x-3 group"
              >
                <Avatar className="w-8 h-8 shrink-0 ring-1 ring-border">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                    {user?.displayName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-foreground">
                        {user?.displayName || 'Unknown User'}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                    {isMe && (
                      <div className="flex items-center space-x-1 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingId === comment.id ? (
                    <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-none p-3 shadow-sm space-y-2">
                       <Textarea
                         value={editContent}
                         onChange={(e) => setEditContent(e.target.value)}
                         className="min-h-[60px] text-sm resize-none bg-background border-border"
                       />
                       <div className="flex justify-end space-x-2">
                         <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                         <Button size="sm" onClick={() => saveEdit(comment.id)}>Save</Button>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-none p-3 text-sm text-foreground shadow-sm leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                      {comment.isEdited && <span className="text-[10px] text-muted-foreground ml-2">(edited)</span>}
                    </div>
                  )}

                  {/* Like / Dislike actions */}
                  <div className="flex items-center space-x-3 mt-1 ml-1">
                     <button
                        onClick={() => handleLike(comment)}
                        className={cn(
                          "flex items-center space-x-1 text-[11px] font-medium transition-colors",
                          comment.likes?.includes(currentUserId || '') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{comment.likes?.length || 0}</span>
                     </button>
                     <button
                        onClick={() => handleDislike(comment)}
                        className={cn(
                          "flex items-center space-x-1 text-[11px] font-medium transition-colors",
                          comment.dislikes?.includes(currentUserId || '') ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>{comment.dislikes?.length || 0}</span>
                     </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium italic">No comments yet. Start the conversation!</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative mt-auto pt-4 bg-card space-y-2">
        <div className="relative">
          <Textarea
            placeholder="Write a comment… (Ctrl+Enter to send)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={cn(
              "min-h-[80px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl pr-14 text-sm resize-none shadow-sm text-foreground",
              errorMsg && "border-red-500 focus-visible:ring-red-500"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute bottom-3 right-3">
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || isSubmitting}
              className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {errorMsg && (
          <p className="text-sm text-red-500 font-medium px-2">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}
