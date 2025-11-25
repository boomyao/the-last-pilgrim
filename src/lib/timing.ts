import { CHAPTERS, getChapterDuration, getChapterStartTime, getTrackDuration, getTotalDuration } from './constants';

export const FPS = 30;

/**
 * Convert seconds to frames
 */
export const toFrames = (seconds: number, fps: number = FPS): number => {
  return Math.round(seconds * fps);
};

/**
 * Convert frames to seconds
 */
export const toSeconds = (frames: number, fps: number = FPS): number => {
  return frames / fps;
};

/**
 * Get total duration in frames
 */
export const getTotalFrames = (fps: number = FPS): number => {
  return toFrames(getTotalDuration(), fps);
};

/**
 * Get the frame range for a specific chapter
 */
export const getChapterFrameRange = (chapterIndex: number, fps: number = FPS): { from: number; durationInFrames: number } => {
  const startTime = getChapterStartTime(chapterIndex);
  const duration = getChapterDuration(chapterIndex);
  
  return {
    from: toFrames(startTime, fps),
    durationInFrames: toFrames(duration, fps),
  };
};

/**
 * Get the frame ranges for all chapters
 */
export const getAllChapterFrameRanges = (fps: number = FPS): Array<{ from: number; durationInFrames: number }> => {
  return CHAPTERS.map((_, index) => getChapterFrameRange(index, fps));
};

/**
 * Get the track frame ranges within a chapter
 */
export const getTrackFrameRanges = (chapterIndex: number, fps: number = FPS): Array<{ from: number; durationInFrames: number; audioFile: string }> => {
  if (chapterIndex < 0 || chapterIndex >= CHAPTERS.length) return [];
  
  const chapter = CHAPTERS[chapterIndex];
  const ranges: Array<{ from: number; durationInFrames: number; audioFile: string }> = [];
  
  let currentFrame = 0;
  for (const track of chapter.tracks) {
    const duration = getTrackDuration(track.audioFile);
    ranges.push({
      from: currentFrame,
      durationInFrames: toFrames(duration, fps),
      audioFile: track.audioFile,
    });
    currentFrame += toFrames(duration, fps);
  }
  
  return ranges;
};

/**
 * Get the current track at a given frame within a chapter
 */
export const getCurrentTrackAtFrame = (chapterIndex: number, frameInChapter: number, fps: number = FPS): { trackIndex: number; frameInTrack: number } | null => {
  if (chapterIndex < 0 || chapterIndex >= CHAPTERS.length) return null;
  
  const chapter = CHAPTERS[chapterIndex];
  let accumulatedFrames = 0;
  
  for (let i = 0; i < chapter.tracks.length; i++) {
    const trackDuration = getTrackDuration(chapter.tracks[i].audioFile);
    const trackFrames = toFrames(trackDuration, fps);
    
    if (frameInChapter < accumulatedFrames + trackFrames) {
      return {
        trackIndex: i,
        frameInTrack: frameInChapter - accumulatedFrames,
      };
    }
    accumulatedFrames += trackFrames;
  }
  
  // Return last track if we're past all tracks
  if (chapter.tracks.length > 0) {
    const lastTrackFrames = toFrames(getTrackDuration(chapter.tracks[chapter.tracks.length - 1].audioFile), fps);
    return {
      trackIndex: chapter.tracks.length - 1,
      frameInTrack: lastTrackFrames,
    };
  }
  
  return null;
};

/**
 * Get the global track info at a given absolute frame
 */
export const getGlobalTrackAtFrame = (absoluteFrame: number, fps: number = FPS): { chapterIndex: number; trackIndex: number; frameInTrack: number } | null => {
  let accumulatedFrames = 0;
  
  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) {
    const chapterDuration = getChapterDuration(chapterIndex);
    const chapterFrames = toFrames(chapterDuration, fps);
    
    if (absoluteFrame < accumulatedFrames + chapterFrames) {
      const frameInChapter = absoluteFrame - accumulatedFrames;
      const trackInfo = getCurrentTrackAtFrame(chapterIndex, frameInChapter, fps);
      
      if (trackInfo) {
        return {
          chapterIndex,
          ...trackInfo,
        };
      }
    }
    accumulatedFrames += chapterFrames;
  }
  
  return null;
};

