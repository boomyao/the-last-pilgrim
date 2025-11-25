import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CHAPTERS, getChapterStartTime, getChapterDuration, getTrackDuration } from '../constants';

interface ElegantProgressBarProps {
  totalDuration: number;
  currentProgress: number;
  currentChapterIndex: number;
  currentTrackIndex: number;
  colorTheme: {
    bg: string;
    text: string;
    accent: string;
  };
  onSeek?: (targetProgress: number) => void;
}

export const ElegantProgressBar: React.FC<ElegantProgressBarProps> = ({
  totalDuration,
  currentProgress,
  currentChapterIndex,
  currentTrackIndex,
  colorTheme,
  onSeek,
}) => {
  // Use the actual current chapter and track index instead of calculating from progress
  const chapter = CHAPTERS[currentChapterIndex];
  const trackIndex = Math.min(currentTrackIndex, chapter.tracks.length - 1);
  
  // Calculate track progress within the current track
  const { trackProgress, chapterProgress } = useMemo(() => {
    const chapterStartTime = getChapterStartTime(currentChapterIndex);
    const progressInChapter = currentProgress - chapterStartTime;
    
    // Calculate which track we're in and progress within that track
    let accumulatedTime = 0;
    let currentTrackStartTime = 0;
    let currentTrackDuration = 0;
    
    for (let i = 0; i < chapter.tracks.length; i++) {
      const trackDuration = getTrackDuration(chapter.tracks[i].audioFile);
      if (progressInChapter < accumulatedTime + trackDuration) {
        currentTrackStartTime = accumulatedTime;
        currentTrackDuration = trackDuration;
        break;
      }
      accumulatedTime += trackDuration;
    }
    
    // If we're past all tracks, use the last track
    if (currentTrackDuration === 0 && chapter.tracks.length > 0) {
      const lastTrackIndex = chapter.tracks.length - 1;
      currentTrackStartTime = accumulatedTime - getTrackDuration(chapter.tracks[lastTrackIndex].audioFile);
      currentTrackDuration = getTrackDuration(chapter.tracks[lastTrackIndex].audioFile);
    }
    
    const progressInTrack = progressInChapter - currentTrackStartTime;
    const trackProgress = currentTrackDuration > 0 ? progressInTrack / currentTrackDuration : 0;
    
    const chapterDuration = getChapterDuration(currentChapterIndex);
    const chapterProgress = chapterDuration > 0 ? progressInChapter / chapterDuration : 0;
    
    return {
      trackProgress: Math.max(0, Math.min(trackProgress, 1)),
      chapterProgress: Math.max(0, Math.min(chapterProgress, 1)),
    };
  }, [currentProgress, currentChapterIndex]);

  const progressPercentage = Math.min((currentProgress / totalDuration) * 100, 100);
  const currentTrack = chapter.tracks[trackIndex];

  // Handle click on progress bar to seek
  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    
    const progressBarElement = event.currentTarget;
    const rect = progressBarElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPercentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetProgress = clickPercentage * totalDuration;
    
    onSeek(targetProgress);
  };

  // Extract color from Tailwind classes
  const getColorFromTheme = (themeClass: string): string => {
    const colorMap: Record<string, string> = {
      'text-amber-500': '#f59e0b',
      'text-cyan-400': '#22d3ee',
      'text-white': '#ffffff',
      'text-slate-900': '#0f172a',
    };
    return colorMap[themeClass] || '#ffffff';
  };

  const accentColor = getColorFromTheme(colorTheme.accent);
  const isLightBg = colorTheme.bg.includes('white');

  return (
    <div 
      className="fixed z-50"
      style={{
        left: 0,
        right: 0,
        bottom: '80px',
        width: '1080px',
        pointerEvents: onSeek ? 'auto' : 'none',
      }}
    >
      <div 
        className="mx-auto"
        style={{
          paddingLeft: '48px',
          paddingRight: '48px',
          paddingBottom: '40px',
          maxWidth: '1080px',
        }}
      >

        {/* Chapter and Track Info - Elegant Layout */}
        <div 
          className="flex items-start justify-between"
          style={{
            gap: '48px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          {/* Left: Chapter Info */}
          <motion.div
            className="flex flex-col"
            style={{
              gap: '4px',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Chapter subtitle */}
            <div 
              className={`uppercase ${colorTheme.accent} opacity-60 font-light`}
              style={{
                fontSize: '16px',
                letterSpacing: '0.25em',
              }}
            >
              {chapter.subtitle}
            </div>
            {/* Chapter title */}
            <div 
              className={`font-serif font-normal ${colorTheme.text} leading-[1.2] tracking-tight`}
              style={{
                fontSize: '48px',
              }}
            >
              {chapter.title}
            </div>
            {/* Track count - very subtle */}
            <div 
              className={`mt-6 ${colorTheme.text} opacity-40 font-light`}
              style={{
                fontSize: '16px',
              }}
            >
              {chapter.tracks.length} {chapter.tracks.length === 1 ? 'track' : 'tracks'}
            </div>
          </motion.div>

          {/* Right: Current Track Info */}
          {currentTrack && (
            <motion.div
              className="flex flex-col w-full"
              style={{
                gap: '6px',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}
              key={`${currentChapterIndex}-${trackIndex}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Now Playing label */}
              <div 
                className={`uppercase ${colorTheme.accent} opacity-50 font-light`}
                style={{
                  fontSize: '16px',
                  letterSpacing: '0.2em',
                }}
              >
                Now Playing
              </div>
              
              {/* Artist name */}
              <div 
                className={`font-medium ${colorTheme.text} leading-tight`}
                style={{
                  fontSize: '28px',
                }}
              >
                {currentTrack.artist}
              </div>
              
              {/* Track title */}
              <div 
                className={`${colorTheme.text} opacity-65 italic font-light leading-relaxed`}
                style={{
                  fontSize: '20px',
                }}
              >
                {currentTrack.title}
              </div>
              
              {/* Track progress indicator - minimal */}
              <div 
                className="mt-10 w-full"
                style={{
                  maxWidth: '100%',
                  pointerEvents: 'auto',
                }}
              >
                {/* Progress Line - Very subtle, just a thin line */}
                <div 
                  className="relative w-full cursor-pointer"
                  style={{
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    marginTop: '-8px',
                    marginBottom: '24px',
                  }}
                  onClick={handleProgressBarClick}
                >
                  {/* Background line - barely visible */}
                  <div 
                    className="absolute top-1/2 left-0 w-full -translate-y-1/2"
                    style={{ 
                      height: '1px',
                      backgroundColor: isLightBg ? '#0f172a' : '#ffffff',
                      opacity: 0.15,
                    }}
                  />
                  
                  {/* Progress line - subtle accent */}
                  <motion.div
                    className="absolute top-1/2 left-0 -translate-y-1/2"
                    style={{
                      width: `${progressPercentage}%`,
                      height: '1px',
                      backgroundColor: accentColor,
                      opacity: 0.5,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                  />
                  
                  {/* Very subtle indicator dot at progress point */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${progressPercentage}%`,
                      width: '3px',
                      height: '3px',
                      backgroundColor: accentColor,
                      transform: 'translate(-50%, -50%)',
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
                {/* Track number - very subtle */}
                <div 
                  className={`mt-6 ${colorTheme.text} opacity-35 font-light tracking-wide`}
                  style={{
                    fontSize: '14px',
                  }}
                >
                  {trackIndex + 1} / {chapter.tracks.length}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

