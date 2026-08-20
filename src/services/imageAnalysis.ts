// Gemini Vision API — Client-side image analysis for camera frames
// Uses @google/genai for multimodal vision requests

import { GoogleGenAI } from '@google/genai';

export interface ImageAnalysisResult {
  description: string;
  objects: string[];
  scene: string;
  mood: string;
  latencyMs: number;
  timestamp: Date;
  raw: string;
}

let aiClient: GoogleGenAI | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Analyze a base64-encoded image using Gemini Vision API.
 * Returns a structured description of what's in front of the camera.
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  geminiApiKey: string,
  customPrompt?: string
): Promise<ImageAnalysisResult> {
  const startTime = Date.now();
  const ai = getClient(geminiApiKey);

  const prompt = customPrompt || `You are a real-time vision assistant. Analyze this camera frame and respond in JSON format with these fields:
- "description": A brief 1-2 sentence natural description of what you see (in the user's language)
- "objects": An array of the main 3-5 objects/people visible
- "scene": The type of scene (e.g. "indoor office", "outdoor park", "meeting room")
- "mood": The overall mood/atmosphere (e.g. "bright and lively", "calm and focused")
- "raw": A slightly more detailed 2-3 sentence observation

Keep descriptions concise but vivid. Respond in the same language as the scene appears to be in.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.4,
      maxOutputTokens: 300,
    },
  });

  const text = response.text || '';
  const latencyMs = Date.now() - startTime;

  // Try to parse JSON from the response
  let parsed: any = {};
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If JSON parsing fails, use raw text
    parsed = {
      description: text,
      objects: [],
      scene: 'unknown',
      mood: 'neutral',
      raw: text,
    };
  }

  return {
    description: parsed.description || text.slice(0, 200),
    objects: Array.isArray(parsed.objects) ? parsed.objects : [],
    scene: parsed.scene || 'unknown',
    mood: parsed.mood || 'neutral',
    latencyMs,
    timestamp: new Date(),
    raw: parsed.raw || text,
  };
}

/**
 * Capture a frame from a canvas element as base64.
 */
export function captureFrame(canvas: HTMLCanvasElement): { base64: string; mimeType: string } {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // JPEG for smaller payload
  const base64 = dataUrl.split(',')[1];
  return { base64, mimeType: 'image/jpeg' };
}

/**
 * Analyze a canvas frame directly — convenience wrapper.
 */
export async function analyzeCanvasFrame(
  canvas: HTMLCanvasElement,
  geminiApiKey: string,
  customPrompt?: string
): Promise<ImageAnalysisResult> {
  const { base64, mimeType } = captureFrame(canvas);
  return analyzeImage(base64, mimeType, geminiApiKey, customPrompt);
}
