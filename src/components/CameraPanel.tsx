import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Video,
  VideoOff,
  Image,
  X,
  Sparkles,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { analyzeCanvasFrame, ImageAnalysisResult } from '../services/imageAnalysis';

interface CameraPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFaceData?: (data: { brightness: number; motion: number; x: number; y: number }) => void;
  geminiApiKey?: string;
  onAnalysis?: (result: ImageAnalysisResult) => void;
}

type ARFilter = 'none' | 'neon' | 'glitch' | 'vignette' | 'thermal';

const AR_FILTERS: { id: ARFilter; label: string; icon: string }[] = [
  { id: 'none', label: 'None', icon: '—' },
  { id: 'neon', label: 'Neon Glow', icon: '💫' },
  { id: 'glitch', label: 'Glitch', icon: '⚡' },
  { id: 'vignette', label: 'Vignette', icon: '🌑' },
  { id: 'thermal', label: 'Thermal', icon: '🔥' },
];

const ANALYSIS_PROMPTS: { id: string; label: string; prompt: string }[] = [
  {
    id: 'general',
    label: 'General',
    prompt: 'Describe what you see in this camera frame. Identify objects, people, scene, and mood. Be concise.',
  },
  {
    id: 'objects',
    label: 'Objects',
    prompt: 'List and describe the main objects visible in this camera frame. Be specific about what each object is.',
  },
  {
    id: 'text',
    label: 'Read Text',
    prompt: 'Read and transcribe any visible text in this camera frame. Include labels, signs, documents, screens, etc.',
  },
  {
    id: 'person',
    label: 'Person',
    prompt: 'Describe the person(s) visible: appearance, expression, posture, clothing. Be respectful and factual.',
  },
  {
    id: 'environment',
    label: 'Environment',
    prompt: 'Describe the environment/setting: indoor/outdoor, lighting, decor, location type, time of day impression.',
  },
];

