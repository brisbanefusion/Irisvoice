import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Camera,
  Key,
  Sliders,
  RotateCcw,
  Sparkles,
  Download,
  Radio,
  Zap,
  X,
} from 'lucide-react';
import { PERSONA_PRESETS } from '../data/voicePresets';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onResetCall: () => void;
  onOpenSettings: () => void;
  onOpenKeysModal: () => void;
  onOpenCamera: () => void;
  onUpdatePersona: (id: string) => void;
  onExportTranscript: () => void;
  callActive: boolean;
  isMuted: boolean;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onToggleCall,
  onToggleMute,
  onResetCall,
  onOpenSettings,
  onOpenKeysModal,
  onOpenCamera,
  onUpdatePersona,
  onExportTranscript,
  callActive,
  isMuted,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    // Call actions
    {
      id: 'call',
      label: callActive ? 'End Call' : 'Start Call',
      description: callActive ? 'Hang up the current call' : 'Begin a new voice call',
      icon: callActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />,
      shortcut: 'Space',
      action: () => { onToggleCall(); onClose(); },
      category: 'Call',
    },
    {
      id: 'mute',
      label: isMuted ? 'Unmute' : 'Mute',
      description: isMuted ? 'Enable microphone' : 'Disable microphone',
      icon: isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />,
      shortcut: 'M',
      action: () => { onToggleMute(); onClose(); },
      category: 'Call',
    },
    {
      id: 'reset',
      label: 'Reset Conversation',
      description: 'Clear all messages and start fresh',
      icon: <RotateCcw className="w-4 h-4" />,
      shortcut: 'R',
      action: () => { onResetCall(); onClose(); },
      category: 'Call',
    },
    // Panels
    {
      id: 'settings',
      label: 'Open Voice Lab',
      description: 'Configure voice, LLM, and TTS settings',
      icon: <Sliders className="w-4 h-4" />,
      action: () => { onOpenSettings(); onClose(); },
      category: 'Panels',
    },
    {
      id: 'keys',
      label: 'API Keys',
      description: 'Configure Groq, ElevenLabs, and Gemini keys',
      icon: <Key className="w-4 h-4" />,
      action: () => { onOpenKeysModal(); onClose(); },
      category: 'Panels',
    },
    {
      id: 'camera',
      label: 'Camera Studio',
      description: 'Webcam feed, AR filters, and vision analysis',
      icon: <Camera className="w-4 h-4" />,
      action: () => { onOpenCamera(); onClose(); },
      category: 'Panels',
    },
    // Personas
    ...PERSONA_PRESETS.map((p) => ({
      id: `persona-${p.id}`,
      label: `Switch to ${p.name}`,
      description: p.description,
      icon: <span className="text-base">{p.icon}</span>,
      action: () => { onUpdatePersona(p.id); onClose(); },
      category: 'Persona',
    })),
    // Export
    {
      id: 'export',
      label: 'Export Transcript',
      description: 'Download conversation as text file',
      icon: <Download className="w-4 h-4" />,
      shortcut: '⌘⇧E',
      action: () => { onExportTranscript(); onClose(); },
      category: 'Actions',
    },
  ];

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const executeCommand = useCallback((cmd: Command) => {
    cmd.action();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selectedIndex, executeCommand, onClose]
  );

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-strong rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <Search className="w-4 h-4 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/30 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-white/30 text-sm">
              No commands found
            </div>
          )}

          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/25">
                {category}
              </div>
              {cmds.map((cmd) => {
                const globalIdx = filtered.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 ${
                      globalIdx === selectedIndex
                        ? 'bg-orange-500/15 text-orange-300'
                        : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${globalIdx === selectedIndex ? 'text-orange-400' : 'text-white/40'}`}>
                      {cmd.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-[11px] text-white/30 truncate">{cmd.description}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/30 font-mono flex-shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-4 text-[10px] text-white/20">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
};
