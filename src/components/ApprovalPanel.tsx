import React from 'react';
import { Task, TaskApproval, UserProfile } from '../types';
import { fetchTaskApprovals, requestApproval, respondToApproval } from '../services/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Plus, User } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalPanelProps {
  task: Task;
  projectId: string;
  users: UserProfile[];
  currentUserId: string;
}

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle },
};

export function ApprovalPanel({ task, projectId, users, currentUserId }: ApprovalPanelProps) {
  const [approvals, setApprovals] = React.useState<TaskApproval[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [requesting, setRequesting] = React.useState(false);
  const [selectedApprover, setSelectedApprover] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTaskApprovals(task.id);
      setApprovals(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  React.useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    if (!selectedApprover) return;
    try {
      const approval = await requestApproval(task.id, projectId, selectedApprover);
      setApprovals(prev => [approval, ...prev]);
      setRequesting(false);
      setSelectedApprover('');
      toast.success('Approval requested');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to request approval');
    }
  };

  const handleRespond = async (approvalId: string, status: 'approved' | 'rejected', note?: string) => {
    try {
      await respondToApproval(approvalId, status, note);
      setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status } : a));
      toast.success(status === 'approved' ? 'Approved!' : 'Rejected');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to respond');
    }
  };

  const getUser = (uid: string) => users.find(u => u.uid === uid);

  if (loading) return <div className="text-xs text-muted-foreground py-2">Loading…</div>;

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Approvals
      </label>

      {approvals.length === 0 && !requesting && (
        <p className="text-xs text-muted-foreground/50 italic">No approvals requested.</p>
      )}

      {approvals.map(approval => {
        const meta = STATUS_META[approval.status];
        const approver = getUser(approval.approverId);
        const isMyApproval = approval.approverId === currentUserId && approval.status === 'pending';

        return (
          <div key={approval.id} className="border border-border/30 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <meta.icon className={cn("w-3.5 h-3.5 shrink-0", meta.color)} />
              <span className="text-xs font-medium text-foreground flex-1 truncate">
                {approver?.displayName ?? approval.approverId.slice(0, 8)}
              </span>
              <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded-md", meta.color, meta.bg)}>
                {meta.label}
              </span>
            </div>
            {approval.note && (
              <p className="text-[11px] text-muted-foreground/60 italic pl-5">{approval.note}</p>
            )}
            {isMyApproval && (
              <div className="flex gap-1.5 pl-5">
                <Button
                  size="sm"
                  className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={() => handleRespond(approval.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
                  onClick={() => handleRespond(approval.id, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Request approval */}
      {requesting ? (
        <div className="space-y-2">
          <select
            value={selectedApprover}
            onChange={e => setSelectedApprover(e.target.value)}
            className="w-full h-8 px-2 rounded-md border border-border/50 bg-muted/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select approver…</option>
            {users.filter(u => u.uid !== currentUserId).map(u => (
              <option key={u.uid} value={u.uid}>{u.displayName ?? u.email}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs px-2" disabled={!selectedApprover} onClick={handleRequest}>
              Request
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRequesting(false); setSelectedApprover(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setRequesting(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Request approval
        </button>
      )}
    </div>
  );
}
