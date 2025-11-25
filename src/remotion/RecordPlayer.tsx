import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';

interface RecordPlayerProps {
  colorTheme: {
    bg: string;
    text: string;
    accent: string;
  };
}

// Extract color from Tailwind classes
const getColorFromTheme = (themeClass: string): string => {
  const colorMap: Record<string, string> = {
    'text-amber-500': '#f59e0b',
    'text-amber-100': '#fef3c7',
    'text-cyan-400': '#22d3ee',
    'text-cyan-100': '#cffafe',
    'text-white': '#ffffff',
    'text-gray-200': '#e5e7eb',
    'text-slate-900': '#0f172a',
    'text-slate-600': '#475569',
  };
  return colorMap[themeClass] || '#ffffff';
};

export const RecordPlayer: React.FC<RecordPlayerProps> = ({ colorTheme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const accentColor = getColorFromTheme(colorTheme.accent);
  const textColor = getColorFromTheme(colorTheme.text);
  const isLightBg = colorTheme.bg.includes('white');
  
  // Record rotation - continuous rotation
  const rotation = (frame * 0.5) % 360; // Slow rotation, 1 rotation per 720 frames (24 seconds at 30fps)
  
  // Fade in animation for the entire record player
  const fadeIn = interpolate(frame, [0, fps * 2], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  
  // Scale animation - starts slightly larger and settles
  const scale = interpolate(frame, [0, fps * 2], [1.05, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  
  // Tonearm animation - starts at rest position, moves to playing position
  const tonearmAngle = interpolate(
    frame,
    [fps * 0.5, fps * 2],
    [-15, -5], // Start at rest (-15°), move to playing position (-5°)
    {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );
  
  // Tonearm opacity - fades in after record starts
  const tonearmOpacity = interpolate(frame, [fps * 0.5, fps * 1.5], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Pulsing glow effect around the record
  const pulseCycle = frame % (fps * 2);
  const glowIntensity = interpolate(
    pulseCycle,
    [0, fps, fps * 2],
    [0.3, 0.6, 0.3],
    { extrapolateRight: 'clamp' }
  );
  
  // Audio wave rings - multiple expanding rings
  const waveRings = Array.from({ length: 3 }).map((_, i) => {
    const waveCycle = (frame - i * fps * 0.8) % (fps * 2.4);
    const waveProgress = waveCycle / (fps * 2.4);
    const waveScale = 1 + waveProgress * 0.4; // Expand from 1x to 1.4x
    const waveOpacity = interpolate(
      waveProgress,
      [0, 0.3, 1],
      [0, 0.4, 0],
      { extrapolateRight: 'clamp' }
    );
    return { scale: waveScale, opacity: waveOpacity };
  });
  
  // Record player dimensions
  const playerSize = 600;
  const recordSize = 480;
  const centerHoleSize = 40;
  const labelSize = 120;
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: fadeIn,
        width: playerSize,
        height: playerSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Turntable Base */}
      <div
        style={{
          position: 'absolute',
          width: playerSize,
          height: playerSize,
          borderRadius: '50%',
          background: isLightBg
            ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
            : 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          boxShadow: isLightBg
            ? 'inset 0 0 40px rgba(0,0,0,0.1), 0 20px 60px rgba(0,0,0,0.3)'
            : 'inset 0 0 40px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.8)',
          border: `2px solid ${isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
        }}
      />
      
      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          width: playerSize - 20,
          height: playerSize - 20,
          borderRadius: '50%',
          border: `3px solid ${isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
        }}
      />
      
      {/* Audio wave rings */}
      {waveRings.map((wave, i) => (
        <div
          key={`wave-${i}`}
          style={{
            position: 'absolute',
            width: recordSize,
            height: recordSize,
            borderRadius: '50%',
            border: `2px solid ${accentColor}`,
            opacity: wave.opacity,
            transform: `scale(${wave.scale})`,
            transformOrigin: 'center center',
          }}
        />
      ))}
      
      {/* Glow effect around record */}
      <div
        style={{
          position: 'absolute',
          width: recordSize + 20,
          height: recordSize + 20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: 'blur(15px)',
        }}
      />
      
      {/* Vinyl Record */}
      <div
        style={{
          position: 'absolute',
          width: recordSize,
          height: recordSize,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #1a1a1a 0%, #0a0a0a 100%)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        {/* Record grooves - concentric circles */}
        {Array.from({ length: 15 }).map((_, i) => {
          const radius = centerHoleSize + (recordSize - centerHoleSize) * (i / 15);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: radius * 2,
                height: radius * 2,
                borderRadius: '50%',
                border: `1px solid rgba(255,255,255,${0.05 + (i % 2) * 0.02})`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
        
        {/* Center hole */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: centerHoleSize,
            height: centerHoleSize,
            borderRadius: '50%',
            background: '#000000',
            transform: 'translate(-50%, -50%)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
            border: `2px solid ${isLightBg ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
          }}
        />
        
        {/* Record label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: labelSize,
            height: labelSize,
            borderRadius: '50%',
            background: isLightBg
              ? 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
              : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
            border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {/* Center dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#000000',
            }}
          />
        </div>
      </div>
      
      {/* Tonearm */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: recordSize * 0.6,
          height: 2,
          transformOrigin: 'left center',
          transform: `translate(-50%, -50%) rotate(${tonearmAngle}deg)`,
          opacity: tonearmOpacity,
        }}
      >
        {/* Tonearm base (pivot point) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: isLightBg
              ? 'linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 100%)'
              : 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: `2px solid ${isLightBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'}`,
          }}
        />
        
        {/* Tonearm shaft */}
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            width: recordSize * 0.6 - 10,
            height: 3,
            background: isLightBg
              ? 'linear-gradient(90deg, #c0c0c0 0%, #a0a0a0 100%)'
              : 'linear-gradient(90deg, #4a4a4a 0%, #2a2a4a 100%)',
            transform: 'translateY(-50%)',
            borderRadius: '2px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
        
        {/* Tonearm head (cartridge) */}
        <div
          style={{
            position: 'absolute',
            right: -15,
            top: '50%',
            width: 30,
            height: 20,
            background: isLightBg
              ? 'linear-gradient(135deg, #b0b0b0 0%, #909090 100%)'
              : 'linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 100%)',
            transform: 'translateY(-50%)',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {/* Stylus (needle) */}
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              width: 2,
              height: 10,
              background: accentColor,
              transform: 'translateX(-50%)',
              borderRadius: '1px',
              boxShadow: `0 0 4px ${accentColor}`,
            }}
          />
        </div>
      </div>
      
      {/* Speed indicator dots (33 1/3 RPM) */}
      <div
        style={{
          position: 'absolute',
          top: playerSize - 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          opacity: 0.4,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
          }}
        />
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
          }}
        />
        <div
          style={{
            fontSize: 10,
            color: textColor,
            fontWeight: 300,
            letterSpacing: '0.1em',
          }}
        >
          33
        </div>
      </div>
    </div>
  );
};

