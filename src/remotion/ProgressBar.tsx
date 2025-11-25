import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { CHAPTERS, getChapterStartTime, getTotalDuration } from '../lib/constants';
import { toSeconds } from '../lib/timing';

interface ProgressBarProps {
  chapterIndex: number;
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

export const ProgressBar: React.FC<ProgressBarProps> = ({
  chapterIndex,
  trackIndex,
  colorTheme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const chapter = CHAPTERS[chapterIndex];
  const totalDuration = getTotalDuration();
  
  // Calculate absolute time from chapter start
  const chapterStartTime = getChapterStartTime(chapterIndex);
  const currentTimeInChapter = toSeconds(frame, fps);
  const absoluteTime = chapterStartTime + currentTimeInChapter;
  
  // Calculate overall progress percentage
  const progressPercentage = Math.min((absoluteTime / totalDuration) * 100, 100);
  
  // Fade in animation
  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Slide up animation
  const slideUp = interpolate(frame, [0, fps * 0.8], [10, 0], {
    extrapolateRight: 'clamp',
  });
  
  // Pulsing opacity for indicator dot (3 second cycle)
  const cycleFrame = frame % (fps * 3);
  const pulseOpacity = interpolate(cycleFrame, [0, fps * 1.5, fps * 3], [0.3, 0.6, 0.3]);
  
  const accentColor = getColorFromTheme(colorTheme.accent);
  const textColor = getColorFromTheme(colorTheme.text);
  const isLightBg = colorTheme.bg.includes('white');
  const lineBaseColor = isLightBg ? '#0f172a' : '#ffffff';
  
  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        right: 48,
        bottom: 80,
        opacity: fadeIn,
        transform: `translateY(${slideUp}px)`,
      }}
    >
      {/* Chapter Info Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 24,
        }}
      >
        {/* Chapter subtitle */}
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: accentColor,
            opacity: 0.6,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          {chapter.subtitle}
        </div>
        
        {/* Chapter title */}
        <div
          style={{
            fontSize: 40,
            fontFamily: 'serif',
            fontWeight: 400,
            color: textColor,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          {chapter.title}
        </div>
        
        {/* Track count */}
        <div
          style={{
            fontSize: 12,
            color: textColor,
            opacity: 0.4,
            fontWeight: 300,
          }}
        >
          {chapter.tracks.length} {chapter.tracks.length === 1 ? 'track' : 'tracks'}
        </div>
      </div>

      {/* Progress Bar Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Progress Line Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 2,
          }}
        >
          {/* Background line */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: 1,
              transform: 'translateY(-50%)',
              backgroundColor: lineBaseColor,
              opacity: 0.15,
            }}
          />
          
          {/* Progress line */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: `${progressPercentage}%`,
              height: 1,
              transform: 'translateY(-50%)',
              backgroundColor: accentColor,
              opacity: 0.5,
            }}
          />
          
          {/* Indicator dot */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${progressPercentage}%`,
              width: 4,
              height: 4,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: accentColor,
              opacity: pulseOpacity,
            }}
          />
        </div>
        
        {/* Track number */}
        <div
          style={{
            fontSize: 12,
            color: textColor,
            opacity: 0.35,
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          {trackIndex + 1} / {chapter.tracks.length}
        </div>
      </div>
    </div>
  );
};

