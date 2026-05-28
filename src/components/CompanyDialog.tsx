import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Company, UserProfile } from '../types';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  users: UserProfile[];
  currentUserId: string;
  onSave: (data: { 
    name: string; 
    location?: string; 
    website?: string; 
    industry?: string; 
    memberIds?: string[]; 
    adminIds?: string[] 
  }) => void;
  onDelete?: (companyId: string) => void;
}

export function CompanyDialog({ open, onOpenChange, company, users, currentUserId, onSave, onDelete }: CompanyDialogProps) {
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [adminIds, setAdminIds] = React.useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(company?.name || '');
      setLocation(company?.location || '');
      setWebsite(company?.website || '');
      setIndustry(company?.industry || '');
      setMemberIds(company?.memberIds || []);
      setAdminIds(company?.adminIds || []);
      setIsConfirmingDelete(false);
    }
  }, [open, company]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ 
      name: name.trim(),
      location: location.trim() || undefined,
      website: website.trim() || undefined,
      industry: industry.trim() || undefined,
      ...(company && { memberIds, adminIds }) // Only update members/admins if editing an existing company
    });
    onOpenChange(false);
  };

  const toggleMember = (uid: string) => {
    if (memberIds.includes(uid)) {
      if (uid === company?.ownerId) return; // Prevent removing owner
      setMemberIds(prev => prev.filter(id => id !== uid));
      setAdminIds(prev => prev.filter(id => id !== uid)); // Cannot be admin if not member
    } else {
      setMemberIds(prev => [...prev, uid]);
    }
  };

  const toggleAdmin = (uid: string) => {
    if (adminIds.includes(uid)) {
      if (uid === company?.ownerId) return; // Prevent owner from losing admin
      setAdminIds(prev => prev.filter(id => id !== uid));
    } else {
      setAdminIds(prev => [...prev, uid]);
      if (!memberIds.includes(uid)) {
         setMemberIds(prev => [...prev, uid]); // Must be member to be admin
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {company ? 'Company Settings' : 'New Company'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {company 
              ? 'Update your company settings and manage members.' 
              : 'Create a new company to manage pods.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Company Name</label>
            <Input 
               value={name} 
               onChange={(e) => setName(e.target.value)} 
               placeholder="e.g., Acme Corp"
               className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <Input 
                 value={location} 
                 onChange={(e) => setLocation(e.target.value)} 
                 placeholder="e.g., San Francisco"
                 className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Industry</label>
              <Input 
                 value={industry} 
                 onChange={(e) => setIndustry(e.target.value)} 
                 placeholder="e.g., Technology"
                 className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Website</label>
            <Input 
               value={website} 
               onChange={(e) => setWebsite(e.target.value)} 
               placeholder="e.g., https://acme.com"
               className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
            />
          </div>

          {company && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex justify-between items-center">
                <span>Members</span>
                <span className="text-xs text-muted-foreground">{memberIds.length} selected</span>
              </label>
              <ScrollArea className="h-[200px] border border-border rounded-lg bg-muted/20 p-2">
                <div className="space-y-1">
                  {users.map(user => {
                    const isOwner = user.uid === company.ownerId;
                    const isSelected = memberIds.includes(user.uid);
                    
                    return (
                      <div 
                        key={user.uid} 
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                        onClick={() => toggleMember(user.uid)}
                      >
                         <Checkbox 
                           checked={isSelected}
                           disabled={isOwner}
                           className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                         />
                         <Avatar className="h-8 w-8 border border-border shadow-sm">
                           <AvatarImage src={user.photoURL || undefined} />
                           <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                             {user.displayName?.[0] || 'U'}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col flex-1 min-w-0">
                           <span className="text-sm font-medium text-foreground truncate">
                             {user.displayName || 'Anonymous User'}
                           </span>
                           <span className="text-[10px] text-muted-foreground truncate">
                             {user.email}
                           </span>
                         </div>
                         <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                           <label className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center space-x-1">
                             <Checkbox 
                               checked={adminIds.includes(user.uid)}
                               disabled={isOwner || !isSelected}
                               onCheckedChange={() => toggleAdmin(user.uid)}
                               className="h-3 w-3"
                             />
                             <span>Admin</span>
                           </label>
                         </div>
                         {isOwner && (
                           <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">
                             Owner
                           </span>
                         )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <p className="text-[10px] text-muted-foreground italic">Add or remove members from your company. Members can view and collaborate on company pods.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border mt-4">
          <div className="flex-1">
            {company && onDelete && company.ownerId === currentUserId && (
              <div className="flex items-center gap-2">
                {isConfirmingDelete ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground mr-1"
                      onClick={() => setIsConfirmingDelete(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        onDelete(company.id);
                        onOpenChange(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete Company
                  </Button>
                )}
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground mr-2">Cancel</Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold px-6" 
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
