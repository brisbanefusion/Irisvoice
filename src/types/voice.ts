export type AgentStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'muted';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  latencyMs?: number;
  durationSec?: number;
  audioGenerated?: boolean;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'neutral' | 'female' | 'male';
  accent: string;
  description: string;
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  pitch: number;
  rate: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface VoiceSettings {
  voiceId: string;
  // LLM & Reasoning Engine
  llmProvider: 'groq' | 'gemini' | 'auto';
  groqModel: string;
  // TTS Engine & Voice Configuration
  ttsProvider: 'elevenlabs' | 'gemini' | 'browser';
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
  // Custom Persona
  customPersona: string;
  // Interaction & Audio Controls
  handsFreeMode: boolean; // Continuous Voice Activity Detection
  vadThreshold: number; // Silence detection delay (ms)
  speakingRate: number;
  pitch: number;
  fillerLevel: 'low' | 'balanced' | 'high';
  hapticFeedback: boolean;
  noiseSuppression: boolean;
  playbackVolume: number;
  soundEffects: boolean;
}

export interface LatencyMetrics {
  currentLatencyMs: number;
  avgLatencyMs: number;
  ttfbMs: number; // Time to first byte / audio
  totalTurns: number;
  lastTurnTime: Date | null;
}

export interface PresetScenario {
  id: string;
  category: string;
  label: string;
  userPrompt: string;
  expectedBehavior: string;
  iconName: string;
}
