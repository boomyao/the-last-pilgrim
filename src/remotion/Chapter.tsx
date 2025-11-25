import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Html5Audio,
  Sequence,
  Loop,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from 'remotion';
import { CHAPTERS, getVideoDuration } from '../lib/constants';
import { getTrackFrameRanges, getCurrentTrackAtFrame, FPS, toFrames } from '../lib/timing';
import { QuoteOverlay } from './QuoteOverlay';
import { ProgressBar } from './ProgressBar';
import { TrackInfo } from './TrackInfo';

interface ChapterProps {
  index: number;
}

// Map Tailwind bg classes to actual colors for Remotion
const getBgColor = (bgClass: string): string => {
  const colorMap: Record<string, string> = {
    'bg-amber-950': '#451a03',
    'bg-slate-900': '#0f172a',
    'bg-black': '#000000',
    'bg-white': '#ffffff',
  };
  return colorMap[bgClass] || '#000000';
};

export const Chapter: React.FC<ChapterProps> = ({ index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const chapter = CHAPTERS[index];
  const trackRanges = getTrackFrameRanges(index, fps);
  const currentTrackInfo = getCurrentTrackAtFrame(index, frame, fps);
  
  // Get video duration for looping
  const videoDurationInSeconds = getVideoDuration(chapter.video);
  const videoDurationInFrames = toFrames(videoDurationInSeconds, fps);
  
  // Initial fade-in animation (2 seconds)
  const fadeIn = interpolate(frame, [0, fps * 2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Initial zoom animation (scale 1.1 -> 1 over 10 seconds)
  const scale = interpolate(frame, [0, fps * 10], [1.1, 1], {
    extrapolateRight: 'clamp',
  });
  
  const bgColor = getBgColor(chapter.colorTheme.bg);
  
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Background Video with zoom effect */}
      <AbsoluteFill
        style={{
          opacity: fadeIn,
          transform: `scale(${scale})`,
        }}
      >
        <Loop durationInFrames={videoDurationInFrames}>
          <OffthreadVideo
            src={staticFile(chapter.video)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            muted
          />
        </Loop>
        
        {/* Overlay Gradient for Text Readability */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.6), transparent, ${bgColor}90)`,
          }}
        />
      </AbsoluteFill>
      
      {/* Audio tracks as sequences */}
      {trackRanges.map((range, trackIndex) => (
        <Sequence
          key={`audio-${trackIndex}`}
          from={range.from}
          durationInFrames={range.durationInFrames}
        >
          <Html5Audio src={staticFile(range.audioFile)} />
        </Sequence>
      ))}
      
      {/* Quote Overlay */}
      <QuoteOverlay
        quote={chapter.quote}
        colorTheme={chapter.colorTheme}
      />
      
      {/* Progress Bar - shows current progress info */}
      <ProgressBar
        chapterIndex={index}
        trackIndex={currentTrackInfo?.trackIndex ?? 0}
        colorTheme={chapter.colorTheme}
      />
      
      {/* Track Info - Now Playing */}
      <TrackInfo
        chapter={chapter}
        trackIndex={currentTrackInfo?.trackIndex ?? 0}
        colorTheme={chapter.colorTheme}
      />
      
      {/* Grain Overlay for cinematic feel */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </AbsoluteFill>
  );
};

