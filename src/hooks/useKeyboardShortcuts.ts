import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onToggleCall: () => void;
  onToggleMute: () => void;
  onResetCall: () => void;
  onInterrupt: () => void;
  onToggleHandsFree: () => void;
  onCloseModal?: () => void;
  callActive: boolean;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur input fields
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.onToggleCall();
          break;
        case 'm':
        case 'M':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onToggleMute();
          }
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onResetCall();
          }
          break;
        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onToggleHandsFree();
          }
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onCloseModal?.();
          break;
        default:
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