export const CameraPanel: React.FC<CameraPanelProps> = ({
  isOpen,
  onClose,
  onFaceData,
  geminiApiKey,
  onAnalysis,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ARFilter>('none');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState(3); // seconds (2-4)
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<ImageAnalysisResult[]>([]);
  const [activeAnalysisPrompt, setActiveAnalysisPrompt] = useState('general');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setError(err?.message || 'Camera access denied');
      setCameraActive(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
  }, []);

  // Run a single analysis
  const runAnalysis = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !geminiApiKey) return;

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const prompt = ANALYSIS_PROMPTS.find((p) => p.id === activeAnalysisPrompt)?.prompt;
      const result = await analyzeCanvasFrame(canvas, geminiApiKey, prompt);
      setAnalysisResult(result);
      setAnalysisHistory((prev) => [result, ...prev].slice(0, 20));
      onAnalysis?.(result);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [geminiApiKey, activeAnalysisPrompt, onAnalysis]);

  // Auto-analysis interval
  useEffect(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    if (autoAnalyze && cameraActive && geminiApiKey) {
      // Run immediately, then on interval
      runAnalysis();
      analysisTimerRef.current = setInterval(runAnalysis, analysisInterval * 1000);
    }

    return () => {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
  }, [autoAnalyze, cameraActive, analysisInterval, geminiApiKey, runAnalysis]);

  // AR filter rendering loop
  useEffect(() => {
    if (!isOpen || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const renderFrame = () => {
      if (!running || !video.videoWidth) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Mirror the video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Apply AR filter
      if (activeFilter !== 'none') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (activeFilter) {
          case 'neon': {
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              if (avg > 100) {
                data[i] = Math.min(255, data[i] * 0.3 + 80);
                data[i + 1] = Math.min(255, data[i + 1] * 0.1 + 200);
                data[i + 2] = Math.min(255, data[i + 2] * 0.3 + 255);
              }
            }
            ctx.putImageData(imageData, 0, 0);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00c8ff';
            ctx.shadowBlur = 20;
            ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
            ctx.shadowBlur = 0;
            break;
          }
          case 'glitch': {
            const sliceHeight = 8;
            for (let y = 0; y < canvas.height; y += sliceHeight) {
              if (Math.random() > 0.92) {
                const shift = Math.floor(Math.random() * 40 - 20);
                const slice = ctx.getImageData(0, y, canvas.width, sliceHeight);
                ctx.putImageData(slice, shift, y);
              }
            }
            const glitchData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const gd = glitchData.data;
            if (Math.random() > 0.85) {
              const offset = Math.floor(Math.random() * 10);
              for (let i = offset * 4; i < gd.length; i += 4) {
                gd[i] = gd[i + offset * 4] || gd[i];
              }
              ctx.putImageData(glitchData, 0, 0);
            }
            break;
          }
          case 'vignette': {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = Math.max(cx, cy);
            const gradient = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0.3)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
          }
          case 'thermal': {
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              if (avg < 64) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = avg * 4;
              } else if (avg < 128) {
                data[i] = 0;
                data[i + 1] = (avg - 64) * 4;
                data[i + 2] = 255 - (avg - 64) * 4;
              } else if (avg < 192) {
                data[i] = (avg - 128) * 4;
                data[i + 1] = 255;
                data[i + 2] = 0;
              } else {
                data[i] = 255;
                data[i + 1] = 255 - (avg - 192) * 4;
                data[i + 2] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            break;
          }
        }
      }

      // Face tracking
      const trackData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const td = trackData.data;
      let totalBrightness = 0;
      let totalX = 0;
      let totalY = 0;
      let pixelCount = 0;
      let motionSum = 0;

      const step = 8;
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (td[idx] + td[idx + 1] + td[idx + 2]) / 3;
          totalBrightness += brightness;
          totalX += x * brightness;
          totalY += y * brightness;
          pixelCount++;

          if (prevFrameRef.current) {
            const prevIdx = (y * canvas.width + x) * 4;
            const prev = prevFrameRef.current;
            if (prevIdx < prev.data.length) {
              const diff = Math.abs(brightness - (prev.data[prevIdx] + prev.data[prevIdx + 1] + prev.data[prevIdx + 2]) / 3);
              motionSum += diff;
            }
          }
        }
      }

      prevFrameRef.current = new ImageData(
        new Uint8ClampedArray(td),
        canvas.width,
        canvas.height
      );

      if (pixelCount > 0 && onFaceData) {
        const avgBrightness = totalBrightness / pixelCount / 255;
        const avgMotion = Math.min(1, motionSum / pixelCount / 50);
        const centerX = totalX / totalBrightness / canvas.width || 0.5;
        const centerY = totalY / totalBrightness / canvas.height || 0.5;
        onFaceData({
          brightness: avgBrightness,
          motion: avgMotion,
          x: 1 - centerX,
          y: centerY,
        });
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, cameraActive, activeFilter, onFaceData]);

  // Auto-start camera when opened
  useEffect(() => {
    if (isOpen && !cameraActive) {
      startCamera();
    }
    return () => {
      if (!isOpen) stopCamera();
    };
  }, [isOpen]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedPhotos((prev) => [dataUrl, ...prev].slice(0, 6));
  }, []);

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iris-camera-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, [isRecording]);

  // Download a captured photo
  const downloadPhoto = (dataUrl: string, index: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `iris-photo-${Date.now()}-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const hasGeminiKey = Boolean(geminiApiKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0E0E10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Camera Studio</h2>
              <p className="text-[11px] text-white/40">Vision analysis, AR overlays & capture</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative bg-black aspect-video max-h-[40vh]">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="w-full h-full object-contain" />

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC {formatTime(recordingTime)}
            </div>
          )}

          {/* Analyzing indicator */}
          {analyzing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/90 text-white text-xs font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          )}

          {/* Active filter badge */}
          {activeFilter !== 'none' && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-medium">
              {AR_FILTERS.find((f) => f.id === activeFilter)?.icon}{' '}
              {AR_FILTERS.find((f) => f.id === activeFilter)?.label}
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center space-y-2">
                <CameraOff className="w-10 h-10 text-white/30 mx-auto" />
                <p className="text-sm text-white/60">{error}</p>
                <button onClick={startCamera} className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-lg">
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* No camera placeholder */}
          {!cameraActive && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Camera className="w-12 h-12 text-white/20 mx-auto" />
                <p className="text-sm text-white/40">Camera is off</p>
                <button onClick={startCamera} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-xl">
                  Turn On Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Controls */}
        <div className="px-4 py-3 border-t border-white/5 bg-[#111113]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                Vision Analysis
              </span>
              {!hasGeminiKey && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                  No Gemini Key
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Interval selector */}
              {autoAnalyze && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/40">Every</span>
                  <input
                    type="range"
                    min={2}
                    max={4}
                    step={0.5}
                    value={analysisInterval}
                    onChange={(e) => setAnalysisInterval(Number(e.target.value))}
                    className="w-16 h-1 accent-orange-500"
                  />
                  <span className="text-[10px] font-mono text-orange-400 w-6">{analysisInterval}s</span>
                </div>
              )}
              {/* Toggle auto-analyze */}
              <button
                onClick={() => setAutoAnalyze(!autoAnalyze)}
                disabled={!hasGeminiKey || !cameraActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 ${
                  autoAnalyze
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                    : 'bg-[#1A1A1C] border border-white/5 text-white/50 hover:text-white/80'
                }`}
              >
                {autoAnalyze ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                {autoAnalyze ? 'Auto ON' : 'Auto OFF'}
              </button>
              {/* Manual analyze */}
              <button
                onClick={runAnalysis}
                disabled={!hasGeminiKey || !cameraActive || analyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-orange-500 hover:bg-orange-600 text-white transition-all disabled:opacity-30"
              >
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Analyze
              </button>
            </div>
          </div>

          {/* Analysis prompt type selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {ANALYSIS_PROMPTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveAnalysisPrompt(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                  activeAnalysisPrompt === p.id
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                    : 'bg-[#1A1A1C] border border-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Latest Analysis Result */}
        {(analysisResult || analysisError) && (
          <div className="px-4 py-3 border-t border-white/5 bg-[#0E0E10]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-white/60">Latest Analysis</span>
              {analysisResult && (
                <span className="text-[9px] font-mono text-white/30">
                  {analysisResult.latencyMs}ms • {analysisResult.timestamp.toLocaleTimeString()}
                </span>
              )}
            </div>
            {analysisError ? (
              <p className="text-xs text-red-400">{analysisError}</p>
            ) : analysisResult ? (
              <div className="space-y-2">
                <p className="text-xs text-white/80 leading-relaxed">{analysisResult.description}</p>
                {analysisResult.objects.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.objects.map((obj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/50">
                        {obj}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 text-[10px] text-white/30">
                  <span>📍 {analysisResult.scene}</span>
                  <span>🎭 {analysisResult.mood}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* AR Filter Row */}
        <div className="px-4 py-3 border-t border-white/5 bg-[#121214]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">AR Filters</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {AR_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter.id
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                    : 'bg-[#1A1A1C] border border-white/5 text-white/50 hover:text-white/80 hover:border-white/10'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-white/5 bg-[#121214] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={capturePhoto} disabled={!cameraActive}
              className="p-2.5 rounded-xl bg-[#1A1A1C] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
              title="Capture photo">
              <Image className="w-4 h-4" />
            </button>
            <button onClick={toggleRecording} disabled={!cameraActive}
              className={`p-2.5 rounded-xl border transition-all disabled:opacity-30 ${
                isRecording ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'bg-[#1A1A1C] border-white/10 text-white/70 hover:text-white hover:bg-white/5'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}>
              {isRecording ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
            <button onClick={cameraActive ? stopCamera : startCamera}
              className={`p-2.5 rounded-xl border transition-all ${
                cameraActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[#1A1A1C] border-white/10 text-white/70 hover:text-white hover:bg-white/5'
              }`}
              title={cameraActive ? 'Turn off camera' : 'Turn on camera'}>
              {cameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            Close
          </button>
        </div>

        {/* Photo Gallery */}
        {capturedPhotos.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 bg-[#0E0E10]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-white/60">Captured ({capturedPhotos.length})</span>
              <button onClick={() => setCapturedPhotos([])} className="text-[10px] text-white/30 hover:text-red-400 transition-colors">
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {capturedPhotos.map((photo, i) => (
                <div key={i} className="relative group flex-shrink-0">
                  <img src={photo} alt={`Capture ${i + 1}`}
                    className="w-16 h-12 object-cover rounded-lg border border-white/10 cursor-pointer"
                    onClick={() => downloadPhoto(photo, i)} />
                  <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Image className="w-4 h-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis History */}
        {analysisHistory.length > 1 && (
          <div className="px-5 py-3 border-t border-white/5 bg-[#0A0A0C] max-h-32 overflow-y-auto">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">History</span>
            <div className="mt-1.5 space-y-1.5">
              {analysisHistory.slice(1, 8).map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-white/20 font-mono flex-shrink-0">{h.timestamp.toLocaleTimeString()}</span>
                  <span className="text-white/40 line-clamp-1">{h.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
