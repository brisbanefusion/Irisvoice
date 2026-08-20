export interface ApiKeysConfig {
  groqApiKey: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  geminiApiKey: string;
}

export interface ApiKeyValidationResult {
  groq?: { valid: boolean; message: string; latencyMs?: number };
  elevenlabs?: { valid: boolean; message: string; characterCount?: number; tier?: string };
  gemini?: { valid: boolean; message: string };
}
