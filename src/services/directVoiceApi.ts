// Direct Client-Side API Integration for Groq, ElevenLabs, and Gemini
// Used as seamless fallback if backend serverless endpoints encounter routing or hosting issues.

import { ApiKeysConfig } from '../types/apiKeys';

const SYSTEM_PROMPT = `You are Iris, a real-time voice assistant for Iris VoiceLab developed by Dr Fendi. 
Keep replies concise (1-2 conversational sentences). Speak naturally with human warmth. 
Avoid bullet points or markdown lists. If asked who developed you, proudly state Dr Fendi.`;

export async function testGroqDirect(apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startTime = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const count = data?.data?.length || 0;
      return {
        success: true,
        message: `Groq connected successfully (${latencyMs}ms • ${count} models available)`,
        latencyMs,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err?.error?.message || `Groq API responded with status ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to reach Groq API endpoint directly.',
    };
  }
}

export async function testElevenLabsDirect(apiKey: string, voiceId?: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startTime = Date.now();
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey.trim(),
      },
    });

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const tier = data?.subscription?.tier || 'active';
      const charCount = data?.subscription?.character_count ?? '';
      const charLimit = data?.subscription?.character_limit ?? '';
      const usageInfo = charLimit ? ` • ${charCount}/${charLimit} chars` : '';

      return {
        success: true,
        message: `ElevenLabs connected (${tier} tier${usageInfo}) • ${latencyMs}ms`,
        latencyMs,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err?.detail?.message || err?.message || `ElevenLabs verification failed (status ${res.status})`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to reach ElevenLabs API directly.',
    };
  }
}

export async function testGeminiDirect(apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startTime = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return {
        success: true,
        message: `Gemini API connected successfully (${latencyMs}ms)`,
        latencyMs,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err?.error?.message || `Gemini verification failed (status ${res.status})`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to reach Gemini API directly.',
    };
  }
}

export async function chatGroqDirect(
  messages: { role: string; content: string }[],
  apiKey: string,
  modelName = 'llama-3.3-70b-versatile'
): Promise<{ text: string; latencyMs: number; model: string }> {
  const startTime = Date.now();

  const candidateModels = Array.from(
    new Set([
      modelName,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
    ])
  );

  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'agent' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: groqMessages,
          temperature: 0.75,
          max_tokens: 250,
        }),
      });

      if (!res.ok) {
        lastError = new Error(`Groq status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return {
          text: reply,
          latencyMs: Date.now() - startTime,
          model: `Groq/${currentModel} (Direct)`,
        };
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Groq direct chat returned empty response');
}

export async function ttsElevenLabsDirect(
  text: string,
  apiKey: string,
  voiceId = '21m00Tcm4TlvDq8ikWAM',
  modelId = 'eleven_turbo_v2_5'
): Promise<{ audioBase64: string; mimeType: string }> {
  const targetVoice = voiceId.trim() || '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey.trim(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId || 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS direct error (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  // Convert ArrayBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    audioBase64: base64,
    mimeType: 'audio/mpeg',
  };
}
