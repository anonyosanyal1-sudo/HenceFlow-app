import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from './Logo';

interface CreateCompanyPageProps {
  onSave: (data: { name: string; location?: string; website?: string; industry?: string }) => void;
}

export function CreateCompanyPage({ onSave }: CreateCompanyPageProps) {
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [industry, setIndustry] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      location: location.trim() || undefined,
      website: website.trim() ? (website.startsWith('http') ? website.trim() : `https://${website.trim()}`) : undefined,
      industry: industry.trim() || undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-0 overflow-y-auto p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10 overflow-hidden">
            <Logo variant="icon" className="w-full h-full" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground text-center mb-2 tracking-tight">
          Set up your company
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Pods belong to a company. You can always update these details later.
        </p>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-border/30">
            <h2 className="text-sm font-semibold text-foreground">Company details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              This information will appear across your workspace.
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Logo placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {name.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Company logo</p>
                <p className="text-xs text-muted-foreground">You can upload a logo after creating the company.</p>
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Company name <span className="text-red-400">*</span></label>
              </div>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
                autoFocus
                className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Location + Industry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Location</label>
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco"
                  className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Industry</label>
                <Input
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g., Technology"
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
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="yourcompany.com"
                  className="border-0 rounded-none bg-background focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/30 flex items-center justify-end gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={!name.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 rounded-xl shadow-lg shadow-primary/20"
            >
              Create company
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
