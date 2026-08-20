import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AgentStatus } from '../types/voice';

interface SonicOrbProps {
  status: AgentStatus;
  volume: number;
  frequencyData: Uint8Array;
  callActive: boolean;
  onOrbClick?: () => void;
  faceData?: { brightness: number; motion: number; x: number; y: number } | null;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  glow: string;
  ambient: string;
  ring: string;
  tag: string;
  accentClass: string;
  barColors: string[];
}

export const SonicOrb: React.FC<SonicOrbProps> = ({
  status,
  volume,
  frequencyData,
  callActive,
  onOrbClick,
  faceData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getThemeColors = (): ThemeColors => {
    switch (status) {
      case 'listening':
        return {
          primary: 'rgba(34, 197, 94, 0.85)',
          secondary: 'rgba(34, 197, 94, 0.25)',
          glow: 'rgba(34, 197, 94, 0.3)',
          ambient: 'rgba(34, 197, 94, 0.12)',
          ring: 'rgba(34, 197, 94, 0.15)',
          tag: 'Listening',
          accentClass: 'bg-green-500',
          barColors: ['from-green-400 to-green-500', 'from-green-500 to-emerald-500', 'from-green-400 to-green-600', 'from-green-500 to-emerald-500', 'from-green-400 to-green-500'],
        };
      case 'thinking':
        return {
          primary: 'rgba(249, 115, 22, 0.85)',
          secondary: 'rgba(234, 88, 12, 0.3)',
          glow: 'rgba(249, 115, 22, 0.35)',
          ambient: 'rgba(249, 115, 22, 0.1)',
          ring: 'rgba(249, 115, 22, 0.12)',
          tag: 'Thinking',
          accentClass: 'bg-orange-500',
          barColors: ['from-amber-400 to-orange-500', 'from-orange-500 to-orange-600', 'from-amber-400 to-orange-500', 'from-orange-500 to-orange-600', 'from-amber-400 to-orange-500'],
        };
      case 'speaking':
        return {
          primary: 'rgba(249, 115, 22, 0.95)',
          secondary: 'rgba(220, 38, 38, 0.4)',
          glow: 'rgba(249, 115, 22, 0.45)',
          ambient: 'rgba(249, 115, 22, 0.15)',
          ring: 'rgba(220, 38, 38, 0.15)',
          tag: 'Speaking',
          accentClass: 'bg-orange-500',
          barColors: ['from-orange-400 to-red-500', 'from-orange-500 to-red-500', 'from-orange-400 to-red-600', 'from-orange-500 to-red-500', 'from-orange-400 to-red-500'],
        };
      case 'muted':
        return {
          primary: 'rgba(239, 68, 68, 0.7)',
          secondary: 'rgba(220, 38, 38, 0.2)',
          glow: 'rgba(239, 68, 68, 0.2)',
          ambient: 'rgba(239, 68, 68, 0.06)',
          ring: 'rgba(239, 68, 68, 0.1)',
          tag: 'Muted',
          accentClass: 'bg-red-500',
          barColors: ['from-red-400 to-red-500', 'from-red-500 to-red-600', 'from-red-400 to-red-500', 'from-red-500 to-red-600', 'from-red-400 to-red-500'],
        };
      default:
        return {
          primary: 'rgba(255, 255, 255, 0.2)',
          secondary: 'rgba(255, 255, 255, 0.04)',
          glow: 'rgba(249, 115, 22, 0.08)',
          ambient: 'rgba(249, 115, 22, 0.04)',
          ring: 'rgba(255, 255, 255, 0.06)',
          tag: callActive ? 'Ready' : 'Standby',
          accentClass: 'bg-white/30',
          barColors: ['from-white/30 to-white/20', 'from-white/40 to-white/25', 'from-white/35 to-white/20', 'from-white/40 to-white/25', 'from-white/30 to-white/20'],
        };
    }
  };

  const theme = getThemeColors();

  // Main wave canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = canvas.width < 220 ? 54 : 64;

      phase += status === 'thinking' ? 0.06 : status === 'speaking' ? 0.04 : 0.02;

      // Outer glow ring
      if (callActive) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 24 + Math.sin(phase * 0.5) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = theme.ring;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Orbital rings
      if (callActive) {
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          ctx.arc(
            centerX,
            centerY,
            baseRadius + r * 12 + Math.sin(phase + r * 0.8) * 2 * (volume + 0.2),
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = theme.secondary;
          ctx.lineWidth = r === 1 ? 1.2 : 0.6;
          ctx.globalAlpha = 1 - r * 0.25;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Dynamic wavy core
      const points = 40;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const freqIndex = Math.min(i * 2, frequencyData.length - 1);
        const freqVal = frequencyData[freqIndex] ? frequencyData[freqIndex] / 255 : 0;

        let dynamicOffset = 0;
        if (status === 'speaking' || status === 'listening') {
          dynamicOffset = Math.sin(angle * 5 + phase * 2) * (8 * volume + freqVal * 14);
          dynamicOffset += Math.sin(angle * 3 - phase) * 3 * volume;
        } else if (status === 'thinking') {
          dynamicOffset = Math.sin(angle * 4 + phase * 3) * 5 + Math.cos(angle * 6 + phase * 2) * 2;
        } else {
          dynamicOffset = Math.sin(angle * 3 + phase) * 1.5;
        }

        if (faceData) {
          const faceBoost = faceData.motion * 8 + faceData.brightness * 3;
          dynamicOffset += Math.sin(angle * 6 + phase * 2) * faceBoost;
        }

        const radius = baseRadius + dynamicOffset;
        const offsetX = faceData ? (faceData.x - 0.5) * 10 : 0;
        const offsetY = faceData ? (faceData.y - 0.5) * 10 : 0;
        const x = centerX + Math.cos(angle) * radius + offsetX;
        const y = centerY + Math.sin(angle) * radius + offsetY;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Multi-layer radial gradient fill
      const grad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, baseRadius + 20);
      grad.addColorStop(0, theme.primary);
      grad.addColorStop(0.5, theme.secondary);
      grad.addColorStop(0.85, 'rgba(10, 10, 11, 0.3)');
      grad.addColorStop(1, 'rgba(10, 10, 11, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Outer glow stroke
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = status === 'speaking' ? 18 : 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [status, volume, frequencyData, callActive, theme, faceData]);

  // Particle ring effect
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: { angle: number; speed: number; size: number; opacity: number }[] = [];
    const count = callActive ? 24 : 12;

    for (let i = 0; i < count; i++) {
      particles.push({
        angle: (i / count) * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.003,
        size: 0.8 + Math.random() * 1.2,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = canvas.width < 220 ? 82 : 96;

      particles.forEach((p) => {
        p.angle += p.speed * (status === 'speaking' ? 2.5 : 1);
        const wobble = Math.sin(p.angle * 3) * 3;
        const r = radius + wobble + (callActive ? volume * 8 : 0);
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = p.opacity * (callActive ? 1.2 : 0.6);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [status, volume, callActive, theme]);

  // Bar heights for the inner equalizer
  const barHeights = [
    status === 'speaking' ? Math.max(8, 12 + volume * 18 + (frequencyData[2] || 0) / 14) : status === 'listening' ? Math.max(6, 9 + volume * 14) : 8,
    status === 'speaking' ? Math.max(14, 20 + volume * 24 + (frequencyData[8] || 0) / 10) : status === 'listening' ? Math.max(8, 14 + volume * 18) : 12,
    status === 'speaking' ? Math.max(20, 30 + volume * 28 + (frequencyData[14] || 0) / 8) : status === 'listening' ? Math.max(12, 20 + volume * 22) : 18,
    status === 'speaking' ? Math.max(12, 18 + volume * 22 + (frequencyData[20] || 0) / 12) : status === 'listening' ? Math.max(8, 12 + volume * 16) : 10,
    status === 'speaking' ? Math.max(16, 26 + volume * 24 + (frequencyData[26] || 0) / 10) : status === 'listening' ? Math.max(7, 16 + volume * 18) : 14,
  ];

  const isIdle = status === 'idle' && !callActive;

  return (
    <div
      id="sonic-orb-container"
      className="relative flex flex-col items-center justify-center py-2 select-none"
    >
      {/* Multi-layer ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Large diffuse glow */}
        <div
          className="w-[300px] h-[300px] rounded-full blur-[100px] transition-colors duration-700"
          style={{ backgroundColor: theme.ambient }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Tight inner glow */}
        <div
          className="w-[180px] h-[180px] rounded-full blur-[50px] transition-colors duration-500"
          style={{ backgroundColor: theme.glow, opacity: isIdle ? 0.3 : 0.6 }}
        />
      </div>

      {/* Clickable orb wrapper */}
      <div
        onClick={onOrbClick}
        className="relative flex items-center justify-center cursor-pointer group"
      >
        {/* Outer ring container */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-full flex items-center justify-center">
          {/* Particle ring canvas */}
          <canvas
            ref={particleCanvasRef}
            width={230}
            height={230}
            className="absolute inset-0 w-full h-full pointer-events-none rounded-full"
          />

          {/* Outer decorative ring */}
          <div
            className="absolute inset-0 rounded-full border transition-colors duration-500"
            style={{ borderColor: theme.ring }}
          />

          {/* Wave canvas */}
          <canvas
            ref={canvasRef}
            width={230}
            height={230}
            className="absolute inset-0 w-full h-full pointer-events-none rounded-full"
            style={{ opacity: isIdle ? 0.3 : 0.7 }}
          />

          {/* Inner dark core */}
          <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-[#0D0D0E] border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
            {/* Subtle inner gradient */}
            <div
              className="absolute inset-0 rounded-full transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at center, ${theme.ambient} 0%, transparent 70%)`,
                opacity: isIdle ? 0.2 : 0.5,
              }}
            />

            {/* 5-Bar Sonic Equalizer */}
            <div className="relative z-10 flex items-end gap-1.5 h-12">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: `${h}px` }}
                  transition={{ duration: 0.06, ease: 'easeOut' }}
                  className={`w-1.5 rounded-full bg-gradient-to-t ${theme.barColors[i]} shadow-sm`}
                  style={{
                    boxShadow: status !== 'idle' ? `0 0 6px ${theme.glow}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Floating status pill */}
          <div
            className="absolute -bottom-3 px-4 py-1.5 rounded-full shadow-xl z-20 flex items-center gap-2 border transition-all duration-300"
            style={{
              backgroundColor: 'rgba(15, 15, 17, 0.9)',
              borderColor: theme.ring,
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${theme.accentClass} ${
                status === 'speaking' || status === 'listening' ? 'animate-pulse' : ''
              }`}
              style={{
                boxShadow: status !== 'idle' ? `0 0 8px ${theme.glow}` : 'none',
              }}
            />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] font-bold text-white/70 whitespace-nowrap">
              {theme.tag}
            </span>
            {callActive && (
              <span className="text-[9px] font-mono text-white/30 ml-1">
                {volume > 0.05 ? `${Math.round(volume * 100)}%` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom frequency spectrum */}
      {callActive && (
        <div
          id="audio-frequency-spectrum"
          className="flex items-end justify-center gap-[3px] h-5 mt-6 px-3 py-1 rounded-full border transition-colors duration-300"
          style={{
            backgroundColor: 'rgba(15, 15, 17, 0.6)',
            borderColor: theme.ring,
          }}
        >
          {Array.from({ length: 16 }).map((_, idx) => {
            const rawVal = frequencyData[idx * 2] || 0;
            const barHeight = Math.max(2, (rawVal / 255) * 14 * (volume > 0.05 ? 1.3 : 0.25));
            return (
              <motion.div
                key={idx}
                animate={{ height: `${barHeight}px` }}
                transition={{ duration: 0.04 }}
                className="w-[3px] rounded-full"
                style={{
                  background: `linear-gradient(to top, ${theme.secondary}, ${theme.primary})`,
                  opacity: 0.6 + (rawVal / 255) * 0.4,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
