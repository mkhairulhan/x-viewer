// Filename: src/components/layout/KeyboardShortcuts.jsx

import React, { useEffect } from 'react';
import { X, Command } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function KeyboardShortcuts() {
  const isShortcutsOpen = useStore(state => state.isShortcutsOpen);
  const setIsShortcutsOpen = useStore(state => state.setIsShortcutsOpen);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsShortcutsOpen(false);
    };
    if (isShortcutsOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isShortcutsOpen, setIsShortcutsOpen]);

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { keys: ['/'], description: 'Focus Search Bar' },
    { keys: ['Ctrl', 'K'], description: 'Focus Search Bar (Alternative)' },
    { keys: ['?'], description: 'Toggle Keyboard Shortcuts Menu' },
    { keys: ['←', '→'], description: 'Navigate prev/next Bookmark in Detail View' },
    { keys: ['←', '→'], description: 'Navigate Media Lightbox' },
    { keys: ['Esc'], description: 'Close Modals & Lightboxes' }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsShortcutsOpen(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden transform transition-transform" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Keyboard Shortcuts
          </h2>
          <button onClick={() => setIsShortcutsOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-400 text-xs">+</span>}
                    <kbd className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm font-mono flex items-center gap-1">
                      {key === 'Ctrl' ? <><Command className="w-3 h-3"/> Ctrl</> : key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}