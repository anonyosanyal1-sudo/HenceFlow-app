import React from 'react';
import { supabase } from '../lib/supabase';
import { addComment, subscribeToComments, deleteComment, updateComment } from '../services/api';
import { Comment, UserProfile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, MessageSquare, Send, Clock, Paperclip, X, FileText, Image as ImageIcon, ThumbsUp, ThumbsDown, Edit2 } from 'lucide-react';
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
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeToComments(projectId, taskId, (data) => {
      setComments(data);
      // Automatically scroll to bottom on initial load or when new comments arrive
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [projectId, taskId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // For simplicity, we convert to base64. In a production app, upload to Storage.
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        newFiles.push(base64);
    }
    setAttachments([...attachments, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && attachments.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await addComment(projectId, taskId, newComment.trim(), attachments);
      setNewComment('');
      setAttachments([]);
      // Scroll to bottom after adding
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error adding comment:', error);
      setErrorMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(projectId, taskId, commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLike = async (comment: Comment) => {
    if (!currentUserId) return;
    const uid = currentUserId;
    const likes = comment.likes || [];
    const dislikes = comment.dislikes || [];
    
    let newLikes = [...likes];
    let newDislikes = dislikes.filter(id => id !== uid);
    
    if (newLikes.includes(uid)) {
      newLikes = newLikes.filter(id => id !== uid);
    } else {
      newLikes.push(uid);
    }
    
    await updateComment(projectId, taskId, comment.id, { likes: newLikes, dislikes: newDislikes });
  };

  const handleDislike = async (comment: Comment) => {
    if (!currentUserId) return;
    const uid = currentUserId;
    const likes = comment.likes || [];
    const dislikes = comment.dislikes || [];
    
    let newDislikes = [...dislikes];
    let newLikes = likes.filter(id => id !== uid);
    
    if (newDislikes.includes(uid)) {
      newDislikes = newDislikes.filter(id => id !== uid);
    } else {
      newDislikes.push(uid);
    }
    
    await updateComment(projectId, taskId, comment.id, { likes: newLikes, dislikes: newDislikes });
  };

  const saveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateComment(projectId, taskId, commentId, { content: editContent.trim(), isEdited: true });
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const getUser = (userId: string) => {
    return users.find(u => u.uid === userId);
  };

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
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {comment.attachments.map((url, i) => (
                            <div key={i} className="relative group/attachment">
                              {url.startsWith('data:image/') ? (
                                <img src={url} alt="attachment" className="h-20 w-20 object-cover rounded-lg border border-border" />
                              ) : (
                                <div className="h-20 w-20 flex flex-col items-center justify-center bg-card rounded-lg border border-border">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground mt-1">File</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
      <form onSubmit={handleSubmit} className="relative mt-auto pt-4 bg-card space-y-4">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {attachments.map((url, index) => (
              <div key={index} className="relative group">
                {url.startsWith('data:image/') ? (
                   <img src={url} alt="upload preview" className="h-16 w-16 object-cover rounded-lg border border-primary/30" />
                ) : (
                   <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-lg border border-primary/30">
                     <FileText className="h-6 w-6 text-primary" />
                   </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={cn(
              "min-h-[100px] bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl pr-24 text-sm resize-none shadow-sm text-foreground",
              errorMsg && "border-red-500 focus-visible:ring-red-500"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border bg-card hover:bg-muted text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={(!newComment.trim() && attachments.length === 0) || isSubmitting}
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
