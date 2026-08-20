import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Sliders,
  Send,
  Square,
  Radio,
  ChevronDown,
  Hand,
} from 'lucide-react';
import { AgentStatus, VoiceSettings } from '../types/voice';
import { DEFAULT_VOICE_PRESETS } from '../data/voicePresets';

interface CallControlsProps {
  callActive: boolean;
  status: AgentStatus;
  isMuted: boolean;
  settings: VoiceSettings;
  callDuration: number;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onToggleHandsFree: () => void;
  onInterrupt: () => void;
  onSendMessage: (text: string) => void;
  onOpenSettings: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  callActive,
  status,
  isMuted,
  settings,
  callDuration,
  onToggleCall,
  onToggleMute,
  onToggleHandsFree,
  onInterrupt,
  onSendMessage,
  onOpenSettings,
}) => {
  const [inputText, setInputText] = useState('');

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const currentVoice = DEFAULT_VOICE_PRESETS.find((v) => v.id === settings.voiceId) || DEFAULT_VOICE_PRESETS[0];

  return (
    <div id="call-controls-panel" className="w-full flex flex-col gap-3">
      {/* Primary Controls Bar */}
      <div className="glass flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-4 rounded-2xl shadow-2xl">
        {/* Left: Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute */}
          <button
            id="btn-toggle-mute"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`btn-ripple w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${
              isMuted
                ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25 shadow-lg shadow-red-500/10'
                : 'border-white/8 text-white/70 hover:bg-white/8 hover:text-white hover:border-white/15 hover:shadow-lg hover:shadow-white/5'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Hands-Free */}
          <button
            id="btn-toggle-handsfree"
            type="button"
            onClick={onToggleHandsFree}
            title={settings.handsFreeMode ? 'Hands-free VAD Active' : 'Push to talk mode'}
            className={`btn-ripple w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${
              settings.handsFreeMode
                ? 'border-green-500/30 text-green-400 bg-green-500/10 shadow-lg shadow-green-500/10'
                : 'border-white/8 text-white/50 hover:bg-white/8 hover:text-white hover:border-white/15'
            }`}
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Interrupt */}
          {status === 'speaking' && (
            <button
              id="btn-interrupt-speech"
              type="button"
              onClick={onInterrupt}
              title="Interrupt Agent (Barge-in)"
              className="btn-ripple px-4 h-10 sm:h-11 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 text-xs font-bold flex items-center gap-1.5 animate-scale-in"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Interrupt</span>
            </button>
          )}

          {/* Duration */}
          {callActive && (
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] font-mono text-white/60 tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-2" />
              {formatTimer(callDuration)}
            </div>
          )}
        </div>

        {/* Center: Voice Selector */}
        <button
          id="btn-voice-selector"
          type="button"
          onClick={onOpenSettings}
          className="btn-ripple hover-lift flex items-center gap-2.5 bg-[#141416] px-4 py-2.5 rounded-full border border-white/5 hover:border-orange-500/20 transition-all duration-200 group"
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 group-hover:scale-125 transition-transform duration-200" />
            {callActive && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-orange-500 animate-ping opacity-50" />
            )}
          </div>
          <span className="text-xs font-semibold text-white/80 group-hover:text-white truncate max-w-[100px] sm:max-w-none transition-colors">
            {currentVoice.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors duration-200" />
        </button>

        {/* Right: Call Button */}
        <div>
          {callActive ? (
            <button
              id="btn-end-session"
              type="button"
              onClick={onToggleCall}
              className="btn-ripple px-5 sm:px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-xl hover:shadow-red-500/20 transition-all duration-200 flex items-center gap-2"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          ) : (
            <button
              id="btn-start-session"
              type="button"
              onClick={onToggleCall}
              className="btn-ripple px-6 sm:px-7 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:from-orange-400 hover:to-red-500 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Start Call</span>
            </button>
          )}
        </div>
      </div>

      {/* Text Input */}
      {callActive && (
        <form
          onSubmit={handleSend}
          id="hybrid-input-form"
          className="relative flex items-center w-full rounded-xl bg-[#141416]/80 border border-white/5 focus-within:border-orange-500/40 focus-within:shadow-lg focus-within:shadow-orange-500/5 transition-all duration-200"
        >
          <div className="pl-4 pr-1 py-1">
            <Send className="w-3.5 h-3.5 text-white/20" />
          </div>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to the voice assistant..."
            className="flex-1 py-2.5 pr-10 text-xs sm:text-sm text-white/90 bg-transparent rounded-xl focus:outline-none placeholder:text-white/25"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-20 disabled:from-white/10 disabled:to-white/10 text-white shadow-md shadow-orange-500/15 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-200 disabled:cursor-not-allowed"
            title="Send text prompt"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
};
