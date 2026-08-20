/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SonicOrb } from './components/SonicOrb';
import { CallControls } from './components/CallControls';
import { TranscriptView } from './components/TranscriptView';
import { PhoneSimulator } from './components/PhoneSimulator';
import { PlaygroundDrawer } from './components/PlaygroundDrawer';
import { ApiKeysModal } from './components/ApiKeysModal';
import { CameraPanel } from './components/CameraPanel';
import { CommandPalette } from './components/CommandPalette';
import { WebViewer } from './components/WebViewer';
import { VoiceAudioManager } from './lib/audioManager';
import { soundFX } from './lib/soundFx';
import { ToastProvider, useToast } from './lib/toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  AgentStatus,
  ChatMessage,
  VoiceSettings,
  LatencyMetrics,
  PresetScenario,
} from './types/voice';
import { ApiKeysConfig } from './types/apiKeys';
import { DEFAULT_VOICE_SETTINGS, DEFAULT_VOICE_PRESETS, PERSONA_PRESETS } from './data/voicePresets';
import { Sparkles, Zap } from 'lucide-react';
import { chatGroqDirect, ttsElevenLabsDirect } from './services/directVoiceApi';

function AppInner() {
  const { showToast } = useToast();
  const [callActive, setCallActive] = useState<boolean>(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'studio' | 'phone'>('studio');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isWebViewerOpen, setIsWebViewerOpen] = useState<boolean>(false);
  const [webViewerUrl, setWebViewerUrl] = useState<string>('');
  const [faceData, setFaceData] = useState<{ brightness: number; motion: number; x: number; y: number } | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>(() => {
    try {
      const saved = localStorage.getItem('iris_voice_api_keys');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      groqApiKey: '',
      elevenLabsApiKey: '',
      elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
      geminiApiKey: '',
    };
  });

  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const savedKeys = localStorage.getItem('iris_voice_api_keys');
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        if (parsed.elevenLabsVoiceId) {
          return { ...DEFAULT_VOICE_SETTINGS, elevenLabsVoiceId: parsed.elevenLabsVoiceId };
        }
      }
    } catch (e) {}
    return DEFAULT_VOICE_SETTINGS;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  const [callDuration, setCallDuration] = useState<number>(0);

  const [metrics, setMetrics] = useState<LatencyMetrics>({
    currentLatencyMs: 0,
    avgLatencyMs: 0,
    ttfbMs: 0,
    totalTurns: 0,
    lastTurnTime: null,
  });

  const audioManagerRef = useRef<VoiceAudioManager | null>(null);
  const timerRef = useRef<any>(null);
  const activeUtteranceRef = useRef<string | null>(null);

  // Initialize audio manager once on mount
  useEffect(() => {
    const manager = new VoiceAudioManager();

    manager.onVolumeUpdate = (vol, freqArray) => {
      setAudioVolume(vol);
      setFrequencyData(new Uint8Array(freqArray));
    };

    manager.onTranscriptChange = (text) => {
      setInterimTranscript(text);
      if (text.trim().length > 0) {
        setStatus('listening');
      }
    };

    manager.onSpeechStart = () => {
      // If agent was speaking and user started talking -> Barge-in / Interrupt!
      if (status === 'speaking') {
        manager.interruptSpeech();
        setStatus('listening');
      }
    };

    manager.onSpeechEnd = (finalUserText) => {
      if (finalUserText.trim().length > 0) {
        setInterimTranscript('');
        handleUserUtterance(finalUserText.trim());
      }
    };

    manager.onRecognitionError = (err) => {
      console.warn('Voice STT Error event:', err);
    };

    audioManagerRef.current = manager;

    return () => {
      manager.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive]);

  // Save and update API keys
  const handleSaveKeys = (newKeys: ApiKeysConfig) => {
    setApiKeys(newKeys);
    try {
      localStorage.setItem('iris_voice_api_keys', JSON.stringify(newKeys));
    } catch (e) {}
    if (newKeys.elevenLabsVoiceId) {
      setSettings((prev) => ({ ...prev, elevenLabsVoiceId: newKeys.elevenLabsVoiceId }));
    }
  };

  // Handle user saying something (via STT or text submit)
  const handleUserUtterance = async (userText: string) => {
    if (!userText.trim()) return;

    // Immediately stop speech recognition temporarily to avoid echoing
    audioManagerRef.current?.stopListening();

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setStatus('thinking');

    const startTime = Date.now();

    try {
      let agentReply = '';
      let latency = 0;

      // If user provided custom Groq API key in UI and selected Groq/Auto, execute direct or via server
      if (apiKeys.groqApiKey?.trim() && (settings.llmProvider === 'groq' || settings.llmProvider === 'auto')) {
        try {
          const direct = await chatGroqDirect(
            updatedHistory.map((m) => ({ role: m.role, content: m.content })),
            apiKeys.groqApiKey,
            settings.groqModel
          );
          agentReply = direct.text;
          latency = direct.latencyMs;
        } catch (groqDirectErr) {
          console.warn('Groq direct failed, falling back to server route:', groqDirectErr);
        }
      }

      // If not resolved by direct call, call backend route
      if (!agentReply) {
        const res = await fetch('/api/voice/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
            llmProvider: settings.llmProvider,
            groqModel: settings.groqModel,
            customPersona: settings.customPersona,
            customKeys: apiKeys,
          }),
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = { text: "Um, so I'm listening. What would you like to explore next?" };
        }
        latency = Date.now() - startTime;
        agentReply = data.text || "Um, so I'm listening. What would you like to explore next?";
      }

      // Update metrics
      setMetrics((prev) => {
        const total = prev.totalTurns + 1;
        const newAvg = Math.round((prev.avgLatencyMs * prev.totalTurns + latency) / total);
        return {
          currentLatencyMs: latency,
          avgLatencyMs: newAvg,
          ttfbMs: latency,
          totalTurns: total,
          lastTurnTime: new Date(),
        };
      });

      const agentMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: agentReply,
        timestamp: new Date(),
        latencyMs: latency,
      };

      setMessages((prev) => [...prev, agentMessage]);
      setStatus('speaking');

      // Speak agent response using ElevenLabs or Gemini TTS
      await speakResponse(agentReply);

      // Return to listening mode if call is active and not muted
      if (callActive && !isMuted) {
        setStatus('listening');
        if (settings.handsFreeMode) {
          audioManagerRef.current?.startListening();
        }
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error generating voice agent response:', err);
      setStatus('idle');
      if (callActive && !isMuted && settings.handsFreeMode) {
        audioManagerRef.current?.startListening();
      }
    }
  };

  // Speaks response via ElevenLabs, Gemini TTS, or browser synthesis
  const speakResponse = async (text: string): Promise<void> => {
    activeUtteranceRef.current = text;
    const voiceObj = DEFAULT_VOICE_PRESETS.find((v) => v.id === settings.voiceId);

    // 1. If custom ElevenLabs key is configured, try direct client TTS first
    if (
      apiKeys.elevenLabsApiKey?.trim() &&
      (settings.ttsProvider === 'elevenlabs' || settings.ttsProvider === 'auto')
    ) {
      try {
        const targetVoiceId = settings.elevenLabsVoiceId || apiKeys.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
        const directAudio = await ttsElevenLabsDirect(
          text,
          apiKeys.elevenLabsApiKey,
          targetVoiceId,
          settings.elevenLabsModel
        );
        if (directAudio.audioBase64 && audioManagerRef.current) {
          const played = await audioManagerRef.current.playAudioData(
            directAudio.audioBase64,
            directAudio.mimeType,
            44100
          );
          if (played) return;
        }
      } catch (directTtsErr) {
        console.warn('ElevenLabs direct TTS error, falling back to server/browser:', directTtsErr);
      }
    }

    // 2. Try Server TTS (ElevenLabs or Gemini)
    try {
      const ttsRes = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          ttsProvider: settings.ttsProvider,
          elevenLabsVoiceId: settings.elevenLabsVoiceId || apiKeys.elevenLabsVoiceId,
          elevenLabsModel: settings.elevenLabsModel,
          voiceName: voiceObj?.geminiVoice || 'Zephyr',
          customKeys: apiKeys,
        }),
      });
      const ttsData = await ttsRes.json().catch(() => ({ audioBase64: null }));

      if (ttsData.audioBase64 && audioManagerRef.current) {
        const played = await audioManagerRef.current.playAudioData(
          ttsData.audioBase64,
          ttsData.mimeType || (ttsData.provider === 'gemini' ? 'audio/pcm' : 'audio/mpeg'),
          ttsData.sampleRate || 24000
        );
        if (played) return;
      }
    } catch (e) {
      // Proceed to browser speech synthesis fallback
    }

    // 3. Fallback to high-quality SpeechSynthesis
    if (audioManagerRef.current) {
      await audioManagerRef.current.speakText(text, {
        pitch: voiceObj?.pitch || settings.pitch,
        rate: voiceObj?.rate || settings.speakingRate,
      });
    }
  };

  // Start / End Call
  const handleToggleCall = async () => {
    if (!callActive) {
      // Starting Call
      if (settings.soundEffects) soundFX.playConnectChime();
      setCallActive(true);
      setStatus('thinking');

      // Initialize microphone and STT
      await audioManagerRef.current?.startMicrophone();
      audioManagerRef.current?.initSpeechRecognition(settings.vadThreshold);

      // Initial introduction turn
      try {
        const initRes = await fetch('/api/voice/init');
        const initData = await initRes.json().catch(() => ({}));
        const greeting =
          initData?.greeting ||
          "Hey there! I'm a voice assistant built on this app. What's on your mind today?";

        const greetingMsg: ChatMessage = {
          id: 'turn-init',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
          latencyMs: initData.latencyMs || 76,
        };

        setMessages([greetingMsg]);
        setStatus('speaking');
        await speakResponse(greeting);

        if (!isMuted) {
          setStatus('listening');
          if (settings.handsFreeMode) {
            audioManagerRef.current?.startListening();
          }
        }
      } catch (e) {
        setStatus('listening');
        audioManagerRef.current?.startListening();
      }
    } else {
      // Ending Call
      if (settings.soundEffects) soundFX.playDisconnectChime();
      audioManagerRef.current?.interruptSpeech();
      audioManagerRef.current?.stopListening();
      audioManagerRef.current?.stopMicrophone();
      setCallActive(false);
      setStatus('idle');
      setInterimTranscript('');
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (settings.soundEffects) soundFX.playTapBlip();
    if (!isMuted) {
      audioManagerRef.current?.stopListening();
      setIsMuted(true);
      if (status === 'listening') setStatus('muted');
    } else {
      setIsMuted(false);
      if (callActive) {
        setStatus('listening');
        if (settings.handsFreeMode) {
          audioManagerRef.current?.startListening();
        }
      }
    }
  };

  // Toggle Hands-free VAD
  const handleToggleHandsFree = () => {
    if (settings.soundEffects) soundFX.playTapBlip();
    setSettings((prev) => {
      const nextVal = !prev.handsFreeMode;
      if (nextVal && callActive && !isMuted) {
        audioManagerRef.current?.startListening();
      }
      return { ...prev, handsFreeMode: nextVal };
    });
  };

  // Interrupt active speech
  const handleInterrupt = () => {
    if (settings.soundEffects) soundFX.playTapBlip();
    audioManagerRef.current?.interruptSpeech();
    if (callActive && !isMuted) {
      setStatus('listening');
      audioManagerRef.current?.startListening();
    } else {
      setStatus('idle');
    }
  };

  // Run a preset test scenario
  const handleSelectScenario = (scenario: PresetScenario) => {
    if (!callActive) {
      handleToggleCall();
    }
    // Dispatch test utterance
    setTimeout(() => {
      handleUserUtterance(scenario.userPrompt);
    }, 400);
  };

  // Reset conversation
  const handleResetCall = () => {
    if (settings.soundEffects) soundFX.playTapBlip();
    audioManagerRef.current?.interruptSpeech();
    audioManagerRef.current?.stopListening();
    setMessages([]);
    setInterimTranscript('');
    if (callActive) {
      setStatus('listening');
      audioManagerRef.current?.startListening();
    } else {
      setStatus('idle');
    }
  };

  // Replay speech
  const handleReplayAudio = (msg: ChatMessage) => {
    if (settings.soundEffects) soundFX.playTapBlip();
    setStatus('speaking');
    speakResponse(msg.content).then(() => {
      if (callActive && !isMuted) setStatus('listening');
      else setStatus('idle');
    });
  };

  // Export transcript as text file
  const handleExportTranscript = useCallback(() => {
    if (messages.length === 0) {
      showToast('No conversation to export', 'info');
      return;
    }

    const header = `Iris VoiceLab - Conversation Transcript\n${'='.repeat(48)}\nExported: ${new Date().toLocaleString()}\nTurns: ${messages.length}\n\n`;
    const body = messages
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'Iris' : 'You';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const latency = msg.latencyMs ? ` (${msg.latencyMs}ms)` : '';
        return `[${time}] ${role}${latency}:\n${msg.content}\n`;
      })
      .join('\n');

    const content = header + body;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iris-voicelab-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Transcript exported successfully', 'success');
  }, [messages, showToast]);

  // Keyboard shortcuts
  const activeModalRef = useRef<'drawer' | 'keys' | null>(null);
  useKeyboardShortcuts({
    onToggleCall: handleToggleCall,
    onToggleMute: handleToggleMute,
    onResetCall: handleResetCall,
    onInterrupt: handleInterrupt,
    onToggleHandsFree: handleToggleHandsFree,
    onCloseModal: () => {
      if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
      else if (isDrawerOpen) setIsDrawerOpen(false);
      else if (isKeysModalOpen) setIsKeysModalOpen(false);
      else if (isCameraOpen) setIsCameraOpen(false);
    },
    callActive,
  });

  // Command Palette shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Number keys 1-3 for persona switching
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (e.key === '1') {
          const persona = PERSONA_PRESETS[0];
          if (persona) {
            setSettings((prev) => ({ ...prev, customPersona: persona.systemPrompt, voiceId: persona.voiceId, pitch: persona.pitch, speakingRate: persona.rate }));
            showToast(`Switched to ${persona.icon} ${persona.name}`, 'success');
          }
        } else if (e.key === '2') {
          const persona = PERSONA_PRESETS[1];
          if (persona) {
            setSettings((prev) => ({ ...prev, customPersona: persona.systemPrompt, voiceId: persona.voiceId, pitch: persona.pitch, speakingRate: persona.rate }));
            showToast(`Switched to ${persona.icon} ${persona.name}`, 'success');
          }
        } else if (e.key === '3') {
          const persona = PERSONA_PRESETS[2];
          if (persona) {
            setSettings((prev) => ({ ...prev, customPersona: persona.systemPrompt, voiceId: persona.voiceId, pitch: persona.pitch, speakingRate: persona.rate }));
            showToast(`Switched to ${persona.icon} ${persona.name}`, 'success');
          }
        } else if (e.key === 'c' || e.key === 'C') {
          setIsCameraOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showToast]);

  const lastAgentMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content;

  return (
    <div className="min-h-screen lg:h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200 lg:overflow-hidden">
      {/* Header */}
      <Header
        metrics={metrics}
        settings={settings}
        viewMode={viewMode}
        messages={messages}
        onToggleViewMode={() => setViewMode((m) => (m === 'studio' ? 'phone' : 'studio'))}
        onOpenSettings={() => setIsDrawerOpen(true)}
        onOpenKeysModal={() => setIsKeysModalOpen(true)}
        onResetCall={handleResetCall}
        onExportTranscript={handleExportTranscript}
        onOpenCamera={() => setIsCameraOpen(true)}
        onUpdatePersona={(personaId) => {
          const persona = PERSONA_PRESETS.find((p) => p.id === personaId);
          if (persona) {
            setSettings((prev) => ({
              ...prev,
              customPersona: persona.systemPrompt,
              voiceId: persona.voiceId,
              pitch: persona.pitch,
              speakingRate: persona.rate,
              ...(persona.elevenLabsVoiceId ? { elevenLabsVoiceId: persona.elevenLabsVoiceId } : {}),
            }));
          }
        }}
      />

      {/* Main Experience Layout */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col gap-3 overflow-hidden">
        {viewMode === 'phone' ? (
          /* Phone Call Simulator Mode */
          <div className="flex-1 min-h-0 flex items-center justify-center py-2 animate-fade-in overflow-y-auto">
            <PhoneSimulator
              callActive={callActive}
              status={status}
              isMuted={isMuted}
              callDuration={callDuration}
              lastAgentMessage={lastAgentMsg}
              interimTranscript={interimTranscript}
              onToggleCall={handleToggleCall}
              onToggleMute={handleToggleMute}
              onInterrupt={handleInterrupt}
            />
          </div>
        ) : (
          /* Studio Voice Orb & Transcript Mode */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 items-stretch overflow-hidden">
            {/* Left Column: Interactive Sonic Orb & Controls */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass card-ambient relative overflow-hidden h-full min-h-0 animate-slide-up">
              {/* Decorative dot grid */}
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

              {/* Subtle ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-orange-500/5 rounded-full blur-[60px] pointer-events-none" />

              {/* Status Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                    Sonic Visualizer
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/4 border border-white/5 text-[10px] font-mono text-white/50">
                  <Zap className="w-3 h-3 text-orange-400" />
                  <span>Sub-90ms</span>
                </div>
              </div>

              {/* Centered Dynamic Sonic Orb */}
              <div className="relative z-10 my-auto py-1">
                <SonicOrb
                  status={status}
                  volume={audioVolume}
                  frequencyData={frequencyData}
                  callActive={callActive}
                  onOrbClick={handleToggleCall}
                  faceData={faceData}
                />
              </div>

              {/* Call Controls Dock */}
              <div className="relative z-10 pt-1">
                <CallControls
                  callActive={callActive}
                  status={status}
                  isMuted={isMuted}
                  settings={settings}
                  callDuration={callDuration}
                  onToggleCall={handleToggleCall}
                  onToggleMute={handleToggleMute}
                  onToggleHandsFree={handleToggleHandsFree}
                  onInterrupt={handleInterrupt}
                  onSendMessage={handleUserUtterance}
                  onOpenSettings={() => setIsDrawerOpen(true)}
                />
              </div>
            </div>

            {/* Right Column: Live Conversation Transcript & Quick Test Scenarios */}
            <div className="lg:col-span-7 flex flex-col gap-3 h-full min-h-0 overflow-hidden animate-slide-up delay-75">
              {/* Live Transcript Box */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <TranscriptView
                  messages={messages}
                  interimTranscript={interimTranscript}
                  status={status}
                  onReplayAudio={handleReplayAudio}
                  onOpenUrl={(url) => {
                    setWebViewerUrl(url);
                    setIsWebViewerOpen(true);
                  }}
                />
              </div>

              {/* Quick Preset Prompts */}
              <div className="glass card-ambient p-4 rounded-2xl flex flex-col gap-2.5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Quick Prompts
                  </span>
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="text-[10px] text-orange-400/70 hover:text-orange-300 font-medium transition-colors duration-200"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUserUtterance("Hey, how's it going?")}
                    className="btn-ripple hover-lift px-3.5 py-2.5 text-left rounded-xl bg-[#141416] hover:bg-white/5 border border-white/5 hover:border-orange-500/20 text-[11px] text-white/70 hover:text-white/90 transition-all duration-200 truncate"
                  >
                    💬 "Hey, how's it going?"
                  </button>
                  <button
                    onClick={() => handleUserUtterance("Wait, what are you exactly?")}
                    className="btn-ripple hover-lift px-3.5 py-2.5 text-left rounded-xl bg-[#141416] hover:bg-white/5 border border-white/5 hover:border-orange-500/20 text-[11px] text-white/70 hover:text-white/90 transition-all duration-200 truncate"
                  >
                    ❓ "Wait, what are you exactly?"
                  </button>
                  <button
                    onClick={() => handleUserUtterance("How much does Cartesia cost?")}
                    className="btn-ripple hover-lift px-3.5 py-2.5 text-left rounded-xl bg-[#141416] hover:bg-white/5 border border-white/5 hover:border-orange-500/20 text-[11px] text-white/70 hover:text-white/90 transition-all duration-200 truncate"
                  >
                    🛡️ "How much does Cartesia cost?"
                  </button>
                  <button
                    onClick={() =>
                      handleUserUtterance("I'm wondering if this would work for my clinic's front desk.")
                    }
                    className="btn-ripple hover-lift px-3.5 py-2.5 text-left rounded-xl bg-[#141416] hover:bg-white/5 border border-white/5 hover:border-orange-500/20 text-[11px] text-white/70 hover:text-white/90 transition-all duration-200 truncate"
                  >
                    🏥 "Clinic front desk inquiry"
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cartesia Voice Lab Settings Drawer */}
      <PlaygroundDrawer
        isOpen={isDrawerOpen}
        settings={settings}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
        onSelectScenario={handleSelectScenario}
        onOpenKeysModal={() => {
          setIsDrawerOpen(false);
          setIsKeysModalOpen(true);
        }}
      />

      {/* API Keys Configuration Settings Popup Modal */}
      <ApiKeysModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={handleSaveKeys}
      />

      {/* Camera Studio Panel */}
      <CameraPanel
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onFaceData={setFaceData}
        geminiApiKey={apiKeys.geminiApiKey || undefined}
        onAnalysis={(result) => {
          if (callActive && result.description) {
            handleUserUtterance(`[Vision] I see: ${result.description}`);
          }
        }}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onToggleCall={handleToggleCall}
        onToggleMute={handleToggleMute}
        onResetCall={handleResetCall}
        onOpenSettings={() => { setIsCommandPaletteOpen(false); setIsDrawerOpen(true); }}
        onOpenKeysModal={() => { setIsCommandPaletteOpen(false); setIsKeysModalOpen(true); }}
        onOpenCamera={() => { setIsCommandPaletteOpen(false); setIsCameraOpen(true); }}
        onUpdatePersona={(id) => {
          const persona = PERSONA_PRESETS.find((p) => p.id === id);
          if (persona) {
            setSettings((prev) => ({
              ...prev,
              customPersona: persona.systemPrompt,
              voiceId: persona.voiceId,
              pitch: persona.pitch,
              speakingRate: persona.rate,
              ...(persona.elevenLabsVoiceId ? { elevenLabsVoiceId: persona.elevenLabsVoiceId } : {}),
            }));
          }
        }}
        onExportTranscript={handleExportTranscript}
        callActive={callActive}
        isMuted={isMuted}
      />

      {/* Web Viewer for opening links */}
      <WebViewer
        isOpen={isWebViewerOpen}
        url={webViewerUrl}
        onClose={() => setIsWebViewerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
