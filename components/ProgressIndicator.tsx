import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ProgressIndicatorProps {
  currentChapterIndex: number;
  totalChapters: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  videoDuration: number; // Target duration in seconds
  onComplete: () => void;
  colorTheme: {
    text: string;
    accent: string;
  };
  isPlaying: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentChapterIndex,
  totalChapters,
  videoRef,
  videoDuration,
  onComplete,
  colorTheme,
  isPlaying,
}) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Update progress based on independent timer (always use videoDuration, not video actual duration)
  useEffect(() => {
    if (!isPlaying) return; // Don't track progress when not playing

    const video = videoRef.current;
    let intervalId: NodeJS.Timeout | null = null;
    const updateInterval = 100; // Update every 100ms for smooth progress
    
    // Initialize start time if not already set
    if (startTimeRef.current === 0) {
      if (pausedTimeRef.current > 0) {
        // Resuming from pause
        startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
        pausedTimeRef.current = 0;
      } else {
        // Starting fresh
        startTimeRef.current = Date.now();
      }
    }
    
    intervalId = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000; // Calculate elapsed time in seconds
      const newProgress = Math.min((elapsed / videoDuration) * 100, 100);
      setProgress(newProgress);
      setTimeElapsed(elapsed);
      
      // Check if we've reached the target duration (based on CHAPTERS setting, not video actual duration)
      if (elapsed >= videoDuration && !isComplete) {
        setIsComplete(true);
        // Stop video if it exists
        if (video) {
          video.pause();
        }
        // Auto-advance after a brief delay
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }, updateInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [videoRef, videoDuration, isComplete, onComplete, isPlaying]);

  // Reset completion state when chapter changes
  useEffect(() => {
    setIsComplete(false);
    setProgress(0);
    setTimeElapsed(0);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, [currentChapterIndex]);

  // Handle pause state changes (save elapsed time when pausing)
  useEffect(() => {
    if (!isPlaying && startTimeRef.current > 0) {
      // Pausing: save current elapsed time
      pausedTimeRef.current = (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = 0; // Reset start time so it can be reinitialized on resume
    }
  }, [isPlaying]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = videoDuration;
  const remainingTime = Math.max(0, totalDuration - timeElapsed);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      {/* Chapter Progress Dots */}
      <div className="flex items-center gap-2 md:gap-3">
        {Array.from({ length: totalChapters }).map((_, index) => {
          const isActive = index === currentChapterIndex;
          const isCompleted = index < currentChapterIndex;
          
          return (
            <div key={index} className="flex items-center">
              <motion.div
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-white/60'
                    : isActive
                    ? 'bg-white'
                    : 'bg-white/20'
                }`}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  opacity: isActive ? 1 : isCompleted ? 0.6 : 0.2
                }}
                transition={{ delay: index * 0.1 }}
              />
              {index < totalChapters - 1 && (
                <motion.div
                  className={`h-[1px] w-4 md:w-8 ${
                    isCompleted ? 'bg-white/60' : 'bg-white/20'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full relative">
        <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${colorTheme.accent.replace('text-', 'bg-')} rounded-full`}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
        
        {/* Time Display */}
        <div className={`flex justify-between items-center mt-2 text-xs ${colorTheme.text} opacity-60`}>
          <span className="font-mono">{formatTime(timeElapsed)}</span>
          <span className="font-mono">{formatTime(remainingTime)}</span>
        </div>
      </div>

      {/* Completion Indicator */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            className={`flex items-center gap-2 ${colorTheme.text} opacity-90`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span
              className="text-xs uppercase tracking-widest"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {currentChapterIndex === totalChapters - 1 ? 'Journey Complete' : 'Proceeding...'}
            </motion.span>
            {currentChapterIndex < totalChapters - 1 && (
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

