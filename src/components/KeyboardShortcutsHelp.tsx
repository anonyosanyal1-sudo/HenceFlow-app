import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { key: 'N', description: 'New task' },
  { key: '/', description: 'Focus search' },
  { key: 'G T', description: 'Go to Timeline view' },
  { key: 'G B', description: 'Go to Board view' },
  { key: 'G A', description: 'Go to Analytics view' },
  { key: 'Esc', description: 'Close dialog / clear search' },
  { key: '?', description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground">{s.key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
