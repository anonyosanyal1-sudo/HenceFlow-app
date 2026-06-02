import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from './UserAvatar';
import { Company, UserProfile } from '../types';
import { Search, UserPlus } from 'lucide-react';

type MemberRole = 'Admin' | 'Member' | 'Viewer';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  allUsers: UserProfile[];
  onInvite: (newMembers: { uid: string; role: MemberRole }[]) => void;
}

export function InviteDialog({
  open,
  onOpenChange,
  company,
  allUsers,
  onInvite,
}: InviteDialogProps) {
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [roles, setRoles] = React.useState<Record<string, MemberRole>>({});

  const excluded = React.useMemo(
    () => new Set([company.ownerId, ...company.memberIds]),
    [company.ownerId, company.memberIds],
  );

  const eligible = React.useMemo(
    () => allUsers.filter(u => !excluded.has(u.uid)),
    [allUsers, excluded],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      u =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [eligible, search]);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setSelected({});
      setRoles({});
    }
  }, [open]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every(u => selected[u.uid]);
  const someFilteredSelected = filtered.some(u => selected[u.uid]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = { ...prev };
        filtered.forEach(u => {
          delete next[u.uid];
        });
        return next;
      });
    } else {
      setSelected(prev => {
        const next = { ...prev };
        filtered.forEach(u => {
          next[u.uid] = true;
        });
        return next;
      });
    }
  };

  const toggleUser = (uid: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[uid]) {
        delete next[uid];
      } else {
        next[uid] = true;
      }
      return next;
    });
  };

  const setRole = (uid: string, role: MemberRole) => {
    setRoles(prev => ({ ...prev, [uid]: role }));
  };

  const handleInvite = () => {
    const newMembers = Object.keys(selected)
      .filter(uid => selected[uid])
      .map(uid => ({ uid, role: roles[uid] ?? 'Member' }));
    onInvite(newMembers);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <UserPlus className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground leading-tight">
                Invite members
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Add people to <span className="font-medium text-foreground">{company.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pt-4 pb-3 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9 h-9 bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary text-sm"
            />
          </div>
        </div>

        {eligible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Everyone's already here</p>
            <p className="text-xs text-muted-foreground mt-1">
              All users in the system are already members of this company.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <p className="text-sm font-medium text-foreground">No results</p>
            <p className="text-xs text-muted-foreground mt-1">
              No users match <span className="font-medium">"{search}"</span>
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-2.5 flex items-center gap-3 border-b border-border/20">
              <Checkbox
                checked={allFilteredSelected}
                indeterminate={!allFilteredSelected && someFilteredSelected}
                onCheckedChange={toggleSelectAll}
                className="border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs font-medium text-muted-foreground select-none">
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
              </span>
              {selectedCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedCount} selected
                </span>
              )}
            </div>

            <ScrollArea className="h-[280px]">
              <div className="divide-y divide-border/20">
                {filtered.map(user => {
                  const isChecked = !!selected[user.uid];
                  const role: MemberRole = roles[user.uid] ?? 'Member';

                  return (
                    <div
                      key={user.uid}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleUser(user.uid)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleUser(user.uid)}
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <UserAvatar
                        photoURL={user.photoURL}
                        displayName={user.displayName}
                        className="w-8 h-8 text-xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {user.displayName || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <Select
                          value={role}
                          onValueChange={(v: MemberRole) => setRole(user.uid, v)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs bg-background border-border/60 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin" className="text-xs">Admin</SelectItem>
                            <SelectItem value="Member" className="text-xs">Member</SelectItem>
                            <SelectItem value="Viewer" className="text-xs">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border/40 flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={selectedCount === 0}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground ml-auto"
          >
            Add {selectedCount > 0 ? `${selectedCount} ` : ''}
            {selectedCount === 1 ? 'member' : 'members'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
