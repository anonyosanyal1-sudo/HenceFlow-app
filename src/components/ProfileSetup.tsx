import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { updateUserProfile } from '../services/api';
import { Loader2, User, Check } from 'lucide-react';

interface ProfileSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDisplayName?: string | null;
  currentPhotoURL?: string | null;
  onSaved: (displayName: string, photoURL: string | null) => void;
}

const AVATAR_SEEDS = [
  'Felix', 'Zoe', 'Max', 'Luna', 'Kai', 'Aria',
  'Liam', 'Nova', 'Jax', 'Ivy', 'Ace', 'Mia',
];

export function ProfileSetup({ open, onOpenChange, currentDisplayName, currentPhotoURL, onSaved }: ProfileSetupProps) {
  const [name, setName] = React.useState(currentDisplayName || '');
  const [selectedSeed, setSelectedSeed] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(currentDisplayName || '');
      setSelectedSeed(null);
      setError(null);
    }
  }, [open, currentDisplayName]);

  const selectedPhotoURL = selectedSeed
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedSeed}`
    : currentPhotoURL || null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await updateUserProfile(name.trim(), selectedPhotoURL);
      onSaved(name.trim(), selectedPhotoURL);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Set Up Your Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add your name and choose an avatar so teammates can identify you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current / selected avatar preview */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 overflow-hidden flex items-center justify-center shadow-lg shadow-primary/10">
              {selectedPhotoURL ? (
                <img src={selectedPhotoURL} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary/60" />
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Display Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-primary h-11"
            />
          </div>

          {/* Avatar grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Choose Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                const isSelected = selectedSeed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedSeed(isSelected ? null : seed)}
                    className={cn(
                      "relative w-full aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-110",
                      isSelected
                        ? "border-primary shadow-md shadow-primary/30 scale-110"
                        : "border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    <img src={url} alt={seed} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
            Skip for now
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
