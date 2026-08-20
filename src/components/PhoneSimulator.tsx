import React, { useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  Sparkles,
  Hand,
} from 'lucide-react';
import { AgentStatus } from '../types/voice';

interface PhoneSimulatorProps {
  callActive: boolean;
  status: AgentStatus;
  isMuted: boolean;
  callDuration: number;
  lastAgentMessage?: string;
  interimTranscript?: string;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  callActive,
  status,
  isMuted,
  callDuration,
  lastAgentMessage,
  interimTranscript,
  onToggleCall,
  onToggleMute,
  onInterrupt,
}) => {
  const [showKeypad, setShowKeypad] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const keypadKeys = [
    { num: '1', sub: '' }, { num: '2', sub: 'ABC' }, { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' }, { num: '5', sub: 'JKL' }, { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' }, { num: '8', sub: 'TUV' }, { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' }, { num: '0', sub: '+' }, { num: '#', sub: '' },
  ];

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return { dot: 'bg-green-500', text: 'text-green-400', ring: 'ring-green-500/30', glow: 'shadow-green-500/20' };
      case 'speaking': return { dot: 'bg-orange-500', text: 'text-orange-400', ring: 'ring-orange-500/30', glow: 'shadow-orange-500/20' };
      case 'thinking': return { dot: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/30', glow: 'shadow-amber-500/20' };
      case 'muted': return { dot: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30', glow: 'shadow-red-500/20' };
      default: return { dot: 'bg-white/20', text: 'text-white/50', ring: 'ring-white/10', glow: '' };
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="w-full max-w-xs sm:max-w-sm mx-auto glass-strong border border-white/8 rounded-[36px] p-5 shadow-2xl flex flex-col justify-between max-h-[calc(100vh-5.5rem)] min-h-[460px] relative overflow-hidden">
      {/* Ambient glow background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[36px]">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[150px] rounded-full blur-[80px] transition-colors duration-700"
          style={{
            backgroundColor: callActive
              ? status === 'speaking' ? 'rgba(249, 115, 22, 0.08)' : status === 'listening' ? 'rgba(34, 197, 94, 0.06)' : 'rgba(249, 115, 22, 0.04)'
              : 'rgba(255, 255, 255, 0.02)',
          }}
        />
      </div>

      {/* Phone speaker notch */}
      <div className="relative z-10 w-16 h-1 bg-white/10 rounded-full mx-auto mb-4" />

      {/* Caller Header */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2">
        {/* Avatar with animated ring */}
        <div className="relative">
          <div
            className={`w-18 h-18 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/20 transition-all duration-500 ${
              callActive ? `ring-4 ${statusColor.ring} ${statusColor.glow}` : 'ring-4 ring-white/5'
            }`}
            style={{ width: 72, height: 72 }}
          >
            <Sparkles className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
          {callActive && (
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-[8px] font-bold font-mono shadow-lg shadow-green-500/30 animate-pulse">
              LIVE
            </div>
          )}
        </div>

        <div>
          <h3 className="text-base font-bold text-white">Iris VoiceLab</h3>
          <p className="text-[10px] text-orange-400/70 font-medium">Voice AI Agent • Dr Fendi</p>
        </div>

        {/* Timer */}
        <div className="text-2xl font-mono font-bold text-white/90 tabular-nums tracking-wider">
          {callActive ? formatTimer(callDuration) : (
            <span className="text-sm text-white/40 font-normal">Ready</span>
          )}
        </div>

        {/* Status pill */}
        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor.dot} ${status !== 'idle' ? 'animate-pulse' : ''}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor.text}`}>
            {status === 'speaking' ? 'Agent Speaking' :
             status === 'listening' ? 'Listening' :
             status === 'thinking' ? 'Processing' :
             status === 'muted' ? 'Muted' :
             callActive ? 'Ready' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Center Content */}
      <div className="relative z-10 my-3 flex-1 min-h-0 flex flex-col justify-center overflow-y-auto">
        {showKeypad ? (
          <div className="grid grid-cols-3 gap-2 p-1">
            {keypadKeys.map((k) => (
              <button
                key={k.num}
                type="button"
                className="btn-ripple flex flex-col items-center justify-center h-11 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 text-white active:scale-95 transition-all duration-150"
              >
                <span className="text-sm font-semibold">{k.num}</span>
                {k.sub && <span className="text-[7px] text-white/30 font-mono tracking-wider">{k.sub}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-white/80 min-h-[70px] flex items-center justify-center text-center">
            {interimTranscript ? (
              <p className="italic text-green-300/90 leading-relaxed">"{interimTranscript}"</p>
            ) : lastAgentMessage ? (
              <p className="line-clamp-3 leading-relaxed text-white/80">{lastAgentMessage}</p>
            ) : (
              <p className="text-white/30 text-[11px]">Tap call to start talking</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="relative z-10 space-y-3 flex-shrink-0">
        {callActive && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onToggleMute}
              className={`btn-ripple flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                isMuted
                  ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-lg shadow-red-500/10'
                  : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4 mb-0.5" /> : <Mic className="w-4 h-4 mb-0.5" />}
              <span className="text-[9px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            <button
              onClick={() => setShowKeypad(!showKeypad)}
              className={`btn-ripple flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                showKeypad
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                  : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-semibold">Keypad</span>
            </button>

            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`btn-ripple flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                speakerOn
                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                  : 'bg-white/5 border-white/5 text-white/40'
              }`}
            >
              {speakerOn ? <Volume2 className="w-4 h-4 mb-0.5" /> : <VolumeX className="w-4 h-4 mb-0.5" />}
              <span className="text-[9px] font-semibold">Speaker</span>
            </button>
          </div>
        )}

        {/* Call button */}
        <div className="flex justify-center">
          <button
            onClick={onToggleCall}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 hover:scale-105 ${
              callActive
                ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-red-600/30 hover:shadow-red-600/40'
                : 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/30 hover:shadow-orange-500/40'
            }`}
          >
            {callActive ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
