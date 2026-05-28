import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Company, UserProfile } from '../types';

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
    adminIds?: string[];
  }) => void;
  onDelete?: (companyId: string) => void;
}

export function CompanyDialog({
  open, onOpenChange, company, currentUserId, onSave,
}: CompanyDialogProps) {
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [industry, setIndustry] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(company?.name || '');
      setLocation(company?.location || '');
      setWebsite(company?.website || '');
      setIndustry(company?.industry || '');
    }
  }, [open, company]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      location: location.trim() || undefined,
      website: website.trim() || undefined,
      industry: industry.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {company ? 'Company Settings' : 'New Company'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {company
              ? 'Update your company settings.'
              : 'Create a new company to manage pods.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Company Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Acme Corp"
              className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., San Francisco"
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Industry</label>
              <Input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="e.g., Technology"
                className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Website</label>
            <Input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="e.g., https://acme.com"
              className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl"
          >
            {company ? 'Save' : 'Create company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
