import React from 'react';
import {
  Sparkles,
  Zap,
  Sliders,
  RotateCcw,
  Smartphone,
  Radio,
  Activity,
  Volume2,
  Key,
  Download,
  Keyboard,
  Camera,
} from 'lucide-react';
import { LatencyMetrics, VoiceSettings, ChatMessage } from '../types/voice';
import { PERSONA_PRESETS } from '../data/voicePresets';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  metrics: LatencyMetrics;
  settings?: VoiceSettings;
  viewMode: 'studio' | 'phone';
  messages?: ChatMessage[];
  onToggleViewMode: () => void;
  onOpenSettings: () => void;
  onOpenKeysModal?: () => void;
  onResetCall: () => void;
  onExportTranscript?: () => void;
  onUpdatePersona?: (personaId: string) => void;
  onOpenCamera?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  settings,
  viewMode,
  messages,
  onToggleViewMode,
  onOpenSettings,
  onOpenKeysModal,
  onResetCall,
  onExportTranscript,
  onUpdatePersona,
  onOpenCamera,
}) => {
  return (
    <header
      id="app-header"
      className="w-full glass-strong border-b border-white/5 sticky top-0 z-40 flex-shrink-0"
    >
      {/* Subtle top gradient accent line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Brand & Identity */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Animated logo */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl animate-glow-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="drop-shadow-sm">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                Iris <span className="text-white/30 font-normal">VoiceLab</span>
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-300/80">
                by Dr Fendi
              </span>
            </div>
            <p className="text-[10px] text-white/30 font-mono leading-none mt-0.5 md:hidden">
              Developed by Dr Fendi
            </p>
          </div>
        </div>

        {/* Center: Live Status & Engine Indicators */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {/* Live indicator with animated ping */}
          <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-green-500">
              Live
            </span>
          </div>

          {settings && (
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-white/60 flex items-center gap-1.5 hover:bg-white/8 hover:border-white/10 transition-all cursor-default">
                <Zap className="w-2.5 h-2.5 text-orange-400" />
                {settings.llmProvider === 'gemini' ? 'Gemini' : 'Groq GPT-OSS'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-white/60 flex items-center gap-1.5 hover:bg-white/8 hover:border-white/10 transition-all cursor-default">
                <Volume2 className="w-2.5 h-2.5 text-orange-400" />
                {settings.ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'Iris TTS'}
              </span>
            </div>
          )}

          {/* Latency display */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium font-mono px-2 py-1 rounded-lg bg-white/3 hover:bg-white/5 transition-colors cursor-default">
            {metrics.currentLatencyMs > 0 ? (
              <span className="text-orange-400">{metrics.currentLatencyMs}ms</span>
            ) : (
              'sub-90ms'
            )}
          </div>
        </div>

        {/* Center-Right: Quick Persona Selector */}
        {onUpdatePersona && (
          <>
            {/* Desktop: Pill buttons */}
            <div className="hidden md:flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-[#111112]/80 border border-white/5">
              {PERSONA_PRESETS.map((persona) => {
                const isActive = settings?.customPersona === persona.systemPrompt;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => onUpdatePersona(persona.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/40 text-orange-200 shadow-md shadow-orange-500/10'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent hover:border-white/5'
                    }`}
                    title={`Switch to ${persona.name}`}
                  >
                    <span className={`text-sm leading-none transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                      {persona.icon}
                    </span>
                    <span>{persona.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile: Compact dropdown */}
            <div className="md:hidden relative">
              <select
                value={PERSONA_PRESETS.find((p) => settings?.customPersona === p.systemPrompt)?.id || 'iris'}
                onChange={(e) => onUpdatePersona(e.target.value)}
                className="appearance-none bg-[#141416] border border-white/10 rounded-full px-3 py-1.5 pr-7 text-[11px] font-medium text-orange-300 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 cursor-pointer transition-all"
                aria-label="Select persona"
              >
                {PERSONA_PRESETS.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.icon} {persona.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* API Keys */}
          {onOpenKeysModal && (
            <button
              id="btn-header-api-keys"
              type="button"
              onClick={onOpenKeysModal}
              className="btn-ripple hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] hover:bg-orange-500/10 hover:border-orange-500/30 text-white/60 hover:text-orange-300 border border-white/5 hover:border-orange-500/20 text-xs font-medium transition-all duration-200"
              title="Configure API Keys & Providers"
            >
              <Key className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400" />
              <span className="hidden sm:inline">Keys</span>
            </button>
          )}

          {/* Camera */}
          {onOpenCamera && (
            <button
              id="btn-header-camera"
              type="button"
              onClick={onOpenCamera}
              className="btn-ripple hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] hover:bg-orange-500/10 hover:border-orange-500/30 text-white/60 hover:text-orange-300 border border-white/5 hover:border-orange-500/20 text-xs font-medium transition-all duration-200"
              title="Open Camera Studio"
            >
              <Camera className="w-3.5 h-3.5 text-orange-400/70" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          )}

          {/* View mode toggle */}
          <button
            id="btn-toggle-view-mode"
            type="button"
            onClick={onToggleViewMode}
            className="btn-ripple hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] hover:bg-white/5 text-white/60 hover:text-white border border-white/5 hover:border-white/10 text-xs font-medium transition-all duration-200"
            title={viewMode === 'studio' ? 'Switch to Phone View' : 'Switch to Studio View'}
          >
            {viewMode === 'studio' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-white/50" />
                <span className="hidden sm:inline">Phone</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Studio</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-white/5 hidden sm:block" />

          {/* Export Transcript */}
          {onExportTranscript && messages && messages.length > 0 && (
            <button
              id="btn-export-transcript"
              type="button"
              onClick={onExportTranscript}
              className="btn-ripple p-2 rounded-full bg-[#141416] hover:bg-white/5 text-white/40 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200"
              title="Export transcript (Ctrl+Shift+E)"
              aria-label="Export conversation transcript"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Keyboard Shortcuts */}
          <button
            id="btn-shortcuts-info"
            type="button"
            className="hidden lg:flex btn-ripple p-2 rounded-full bg-[#141416] hover:bg-white/5 text-white/25 hover:text-white/50 border border-white/5 hover:border-white/10 transition-all duration-200"
            title="Shortcuts: Space=Call, M=Mute, R=Reset, H=Hands-free, Esc=Close"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Reset Call */}
          <button
            id="btn-reset-call"
            type="button"
            onClick={onResetCall}
            className="btn-ripple p-2 rounded-full bg-[#141416] hover:bg-white/5 text-white/40 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200"
            title="Reset conversation (R)"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Divider */}
          <div className="w-px h-4 bg-white/5 hidden sm:block" />

          {/* Voice Lab */}
          <button
            id="btn-header-lab"
            type="button"
            onClick={onOpenSettings}
            className="btn-ripple hover-lift flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-white/5 to-white/3 hover:from-orange-500/15 hover:to-red-500/10 text-white/80 hover:text-white border border-white/5 hover:border-orange-500/30 text-xs font-semibold shadow-sm hover:shadow-md hover:shadow-orange-500/10 transition-all duration-200"
          >
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Voice Lab</span>
          </button>
        </div>
      </div>
    </header>
  );
};
