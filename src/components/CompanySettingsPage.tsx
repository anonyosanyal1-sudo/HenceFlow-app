import React from 'react';
import { Company, UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { InviteDialog } from './InviteDialog';

type MemberRole = 'Admin' | 'Member' | 'Viewer';

interface CompanySettingsPageProps {
  company: Company;
  users: UserProfile[];
  allUsers: UserProfile[];
  currentUserId: string;
  onSave: (data: {
    name: string;
    location?: string;
    website?: string;
    industry?: string;
    memberIds?: string[];
    adminIds?: string[];
    viewerIds?: string[];
  }) => void;
  onDelete?: (companyId: string) => void;
  onBack: () => void;
}

function getInitialRoles(company: Company): Record<string, MemberRole> {
  const map: Record<string, MemberRole> = {};
  // Owner is always Admin, regardless of adminIds array
  map[company.ownerId] = 'Admin';
  company.memberIds.forEach(uid => {
    if (uid === company.ownerId) return; // already set
    if (company.adminIds.includes(uid)) {
      map[uid] = 'Admin';
    } else if (company.viewerIds.includes(uid)) {
      map[uid] = 'Viewer';
    } else {
      map[uid] = 'Member';
    }
  });
  return map;
}

function ensureOwner(ids: string[], ownerId: string): string[] {
  return ids.includes(ownerId) ? ids : [ownerId, ...ids];
}

export function CompanySettingsPage({
  company, users, allUsers, currentUserId, onSave, onDelete, onBack,
}: CompanySettingsPageProps) {
  const [name, setName] = React.useState(company.name);
  const [location, setLocation] = React.useState(company.location ?? '');
  const [website, setWebsite] = React.useState(
    (company.website ?? '').replace(/^https?:\/\//, '')
  );
  const [industry, setIndustry] = React.useState(company.industry ?? '');
  const [isDirty, setIsDirty] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [roles, setRoles] = React.useState<Record<string, MemberRole>>(
    () => getInitialRoles(company)
  );
  const [memberIds, setMemberIds] = React.useState<string[]>(() => ensureOwner(company.memberIds, company.ownerId));
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = React.useState('');
  const [inviteOpen, setInviteOpen] = React.useState(false);

  // Sync from parent when company data changes (e.g. after save or invite)
  const companyKey = `${company.id}|${company.memberIds.join(',')}|${company.adminIds.join(',')}|${company.viewerIds.join(',')}`;
  React.useEffect(() => {
    setName(company.name);
    setLocation(company.location ?? '');
    setWebsite((company.website ?? '').replace(/^https?:\/\//, ''));
    setIndustry(company.industry ?? '');
    setRoles(getInitialRoles(company));
    setMemberIds(ensureOwner(company.memberIds, company.ownerId));
    setIsDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyKey]);

  const mark = () => setIsDirty(true);

  const handleSaveDetails = () => {
    const adminIds = Object.entries(roles)
      .filter(([, r]) => r === 'Admin')
      .map(([uid]) => uid);
    const viewerIds = Object.entries(roles)
      .filter(([, r]) => r === 'Viewer')
      .map(([uid]) => uid);
    onSave({
      name,
      location: location.trim() || undefined,
      website: website.trim() ? `https://${website.trim()}` : undefined,
      industry: industry.trim() || undefined,
      memberIds,
      adminIds,
      viewerIds,
    });
    setLastSaved(new Date());
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setName(company.name);
    setLocation(company.location ?? '');
    setWebsite((company.website ?? '').replace(/^https?:\/\//, ''));
    setIndustry(company.industry ?? '');
    setRoles(getInitialRoles(company));
    setMemberIds(ensureOwner(company.memberIds, company.ownerId));
    setIsDirty(false);
  };

  const setMemberRole = (uid: string, role: MemberRole) => {
    if (uid === company.ownerId) return;
    const newRoles = { ...roles, [uid]: role };
    setRoles(newRoles);
    // Auto-save role change immediately
    const adminIds = Object.entries(newRoles).filter(([, r]) => r === 'Admin').map(([id]) => id);
    const viewerIds = Object.entries(newRoles).filter(([, r]) => r === 'Viewer').map(([id]) => id);
    onSave({
      name: company.name,
      location: company.location,
      website: company.website,
      industry: company.industry,
      memberIds,
      adminIds,
      viewerIds,
    });
    setLastSaved(new Date());
  };

  const removeMember = (uid: string) => {
    if (uid === company.ownerId) return;
    const newMemberIds = memberIds.filter(id => id !== uid);
    const newRoles = { ...roles };
    delete newRoles[uid];
    setMemberIds(newMemberIds);
    setRoles(newRoles);
    const adminIds = Object.entries(newRoles).filter(([, r]) => r === 'Admin').map(([id]) => id);
    const viewerIds = Object.entries(newRoles).filter(([, r]) => r === 'Viewer').map(([id]) => id);
    onSave({
      name: company.name,
      location: company.location,
      website: company.website,
      industry: company.industry,
      memberIds: newMemberIds,
      adminIds,
      viewerIds,
    });
    setLastSaved(new Date());
  };

  const handleInvite = (newMembers: { uid: string; role: MemberRole }[]) => {
    const addedIds = newMembers.map(m => m.uid);
    const newMemberIds = [...new Set([...memberIds, ...addedIds])];
    const newRoles = { ...roles };
    newMembers.forEach(({ uid, role }) => { newRoles[uid] = role; });
    setMemberIds(newMemberIds);
    setRoles(newRoles);
    const adminIds = Object.entries(newRoles).filter(([, r]) => r === 'Admin').map(([id]) => id);
    const viewerIds = Object.entries(newRoles).filter(([, r]) => r === 'Viewer').map(([id]) => id);
    onSave({
      name: company.name,
      location: company.location,
      website: company.website,
      industry: company.industry,
      memberIds: newMemberIds,
      adminIds,
      viewerIds,
    });
    setLastSaved(new Date());
    setInviteOpen(false);
  };

  const lastSavedText = React.useMemo(() => {
    if (!lastSaved) return null;
    const mins = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 minute ago';
    return `${mins} minutes ago`;
  }, [lastSaved]);

  const visibleUsers = users.filter(u => memberIds.includes(u.uid) || u.uid === company.ownerId);

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Breadcrumb header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/40 px-6 h-14 flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {company.name}
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <span className="text-sm font-semibold text-foreground">Settings</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Company details card ─────────────────────────────────────── */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-border/30">
            <h2 className="text-sm font-semibold text-foreground">Company details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              This information appears across your workspace.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Logo row */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Company logo</p>
                <p className="text-xs text-muted-foreground">SVG, PNG, or JPG up to 2MB. Square works best.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="h-9 border-border/60">Upload</Button>
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground">Remove</Button>
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Company name</label>
                <span className="text-xs text-muted-foreground">Visible to all members</span>
              </div>
              <Input
                value={name}
                onChange={e => { setName(e.target.value); mark(); }}
                className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Location + Industry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Location</label>
                <Input
                  value={location}
                  onChange={e => { setLocation(e.target.value); mark(); }}
                  placeholder="e.g. San Francisco"
                  className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Industry</label>
                <Input
                  value={industry}
                  onChange={e => { setIndustry(e.target.value); mark(); }}
                  placeholder="e.g. Technology"
                  className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Website</label>
              <div className="flex rounded-lg border border-border/60 overflow-hidden focus-within:ring-1 focus-within:ring-primary">
                <span className="flex items-center px-3 bg-muted/50 border-r border-border/60 text-muted-foreground text-sm shrink-0 select-none">
                  https://
                </span>
                <Input
                  value={website}
                  onChange={e => { setWebsite(e.target.value); mark(); }}
                  placeholder="yourcompany.com"
                  className="border-0 rounded-none bg-background focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>
          </div>

          {/* Save footer */}
          <div className="px-6 py-4 border-t border-border/30 flex items-center">
            <span className="text-xs text-muted-foreground">
              {lastSavedText
                ? `Last saved · ${lastSavedText}`
                : isDirty
                  ? 'Unsaved changes'
                  : ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={!isDirty}
                className="h-9 border-border/60"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDetails}
                disabled={!isDirty || !name.trim()}
                className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>

        {/* ── Team members card ────────────────────────────────────────── */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-border/30">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Team members · {memberIds.length}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invite teammates and manage their roles.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border/60"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Invite member
            </Button>
          </div>

          <div className="divide-y divide-border/30">
            {visibleUsers.map(user => {
              const isOwner = user.uid === company.ownerId;
              const role: MemberRole = isOwner ? 'Admin' : (roles[user.uid] ?? 'Member');

              return (
                <div key={user.uid} className="px-6 py-4 flex items-center gap-4">
                  <UserAvatar
                    photoURL={user.photoURL}
                    displayName={user.displayName}
                    className="w-10 h-10 text-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {user.displayName || 'Anonymous'}
                      </span>
                      {isOwner && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <Select
                    value={role}
                    onValueChange={(v: MemberRole) => setMemberRole(user.uid, v)}
                    disabled={isOwner}
                  >
                    <SelectTrigger className="w-28 h-9 text-sm bg-background border-border/60 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin" className="text-sm">Admin</SelectItem>
                      <SelectItem value="Member" className="text-sm">Member</SelectItem>
                      <SelectItem value="Viewer" className="text-sm">Viewer</SelectItem>
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
                        disabled={isOwner}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                        onClick={() => removeMember(user.uid)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Delete company danger zone ────────────────────────────────── */}
        {company.ownerId === currentUserId && onDelete && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-500">Delete company</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Permanently delete this company, including all pods and tasks. This cannot be undone.
              </p>
            </div>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  placeholder={company.name}
                  className="h-9 w-40 bg-background border-border/60 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsConfirmingDelete(false); setDeleteConfirmName(''); }}
                  className="h-9 text-muted-foreground shrink-0"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(company.id)}
                  disabled={deleteConfirmName.trim() !== company.name}
                  className="h-9 shrink-0"
                >
                  Confirm
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
                className="h-9 shrink-0"
              >
                Delete company
              </Button>
            )}
          </div>
        )}
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        company={{ ...company, memberIds }}
        allUsers={allUsers}
        onInvite={handleInvite}
      />
    </div>
  );
}
