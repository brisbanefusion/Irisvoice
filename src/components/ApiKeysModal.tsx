import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Zap,
  Volume2,
  Sparkles,
  ExternalLink,
  Loader2,
  Trash2,
  Check,
  Cpu,
} from 'lucide-react';
import { ApiKeysConfig } from '../types/apiKeys';
import { ELEVENLABS_VOICES } from '../data/voicePresets';
import { testGroqDirect, testElevenLabsDirect, testGeminiDirect } from '../services/directVoiceApi';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeysConfig;
  onSaveKeys: (keys: ApiKeysConfig) => void;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
}) => {
  const [formData, setFormData] = useState<ApiKeysConfig>({
    groqApiKey: '',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    geminiApiKey: '',
  });

  const [showGroq, setShowGroq] = useState(false);
  const [showEleven, setShowEleven] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatus, setGroqStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [testingEleven, setTestingEleven] = useState(false);
  const [elevenStatus, setElevenStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [savedBanner, setSavedBanner] = useState(false);

  const modalCardRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus first input when modal opens
  useEffect(() => {
    if (isOpen && modalCardRef.current) {
      const firstInput = modalCardRef.current.querySelector('input') as HTMLInputElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData(apiKeys);
      setGroqStatus(null);
      setElevenStatus(null);
      setGeminiStatus(null);
      setSavedBanner(false);
    }
  }, [isOpen, apiKeys]);

  if (!isOpen) return null;

  const handleTestKey = async (provider: 'groq' | 'elevenlabs' | 'gemini') => {
    if (provider === 'groq') {
      if (!formData.groqApiKey?.trim()) {
        setGroqStatus({ success: false, message: 'Please enter a Groq API key first.' });
        return;
      }
      setTestingGroq(true);
      setGroqStatus(null);
      try {
        const result = await testGroqDirect(formData.groqApiKey);
        setGroqStatus(result);
      } catch (e: any) {
        setGroqStatus({ success: false, message: e?.message || 'Network error' });
      } finally {
        setTestingGroq(false);
      }
    } else if (provider === 'elevenlabs') {
      if (!formData.elevenLabsApiKey?.trim()) {
        setElevenStatus({ success: false, message: 'Please enter an ElevenLabs API key first.' });
        return;
      }
      setTestingEleven(true);
      setElevenStatus(null);
      try {
        const result = await testElevenLabsDirect(formData.elevenLabsApiKey, formData.elevenLabsVoiceId);
        setElevenStatus(result);
      } catch (e: any) {
        setElevenStatus({ success: false, message: e?.message || 'Network error' });
      } finally {
        setTestingEleven(false);
      }
    } else if (provider === 'gemini') {
      if (!formData.geminiApiKey?.trim()) {
        setGeminiStatus({ success: false, message: 'Please enter a Gemini API key first.' });
        return;
      }
      setTestingGemini(true);
      setGeminiStatus(null);
      try {
        const result = await testGeminiDirect(formData.geminiApiKey);
        setGeminiStatus(result);
      } catch (e: any) {
        setGeminiStatus({ success: false, message: e?.message || 'Network error' });
      } finally {
        setTestingGemini(false);
      }
    }
  };

  const handleSave = () => {
    onSaveKeys(formData);
    setSavedBanner(true);
    setTimeout(() => {
      setSavedBanner(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    const emptyKeys: ApiKeysConfig = {
      groqApiKey: '',
      elevenLabsApiKey: '',
      elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
      geminiApiKey: '',
    };
    setFormData(emptyKeys);
    onSaveKeys(emptyKeys);
    setGroqStatus(null);
    setElevenStatus(null);
    setGeminiStatus(null);
  };

  return (
    <div
      id="api-keys-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="API Keys Configuration"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="api-keys-modal-card"
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0E0E10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/5 bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>API Keys & Engines</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-orange-300">
                  Iris VoiceLab
                </span>
              </h2>
              <p className="text-xs text-white/40">
                Configure Groq, ElevenLabs, and Voice ID settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Groq API Key */}
          <div className="p-4 rounded-2xl bg-[#141417] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <span>Groq API Key</span>
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium"
              >
                <span>Get Groq Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showGroq ? 'text' : 'password'}
                value={formData.groqApiKey}
                onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value.trim() })}
                placeholder="gsk_..."
                className="w-full bg-[#1C1C20] border border-white/10 rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowGroq(!showGroq)}
                  className="p-1.5 text-white/40 hover:text-white transition-colors"
                  title={showGroq ? 'Hide Key' : 'Show Key'}
                >
                  {showGroq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestKey('groq')}
                  disabled={testingGroq}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {testingGroq ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </button>
              </div>
            </div>

            {groqStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  groqStatus.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {groqStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed break-words flex-1">{groqStatus.message}</span>
              </div>
            )}
            <p className="text-[11px] text-white/40">
              Powers ultra-fast conversational token generation with Llama 3.3 70B & 8B (~65-120ms).
            </p>
          </div>

          {/* Section 2: ElevenLabs API Key & Voice ID */}
          <div className="p-4 rounded-2xl bg-[#141417] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-orange-400" />
                <span>ElevenLabs API Key</span>
              </label>
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium"
              >
                <span>Get ElevenLabs Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showEleven ? 'text' : 'password'}
                value={formData.elevenLabsApiKey}
                onChange={(e) => setFormData({ ...formData, elevenLabsApiKey: e.target.value.trim() })}
                placeholder="xi-api-key or sk_..."
                className="w-full bg-[#1C1C20] border border-white/10 rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowEleven(!showEleven)}
                  className="p-1.5 text-white/40 hover:text-white transition-colors"
                  title={showEleven ? 'Hide Key' : 'Show Key'}
                >
                  {showEleven ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestKey('elevenlabs')}
                  disabled={testingEleven}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {testingEleven ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </button>
              </div>
            </div>

            {elevenStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  elevenStatus.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {elevenStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed break-words flex-1">{elevenStatus.message}</span>
              </div>
            )}

            {/* Voice ID input & presets */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-medium text-white/80 flex items-center justify-between">
                <span>ElevenLabs Default Voice ID</span>
                <span className="text-[10px] text-white/40 font-mono">Custom or Preset</span>
              </label>
              <input
                type="text"
                value={formData.elevenLabsVoiceId}
                onChange={(e) =>
                  setFormData({ ...formData, elevenLabsVoiceId: e.target.value.trim() })
                }
                placeholder="21m00Tcm4TlvDq8ikWAM"
                className="w-full bg-[#1C1C20] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-orange-300 placeholder:text-white/20 focus:outline-none focus:border-orange-500"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {ELEVENLABS_VOICES.slice(0, 4).map((v) => (
                  <button
                    key={v.voice_id}
                    type="button"
                    onClick={() => setFormData({ ...formData, elevenLabsVoiceId: v.voice_id })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                      formData.elevenLabsVoiceId === v.voice_id
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-[#1C1C20] border-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {v.name} ({v.accent})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Gemini API Key (Optional) */}
          <div className="p-4 rounded-2xl bg-[#141417] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Gemini API Key (Optional Override)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium"
              >
                <span>AI Studio Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showGemini ? 'text' : 'password'}
                value={formData.geminiApiKey}
                onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value.trim() })}
                placeholder="AIzaSy..."
                className="w-full bg-[#1C1C20] border border-white/10 rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowGemini(!showGemini)}
                  className="p-1.5 text-white/40 hover:text-white transition-colors"
                >
                  {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestKey('gemini')}
                  disabled={testingGemini}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {testingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                </button>
              </div>
            </div>

            {geminiStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  geminiStatus.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {geminiStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed break-words flex-1">{geminiStatus.message}</span>
              </div>
            )}
            <p className="text-[11px] text-white/40">
              Used as the secondary intelligence engine and multimodal fallback.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#121214] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Keys</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5"
            >
              {savedBanner ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save & Apply</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
