// Handles Microphone input analysis, Web Speech STT, and Speech Output synthesis/playback

export class VoiceAudioManager {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private recognition: any = null;
  private silenceTimer: any = null;
  private isListeningActive = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  public onVolumeUpdate?: (volume: number, freqData: Uint8Array) => void;
  public onTranscriptChange?: (text: string, isFinal: boolean) => void;
  public onSpeechEnd?: (finalText: string) => void;
  public onSpeechStart?: () => void;
  public onRecognitionError?: (err: string) => void;

  private animationFrameId: number | null = null;

  async initAudioContext(): Promise<boolean> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return true;
    } catch (e) {
      console.warn('AudioContext init error:', e);
      return false;
    }
  }

  async startMicrophone(): Promise<boolean> {
    try {
      await this.initAudioContext();
      if (!this.audioCtx) return false;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);

      this.startAudioLoop();
      return true;
    } catch (err: any) {
      console.warn('Microphone permission / access error:', err);
      return false;
    }
  }

  stopMicrophone() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  private startAudioLoop() {
    if (!this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedVol = Math.min(1, avg / 85); // 0 to 1

      if (this.onVolumeUpdate) {
        this.onVolumeUpdate(normalizedVol, dataArray);
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  initSpeechRecognition(vadThresholdMs = 1400) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Browser does not natively support SpeechRecognition API.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      let currentInterim = '';

      this.recognition.onstart = () => {
        this.isListeningActive = true;
      };

      this.recognition.onspeechstart = () => {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.onSpeechStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const activeText = (finalTranscript || interimTranscript).trim();
        currentInterim = activeText;

        if (activeText && this.onTranscriptChange) {
          this.onTranscriptChange(activeText, Boolean(finalTranscript));
        }

        // VAD Silence timer: Trigger completion when user pauses after saying something
        if (activeText) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (currentInterim.trim().length > 0) {
              const textToSend = currentInterim.trim();
              currentInterim = '';
              this.onSpeechEnd?.(textToSend);
            }
          }, vadThresholdMs);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal silence, keep alive
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        console.warn('Speech recognition error:', event.error);
        this.onRecognitionError?.(event.error);
      };

      this.recognition.onend = () => {
        if (this.isListeningActive) {
          // Restart if still in listening mode
          try {
            this.recognition.start();
          } catch (e) {
            // Already started or suspended
          }
        }
      };

      return true;
    } catch (e) {
      console.warn('Failed to initialize speech recognition:', e);
      return false;
    }
  }

  startListening() {
    this.isListeningActive = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition already active
      }
    }
  }

  stopListening() {
    this.isListeningActive = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  // Interruption: immediately silence any active voice output
  interruptSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {
        // ignore
      }
      this.currentAudioSource = null;
    }
    this.currentUtterance = null;
  }

  // Play audio from base64 (supports MP3 from ElevenLabs, WAV, and PCM)
  async playAudioData(base64Data: string, mimeType = 'audio/mpeg', sampleRate = 24000): Promise<boolean> {
    await this.initAudioContext();
    if (!this.audioCtx) return false;

    this.interruptSpeech();

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      let audioBuffer: AudioBuffer;

      if (mimeType.includes('pcm')) {
        // Convert 16-bit PCM little-endian to Float32
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }
        audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32Array);
      } else {
        // Standard compressed audio format (MP3 / WAV from ElevenLabs)
        audioBuffer = await this.audioCtx.decodeAudioData(bytes.buffer.slice(0));
      }

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to analyser so the visualizer pulses with the agent's voice
      if (this.analyser) {
        source.connect(this.analyser);
      }
      source.connect(this.audioCtx.destination);

      this.currentAudioSource = source;

      return new Promise((resolve) => {
        source.onended = () => {
          this.currentAudioSource = null;
          resolve(true);
        };
        source.start();
      });
    } catch (e) {
      console.warn('Error playing audio data, falling back:', e);
      return false;
    }
  }

  // Play audio from base64 PCM (from Gemini TTS endpoint)
  async playRawPCM(base64Data: string, sampleRate = 24000): Promise<void> {
    await this.playAudioData(base64Data, 'audio/pcm', sampleRate);
  }

  // Browser SpeechSynthesis fallback with rich persona tuning
  speakText(
    text: string,
    options: {
      pitch?: number;
      rate?: number;
      voiceName?: string;
      onBoundary?: (charIndex: number) => void;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      this.interruptSpeech();

      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis is not supported in this browser.');
        options.onEnd?.();
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.pitch = options.pitch ?? 1.0;
      utterance.rate = options.rate ?? 1.02;

      // Select natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Karen') ||
            v.name.includes('Alex')) &&
          v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onboundary = (e) => {
        options.onBoundary?.(e.charIndex);
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (err) => {
        console.warn('SpeechSynthesis error:', err);
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  destroy() {
    this.stopListening();
    this.stopMicrophone();
    this.interruptSpeech();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}
