import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

interface QuoteOverlayProps {
  quote: string;
  colorTheme: {
    bg: string;
    text: string;
    accent: string;
  };
}

// Extract color from Tailwind classes
const getColorFromTheme = (themeClass: string): string => {
  const colorMap: Record<string, string> = {
    'text-amber-100': '#fef3c7',
    'text-cyan-100': '#cffafe',
    'text-gray-200': '#e5e7eb',
    'text-slate-600': '#475569',
  };
  return colorMap[themeClass] || '#ffffff';
};

export const QuoteOverlay: React.FC<QuoteOverlayProps> = ({
  quote,
  colorTheme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const isLightBg = colorTheme.bg.includes('white');
  const textColor = getColorFromTheme(colorTheme.text);
  
  // Delay 2 seconds, then fade in over 2 seconds
  const containerOpacity = interpolate(
    frame,
    [fps * 2, fps * 4],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Slide up animation for container
  const containerY = interpolate(
    frame,
    [fps * 2, fps * 4],
    [-20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Slightly delayed text fade (starts at 2.2s)
  const textOpacity = interpolate(
    frame,
    [fps * 2.2, fps * 4.2],
    [0, 0.95],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: 1080,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        paddingTop: 120,
        paddingBottom: 40,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          opacity: containerOpacity,
          transform: `translateY(${containerY}px)`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: 32,
          backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)',
          border: isLightBg ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <p
          style={{
            fontSize: 48,
            lineHeight: 1.5,
            fontStyle: 'italic',
            color: textColor,
            opacity: textOpacity,
            margin: 0,
            fontFamily: 'serif',
          }}
        >
          "{quote}"
        </p>
      </div>
    </div>
  );
};

