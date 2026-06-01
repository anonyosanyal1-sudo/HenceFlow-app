import React from 'react';

interface ShortcutHandlers {
  onNewTask?: () => void;
  onFocusSearch?: () => void;
  onShowShortcuts?: () => void;
  onGoTimeline?: () => void;
  onGoBoard?: () => void;
  onGoAnalytics?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  const pendingKey = React.useRef<string | null>(null);
  const pendingTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable;

      if (isEditing) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Two-key sequences: g → t / b / a
      if (pendingKey.current === 'g') {
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
        pendingKey.current = null;
        if (e.key === 't') { handlersRef.current.onGoTimeline?.(); return; }
        if (e.key === 'b') { handlersRef.current.onGoBoard?.(); return; }
        if (e.key === 'a') { handlersRef.current.onGoAnalytics?.(); return; }
      }

      switch (e.key) {
        case 'g':
          pendingKey.current = 'g';
          pendingTimer.current = window.setTimeout(() => { pendingKey.current = null; }, 800);
          break;
        case 'n':
        case 'N':
          handlersRef.current.onNewTask?.();
          break;
        case '/':
          e.preventDefault();
          handlersRef.current.onFocusSearch?.();
          break;
        case '?':
          handlersRef.current.onShowShortcuts?.();
          break;
        case 'Escape':
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, [enabled]);
}
