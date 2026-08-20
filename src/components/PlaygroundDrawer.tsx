import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Play,
  Volume2,
  ShieldCheck,
  ExternalLink,
  Mic,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  Building2,
  Zap,
  Cpu,
  Radio,
  CheckCircle2,
  Key,
  Sparkles,
  User,
  RotateCcw,
} from 'lucide-react';
import { VoiceSettings, PresetScenario } from '../types/voice';
import {
  DEFAULT_VOICE_PRESETS,
  PRESET_SCENARIOS,
  GROQ_MODELS,
  ELEVENLABS_VOICES,
  PERSONA_PRESETS,
  DEFAULT_PERSONA,
} from '../data/voicePresets';

interface PlaygroundDrawerProps {
  isOpen: boolean;
  settings: VoiceSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onSelectScenario: (scenario: PresetScenario) => void;
  onOpenKeysModal?: () => void;
}

export const PlaygroundDrawer: React.FC<PlaygroundDrawerProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onSelectScenario,
  onOpenKeysModal,
}) => {
  const [providerStatus, setProviderStatus] = useState<{
    groq?: { available: boolean };
    elevenlabs?: { available: boolean; defaultVoiceId?: string };
    gemini?: { available: boolean };
  }>({});
  const [customVoiceInput, setCustomVoiceInput] = useState<string>(
    settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'
  );

  useEffect(() => {
    if (isOpen) {
      fetch('/api/voice/providers')
        .then((res) => res.json())
        .then((data) => setProviderStatus(data))
        .catch((e) => console.warn('Could not fetch provider status:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderIcon = (name: string) => {
    switch (name) {
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-orange-400" />;
      case 'HelpCircle':
        return <HelpCircle className="w-4 h-4 text-orange-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-orange-400" />;
      case 'Building2':
        return <Building2 className="w-4 h-4 text-orange-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-orange-400" />;
      default:
        return <Mic className="w-4 h-4 text-white/50" />;
    }
  };

  return (
    <div
      id="voice-lab-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Voice Lab Settings"
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md h-full glass-strong border-l border-white/8 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Sliders className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Iris VoiceLab</h2>
              <p className="text-xs text-white/40">Groq LLM • ElevenLabs TTS • Voice Config</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick API Key Setup Banner */}
          {onOpenKeysModal && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-red-500/10 to-transparent border border-orange-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">API Keys & Credentials</h4>
                  <p className="text-[11px] text-white/50">Configure Groq & ElevenLabs in Settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenKeysModal}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow transition-all"
              >
                Configure
              </button>
            </div>
          )}

          {/* Section 1: LLM Reasoning Engine (Groq & Gemini) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-orange-400" />
                <span>LLM Engine (Groq & Gemini)</span>
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {providerStatus.groq?.available ? 'Groq Active' : 'Multi-Model'}
              </span>
            </div>

            {/* Provider Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#111112] border border-white/5 rounded-xl mb-3">
              <button
                onClick={() => onUpdateSettings({ llmProvider: 'groq' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settings.llmProvider === 'groq'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Groq</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ llmProvider: 'gemini' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settings.llmProvider === 'gemini'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Gemini</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ llmProvider: 'auto' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settings.llmProvider === 'auto'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Auto</span>
              </button>
            </div>

            {/* Groq Model Picker */}
            {settings.llmProvider !== 'gemini' && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-white/50 font-medium">Groq Inference Model</label>
                <div className="grid grid-cols-1 gap-2">
                  {GROQ_MODELS.map((model) => {
                    const isSelected = settings.groqModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => onUpdateSettings({ groqModel: model.id, llmProvider: 'groq' })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#161618] border-orange-500/50 shadow-md ring-1 ring-orange-500/30'
                            : 'bg-[#111112] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{model.name}</span>
                          <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                            {model.latency}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 mt-1">{model.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: ElevenLabs AI Voice & Voice ID */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Voice & Speech Synthesis (TTS)</span>
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                ElevenLabs TTS
              </span>
            </div>

            {/* TTS Provider Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#111112] border border-white/5 rounded-xl mb-3">
              <button
                onClick={() => onUpdateSettings({ ttsProvider: 'elevenlabs' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                  settings.ttsProvider === 'elevenlabs'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>ElevenLabs</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ttsProvider: 'gemini' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                  settings.ttsProvider === 'gemini'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Gemini TTS</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ttsProvider: 'browser' })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                  settings.ttsProvider === 'browser'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Browser</span>
              </button>
            </div>

            {/* ElevenLabs Custom Voice ID Input */}
            {settings.ttsProvider === 'elevenlabs' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#111112] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-400" />
                      <span>ElevenLabs Voice ID</span>
                    </label>
                    <span className="text-[10px] text-white/40 font-mono">Custom or Preset</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customVoiceInput}
                      onChange={(e) => {
                        setCustomVoiceInput(e.target.value);
                        onUpdateSettings({ elevenLabsVoiceId: e.target.value.trim() });
                      }}
                      placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                      className="flex-1 bg-[#1A1A1C] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-orange-300 placeholder:text-white/20 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => {
                        onUpdateSettings({ elevenLabsVoiceId: customVoiceInput.trim() });
                      }}
                      className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40">
                    Paste any custom Voice ID from your ElevenLabs dashboard or pick below.
                  </p>
                </div>

                {/* Popular ElevenLabs Voice Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/50 font-medium">Curated ElevenLabs Voices</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ELEVENLABS_VOICES.map((voice) => {
                      const isSelected = settings.elevenLabsVoiceId === voice.voice_id;
                      return (
                        <div
                          key={voice.voice_id}
                          onClick={() => {
                            setCustomVoiceInput(voice.voice_id);
                            onUpdateSettings({
                              elevenLabsVoiceId: voice.voice_id,
                              ttsProvider: 'elevenlabs',
                            });
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#161618] border-orange-500/60 shadow-md ring-1 ring-orange-500/30'
                              : 'bg-[#111112] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-white">{voice.name}</span>
                            <span className="text-[9px] font-mono text-orange-400">{voice.accent}</span>
                          </div>
                          <p className="text-[10px] text-white/40 truncate">{voice.style}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ElevenLabs Model Selector */}
                <div>
                  <label className="text-[11px] text-white/50 font-medium mb-1 block">
                    ElevenLabs Audio Model
                  </label>
                  <select
                    value={settings.elevenLabsModel || 'eleven_turbo_v2_5'}
                    onChange={(e) => onUpdateSettings({ elevenLabsModel: e.target.value })}
                    className="w-full bg-[#111112] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Fastest, ~60ms latency)</option>
                    <option value="eleven_flash_v2_5">Eleven Flash v2.5 (Sub-50ms ultra speed)</option>
                    <option value="eleven_multilingual_v2">Eleven Multilingual v2 (32+ Languages)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Standard Sonic Presets when using Gemini TTS */}
            {settings.ttsProvider !== 'elevenlabs' && (
              <div className="grid grid-cols-1 gap-2 mt-2">
                {DEFAULT_VOICE_PRESETS.map((voice) => {
                  const isSelected = settings.voiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() => onUpdateSettings({ voiceId: voice.id })}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#161618] border-orange-500/50 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/30'
                          : 'bg-[#111112] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{voice.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1C] text-orange-300 border border-white/5">
                            {voice.accent}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/40 mt-1">{voice.description}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Preset Conversation Scenarios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-orange-400" />
                <span>Test Call Scenarios</span>
              </h3>
              <span className="text-[11px] text-white/30 uppercase font-mono">Tap to run</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {PRESET_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    onSelectScenario(scenario);
                    onClose();
                  }}
                  className="flex items-start gap-3 p-3.5 text-left rounded-2xl bg-[#111112] hover:bg-[#161618] border border-white/5 hover:border-orange-500/30 transition-all group"
                >
                  <div className="p-2 rounded-xl bg-[#1A1A1C] border border-white/5 group-hover:scale-105 transition-transform flex-shrink-0">
                    {renderIcon(scenario.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white group-hover:text-orange-300 transition-colors">
                        {scenario.label}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1A1C] text-white/40 border border-white/5 font-mono">
                        {scenario.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 truncate">
                      "{scenario.userPrompt}"
                    </p>
                    <p className="text-[11px] text-white/35 mt-1 line-clamp-1">
                      {scenario.expectedBehavior}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Conversational & VAD Tuning */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Voice Activity Detection (VAD)</span>
            </h3>

            <div className="space-y-4 p-4 rounded-2xl bg-[#111112] border border-white/5">
              {/* Hands free toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-white">
                    Continuous Hands-Free (VAD)
                  </label>
                  <p className="text-[11px] text-white/40">
                    Automatically sends speech when you pause talking.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.handsFreeMode}
                  onChange={(e) => onUpdateSettings({ handsFreeMode: e.target.checked })}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
              </div>

              {/* VAD Silence Threshold */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/70">Silence Pause Timeout</span>
                  <span className="font-mono text-orange-400">{settings.vadThreshold}ms</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="2500"
                  step="100"
                  value={settings.vadThreshold}
                  onChange={(e) => onUpdateSettings({ vadThreshold: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#222225] rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1.5 font-mono">
                  <span>Snappy (800ms)</span>
                  <span>Natural (1400ms)</span>
                  <span>Relaxed (2500ms)</span>
                </div>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <label className="text-xs font-medium text-white">
                    Acoustic Chimes & Sound FX
                  </label>
                  <p className="text-[11px] text-white/40">
                    Play connection and listening status tones.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Agent Persona */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span>Agent Persona</span>
              </h3>
              <button
                onClick={() => onUpdateSettings({ customPersona: DEFAULT_PERSONA })}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-orange-400 font-medium transition-colors"
                title="Reset to default persona"
                aria-label="Reset persona to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Persona Preset Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {PERSONA_PRESETS.map((persona) => {
                const isSelected = settings.customPersona === persona.systemPrompt;
                return (
                  <div
                    key={persona.id}
                    onClick={() => onUpdateSettings({ customPersona: persona.systemPrompt })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#161618] border-orange-500/50 shadow-md ring-1 ring-orange-500/30'
                        : 'bg-[#111112] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{persona.icon}</span>
                      <span className="text-xs font-semibold text-white">{persona.name}</span>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2">{persona.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111112] border border-white/5 space-y-2">
              <label className="text-xs font-medium text-white/80">
                System Prompt
              </label>
              <p className="text-[11px] text-white/40">
                Pick a persona above or write your own custom system prompt.
              </p>
              <textarea
                value={settings.customPersona || DEFAULT_PERSONA}
                onChange={(e) => onUpdateSettings({ customPersona: e.target.value })}
                rows={5}
                className="w-full bg-[#1A1A1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/90 placeholder:text-white/20 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                placeholder="Describe your agent's personality, tone, and behavior..."
                aria-label="Custom system prompt for the AI agent"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">
                  {(settings.customPersona || DEFAULT_PERSONA).length} characters
                </p>
                <p className="text-[10px] text-white/30">
                  Changes apply on next message
                </p>
              </div>
            </div>
          </div>

          {/* Section 6: Architecture & Specs */}
          <div className="p-4 rounded-2xl bg-[#080809] border border-white/5 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-white/90">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>Engine Stack</span>
            </div>
            <p className="text-white/50 leading-relaxed">
              Powered by Groq LPUs for sub-100ms LLM token generation paired with ElevenLabs high-fidelity neural voice synthesis.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-2">
              <span className="text-[11px] text-orange-400 font-mono">
                Groq • ElevenLabs • Gemini
              </span>
              <span className="text-[11px] font-mono text-white/40">
                Developed by Dr Fendi
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


