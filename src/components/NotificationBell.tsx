import React from 'react';
import { Bell } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Notification } from '../types';
import { markNotificationsRead, deleteNotification } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
  onTaskClick?: (taskId: string) => void;
}

export function NotificationBell({ notifications, onNotificationsChange, onTaskClick }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const unread = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markNotificationsRead();
    onNotificationsChange(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleMarkRead = async (n: Notification) => {
    if (!n.isRead) {
      await markNotificationsRead([n.id]);
      onNotificationsChange(notifications.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    }
    if (n.taskId && onTaskClick) {
      onTaskClick(n.taskId);
      setOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
    onNotificationsChange(notifications.filter(n => n.id !== id));
  };

  const ICON_COLOR: Record<string, string> = {
    task_assigned: 'text-violet-400',
    mention: 'text-amber-400',
    comment: 'text-sky-400',
    task_update: 'text-emerald-400',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Notifications" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative h-8 w-8 text-muted-foreground hover:text-foreground")}>
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-border bg-popover overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm text-foreground">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-6 px-2" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No notifications</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={cn(
                  "px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors flex items-start gap-3 relative",
                  !n.isRead && "bg-primary/5"
                )}
              >
                {!n.isRead && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                <div className={cn("mt-0.5 shrink-0", ICON_COLOR[n.type] ?? 'text-muted-foreground')}>
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {n.createdAt ? (() => { try { return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }); } catch { return ''; } })() : ''}
                  </p>
                </div>
                <button
                  className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground text-xs ml-1 mt-0.5"
                  onClick={(e) => handleDelete(e, n.id)}
                >✕</button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
