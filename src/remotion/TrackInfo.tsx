import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { Chapter } from '../lib/types';

interface TrackInfoProps {
  chapter: Chapter;
  trackIndex: number;
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

export const TrackInfo: React.FC<TrackInfoProps> = ({
  chapter,
  trackIndex,
  colorTheme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const currentTrack = chapter.tracks[trackIndex];
  const accentColor = getColorFromTheme(colorTheme.accent);
  const textColor = getColorFromTheme(colorTheme.text);
  
  // Fade in and slide animation
  const fadeIn = interpolate(
    frame,
    [0, fps * 0.6],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const slideX = interpolate(
    frame,
    [0, fps * 0.6],
    [10, 0],
    { extrapolateRight: 'clamp' }
  );
  
  if (!currentTrack) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        bottom: 280,
        opacity: fadeIn,
        transform: `translateX(${slideX}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'flex-start',
        }}
      >
        {/* Now Playing label */}
        <div
          style={{
            fontSize: 16,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: accentColor,
            opacity: 0.5,
            fontWeight: 300,
          }}
        >
          Now Playing
        </div>
        
        {/* Artist name */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: textColor,
            lineHeight: 1.2,
          }}
        >
          {currentTrack.artist}
        </div>
        
        {/* Track title */}
        <div
          style={{
            fontSize: 20,
            fontStyle: 'italic',
            fontWeight: 300,
            color: textColor,
            opacity: 0.65,
            lineHeight: 1.5,
          }}
        >
          {currentTrack.title}
        </div>
      </div>
    </div>
  );
};

