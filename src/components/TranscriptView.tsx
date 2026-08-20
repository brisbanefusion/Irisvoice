import React, { useEffect, useRef } from 'react';
import { Volume2, Copy, Check, Sparkles, Zap, MessageSquare, ExternalLink } from 'lucide-react';
import { ChatMessage, AgentStatus } from '../types/voice';

interface TranscriptViewProps {
  messages: ChatMessage[];
  interimTranscript: string;
  status: AgentStatus;
  onReplayAudio: (message: ChatMessage) => void;
  onOpenUrl?: (url: string) => void;
}

// Parse text and render URLs as clickable links
const renderTextWithLinks = (text: string, onOpenUrl?: (url: string) => void) => {
  const urlRegex = /(https?:\/\/[^\s,"')\]>]+|www\.[^\s,"')\]>]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      if (onOpenUrl) {
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onOpenUrl(href); }}
            className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 underline decoration-orange-400/30 hover:decoration-orange-300/50 transition-colors cursor-pointer"
          >
            {part}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </button>
        );
      }
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 underline decoration-orange-400/30 hover:decoration-orange-300/50 transition-colors"
        >
          {part}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  interimTranscript,
  status,
  onReplayAudio,
  onOpenUrl,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const prevMsgCountRef = useRef(messages.length);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: prevMsgCountRef.current < messages.length ? 'smooth' : 'auto',
      });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, interimTranscript]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  return (
    <div
      id="transcript-container"
      className="flex flex-col h-full rounded-2xl sm:rounded-3xl glass overflow-hidden shadow-2xl relative min-h-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5 bg-[#0A0A0B]/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            {status !== 'idle' && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-orange-500 animate-ping opacity-50" />
            )}
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
            Live Transcript
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/35 font-mono">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/3">
            <Zap className="w-2.5 h-2.5 text-orange-400" />
            <span>Sonic &lt;90ms</span>
          </span>
          <span className="tabular-nums">{messages.length} turns</span>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0D0D0E] to-transparent z-10 pointer-events-none" />

        <div ref={scrollRef} className="h-full p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !interimTranscript && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/10 flex items-center justify-center animate-breathe">
                  <MessageSquare className="w-6 h-6 text-orange-400/50" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-orange-400" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white/50 mb-1">No conversation yet</p>
              <p className="text-[11px] text-white/25 max-w-[240px] leading-relaxed">
                Start a call or type a message to begin a real-time voice conversation.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, idx) => {
            const isAgent = msg.role === 'assistant';
            const isNew = idx >= messages.length - 1 && messages.length > prevMsgCountRef.current;
            return (
              <div
                key={msg.id}
                id={`transcript-turn-${msg.id}`}
                className={`group flex items-start gap-3 ${isNew ? 'animate-slide-up' : ''} ${isAgent ? '' : 'opacity-85'}`}
              >
                {/* Avatar */}
                {isAgent ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white shadow-lg shadow-orange-500/20">
                    AI
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white/40 border border-white/5">
                    ME
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">
                      {isAgent ? 'Agent' : 'You'}
                    </span>
                    {msg.latencyMs && (
                      <span className="text-[9px] font-mono text-orange-400/70 px-1.5 py-0.5 rounded-md bg-orange-500/8 border border-orange-500/15">
                        {msg.latencyMs}ms
                      </span>
                    )}
                    <span className="text-[9px] text-white/18 font-mono tabular-nums">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <p
                    className={`text-xs sm:text-[13px] leading-relaxed ${
                      isAgent ? 'text-white/85' : 'text-white/65'
                    }`}
                  >
                    {renderTextWithLinks(msg.content, onOpenUrl)}
                  </p>

                  {/* Hover actions */}
                  <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isAgent && (
                      <button
                        onClick={() => onReplayAudio(msg)}
                        title="Replay audio"
                        className="flex items-center gap-1 text-[9px] text-white/30 hover:text-orange-400 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Copy text"
                      className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live interim transcript */}
          {interimTranscript && (
            <div className="flex items-start gap-3 animate-fade-in opacity-90">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/25 flex-shrink-0 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-green-400/70 uppercase tracking-wider mb-1 block">
                  Transcribing...
                </span>
                <p className="text-xs sm:text-[13px] leading-relaxed italic text-green-200/80">
                  "{interimTranscript}"
                </p>
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {status === 'thinking' && !interimTranscript && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex-shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              </div>
              <div className="flex-1 pt-1 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-white/30 font-mono">Generating response...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#0D0D0E] to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
};
