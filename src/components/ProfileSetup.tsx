import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { updateUserProfile } from '../services/api';
import { Loader2, Check } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ProfileSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDisplayName?: string | null;
  currentPhotoURL?: string | null;
  onSaved: (displayName: string, photoURL: string | null) => void;
}

const ANIMAL_EMOJIS = [
  // Big cats & predators
  '🦁', '🐯', '🐆', '🐅', '🐊', '🐻', '🐼', '🐨', '🦊', '🦝',
  // Canines & wolves
  '🐺', '🐶', '🦮', '🐕',
  // Horses & hooved
  '🐴', '🦄', '🦌', '🦙', '🐐', '🐏', '🐑', '🦬', '🐄', '🐃',
  // Primates
  '🐵', '🦍', '🦧',
  // Large animals
  '🐘', '🦛', '🦏', '🦒', '🦓', '🦘',
  // Small mammals
  '🐰', '🐹', '🐭', '🐱', '🐇', '🦔', '🦥', '🦦', '🦨', '🦡',
  // Birds
  '🦅', '🦆', '🦉', '🦜', '🦢', '🦩', '🦚', '🦤', '🐧', '🦃', '🕊',
  // Ocean & sea
  '🐬', '🐋', '🦈', '🐙', '🦑', '🦭', '🐠', '🐟', '🐡', '🦞', '🦀',
  // Reptiles & insects
  '🐢', '🦎', '🐍', '🦋', '🐛', '🐌', '🐝', '🐞',
];

export function ProfileSetup({ open, onOpenChange, currentDisplayName, currentPhotoURL, onSaved }: ProfileSetupProps) {
  const [name, setName] = React.useState(currentDisplayName || '');
  const [selectedEmoji, setSelectedEmoji] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(currentDisplayName || '');
      setSelectedEmoji(
        currentPhotoURL?.startsWith('emoji:') ? currentPhotoURL.slice(6) : null
      );
      setError(null);
    }
  }, [open, currentDisplayName, currentPhotoURL]);

  const photoURL = selectedEmoji ? `emoji:${selectedEmoji}` : (currentPhotoURL?.startsWith('emoji:') ? currentPhotoURL : null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Display name is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await updateUserProfile(name.trim(), photoURL);
      onSaved(name.trim(), photoURL);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Set Up Your Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add your name and pick an animal avatar so teammates can identify you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Preview */}
          <div className="flex justify-center">
            <UserAvatar
              photoURL={photoURL}
              displayName={name || currentDisplayName}
              className="w-20 h-20 text-4xl shadow-lg shadow-primary/10 ring-2 ring-primary/30"
            />
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

          {/* Animal avatar grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Choose Animal Avatar
              {selectedEmoji && (
                <button
                  type="button"
                  onClick={() => setSelectedEmoji(null)}
                  className="ml-2 text-primary hover:underline normal-case font-normal"
                >
                  Clear
                </button>
              )}
            </label>
            <ScrollArea className="h-52 rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-2">
              <div className="grid grid-cols-8 gap-1.5 p-1">
                {ANIMAL_EMOJIS.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(isSelected ? null : emoji)}
                      className={cn(
                        "relative w-full aspect-square rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110 hover:bg-zinc-700/60",
                        isSelected
                          ? "bg-primary/20 ring-2 ring-primary scale-110 shadow-md shadow-primary/20"
                          : "bg-zinc-800/40"
                      )}
                      title={emoji}
                    >
                      {emoji}
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
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
