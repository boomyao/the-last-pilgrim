import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS, getTotalDuration, getChapterStartTime, getChapterDuration, getTrackDuration } from './constants';
import { AppState } from './types';
import { ElegantProgressBar } from './components/ElegantProgressBar';
import { VideoExportService, RecordingState } from './services/videoExportService';

// Get mode from URL parameter
const getModeFromURL = (): 'control' | 'playback' => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  return mode === 'control' ? 'control' : 'playback';
};

const App: React.FC = () => {
  const [mode, setMode] = useState<'control' | 'playback'>(getModeFromURL());
  const [appState, setAppState] = useState<AppState>(AppState.VIEWING);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
  });
  const chapterStartTimeRef = useRef<number>(Date.now());
  const totalDuration = getTotalDuration();
  
  // Audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioIndexRef = useRef<{ chapterIndex: number; trackIndex: number } | null>(null);
  
  // Video export service
  const videoExportServiceRef = useRef<VideoExportService | null>(null);

  // Helper to get current chapter object
  const chapter = CHAPTERS[currentChapterIndex];

  // Initialize single shared audio element
  useEffect(() => {
    // Create a single shared audio element
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    audioRef.current = audio;
    
    return () => {
      // Cleanup: pause and remove audio element
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Calculate which audio track should be playing based on progress
  const getCurrentAudioTrack = (progress: number): { chapterIndex: number; trackIndex: number } | null => {
    let accumulatedTime = 0;
    
    for (let chapterIdx = 0; chapterIdx < CHAPTERS.length; chapterIdx++) {
      const chapter = CHAPTERS[chapterIdx];
      const chapterDuration = getChapterDuration(chapterIdx);
      
      if (progress < accumulatedTime + chapterDuration) {
        const progressInChapter = progress - accumulatedTime;
        
        // Find which track we're in based on actual track durations
        let trackAccumulatedTime = 0;
        for (let trackIdx = 0; trackIdx < chapter.tracks.length; trackIdx++) {
          const trackDuration = getTrackDuration(chapter.tracks[trackIdx].audioFile);
          if (progressInChapter < trackAccumulatedTime + trackDuration) {
            return { chapterIndex: chapterIdx, trackIndex: trackIdx };
          }
          trackAccumulatedTime += trackDuration;
        }
        
        // If we're past all tracks, return the last track
        return { chapterIndex: chapterIdx, trackIndex: chapter.tracks.length - 1 };
      }
      
      accumulatedTime += chapterDuration;
    }
    
    return null;
  };

  // Helper function to get the audio file path for a given chapter and track
  const getAudioFilePath = (chapterIndex: number, trackIndex: number): string => {
    return CHAPTERS[chapterIndex].tracks[trackIndex].audioFile;
  };

  // Handle seek to a specific progress position
  const handleSeek = useCallback((targetProgress: number) => {
    if (!audioRef.current || !isAudioStarted) return;
    
    // Clamp target progress to valid range
    const clampedProgress = Math.max(0, Math.min(targetProgress, totalDuration));
    
    // Find which chapter and track corresponds to this progress
    const audioTrack = getCurrentAudioTrack(clampedProgress);
    if (!audioTrack) return;
    
    const { chapterIndex, trackIndex } = audioTrack;
    const audio = audioRef.current;
    
    // Calculate the position within the target track
    const chapterStartTime = getChapterStartTime(chapterIndex);
    const progressInChapter = clampedProgress - chapterStartTime;
    
    // Calculate progress within the target track
    const chapter = CHAPTERS[chapterIndex];
    let trackAccumulatedTime = 0;
    for (let i = 0; i < trackIndex; i++) {
      trackAccumulatedTime += getTrackDuration(chapter.tracks[i].audioFile);
    }
    const progressInTrack = progressInChapter - trackAccumulatedTime;
    const currentTrackDuration = getTrackDuration(chapter.tracks[trackIndex].audioFile);
    const targetTrackTime = Math.max(0, Math.min(progressInTrack, currentTrackDuration));
    
    // Update audio position
    const currentAudio = currentAudioIndexRef.current;
    const needsSwitch = !currentAudio || 
      currentAudio.chapterIndex !== chapterIndex || 
      currentAudio.trackIndex !== trackIndex;
    
    if (needsSwitch) {
      // Switch to the new audio file
      audio.pause();
      audio.src = getAudioFilePath(chapterIndex, trackIndex);
      audio.currentTime = targetTrackTime;
      audio.play().catch(err => {
        console.error('Error playing audio after seek:', err);
      });
      
      currentAudioIndexRef.current = { chapterIndex, trackIndex };
      setCurrentChapterIndex(chapterIndex);
      setCurrentTrackIndex(trackIndex);
    } else {
      // Same track, just update position
      audio.currentTime = targetTrackTime;
    }
    
    // Update progress state
    setCurrentProgress(clampedProgress);
    chapterStartTimeRef.current = Date.now();
  }, [isAudioStarted, totalDuration]);

  // Start playing audio when user interacts
  const handleStartAudio = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      const audio = audioRef.current;
      audio.src = getAudioFilePath(0, 0);
      audio.currentTime = 0;
      await audio.play();
      currentAudioIndexRef.current = { chapterIndex: 0, trackIndex: 0 };
      setCurrentChapterIndex(0);
      setCurrentTrackIndex(0);
      chapterStartTimeRef.current = Date.now();
      setIsAudioStarted(true);
    } catch (err) {
      console.error('Error playing first audio:', err);
    }
  }, []);

  // Video Export Functions - define handleAutoStopRecording before handleTrackEnd
  const handleAutoStopRecording = useCallback(async () => {
    // Auto-stop recording when all tracks are completed
    if (recordingState.isRecording && videoExportServiceRef.current) {
      try {
        // Wait a moment to ensure the last frame is captured
        setTimeout(async () => {
          console.log('Auto-stopping recording...');
          const blob = await videoExportServiceRef.current?.stopRecording();
          if (blob && blob.size > 0) {
            console.log(`Auto-stop recording, blob size: ${blob.size} bytes`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            videoExportServiceRef.current?.downloadVideo(blob, `the-last-pilgrim-${timestamp}.webm`);
            setRecordingState({
              isRecording: false,
              isPaused: false,
              duration: 0,
            });
            // Show success message
            alert('录制完成！视频已保存。请检查浏览器的下载文件夹。');
          } else {
            console.error('Auto-stop recording but blob is empty or invalid');
            alert('录制已自动停止，但视频数据为空。请检查浏览器控制台获取更多信息。');
            setRecordingState({
              isRecording: false,
              isPaused: false,
              duration: 0,
            });
          }
        }, 1000); // Wait 1 second to capture final frames
      } catch (error) {
        console.error('Failed to auto-stop recording:', error);
        alert(`自动停止录制时出错: ${error instanceof Error ? error.message : '未知错误'}`);
        setRecordingState({
          isRecording: false,
          isPaused: false,
          duration: 0,
        });
      }
    }
  }, [recordingState.isRecording]);

  // Handle track completion - move to next track
  const handleTrackEnd = useCallback(() => {
    const currentAudio = currentAudioIndexRef.current;
    if (!currentAudio || !audioRef.current) return;

    const { chapterIndex, trackIndex } = currentAudio;
    const chapter = CHAPTERS[chapterIndex];
    const audio = audioRef.current;
    
    if (trackIndex < chapter.tracks.length - 1) {
      // Move to next track in same chapter
      audio.pause();
      audio.src = getAudioFilePath(chapterIndex, trackIndex + 1);
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.error('Error playing next audio:', err);
      });
      currentAudioIndexRef.current = { chapterIndex, trackIndex: trackIndex + 1 };
      setCurrentTrackIndex(trackIndex + 1);
      chapterStartTimeRef.current = Date.now();
    } else {
      // Move to next chapter
      if (chapterIndex < CHAPTERS.length - 1) {
        const nextChapterIndex = chapterIndex + 1;
        audio.pause();
        audio.src = getAudioFilePath(nextChapterIndex, 0);
        audio.currentTime = 0;
        audio.play().catch(err => {
          console.error('Error playing next chapter audio:', err);
        });
        currentAudioIndexRef.current = { chapterIndex: nextChapterIndex, trackIndex: 0 };
        setCurrentChapterIndex(nextChapterIndex);
        setCurrentTrackIndex(0);
        chapterStartTimeRef.current = Date.now();
      } else {
        // All tracks completed - stop playback and auto-stop recording
        audio.pause();
        audio.currentTime = 0;
        
        // Set progress to total duration
        setCurrentProgress(totalDuration);
        
        // Auto-stop recording and save video
        handleAutoStopRecording();
      }
    }
  }, [totalDuration, handleAutoStopRecording]);

  // Setup ended event listener for the shared audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Add ended event listener to the audio element
    audio.addEventListener('ended', handleTrackEnd);

    return () => {
      // Remove ended event listener on cleanup
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [handleTrackEnd]);

  // Play audio based on current progress (for manual progress changes only)
  useEffect(() => {
    if (appState !== AppState.VIEWING || !audioRef.current || !isAudioStarted) return;
    if (!currentAudioIndexRef.current) return; // Don't interfere with initial playback

    const audioTrack = getCurrentAudioTrack(currentProgress);
    if (!audioTrack) return;

    const { chapterIndex, trackIndex } = audioTrack;
    const audio = audioRef.current;

    if (!audio) return;

    // Check if we need to switch audio
    const currentAudio = currentAudioIndexRef.current;
    const needsSwitch = !currentAudio || 
      currentAudio.chapterIndex !== chapterIndex || 
      currentAudio.trackIndex !== trackIndex;

    if (needsSwitch) {
      // Only switch if the current audio is paused (manual progress change) or has ended
      // Don't switch if the current track is still playing
      if (!audio.paused && audio.currentTime < audio.duration) {
        // Current track is still playing, don't switch automatically
        return;
      }

      // Calculate the position within the current track
      const chapterStartTime = getChapterStartTime(chapterIndex);
      const progressInChapter = currentProgress - chapterStartTime;
      
      // Calculate progress within the current track based on actual track durations
      const chapter = CHAPTERS[chapterIndex];
      let trackAccumulatedTime = 0;
      for (let i = 0; i < trackIndex; i++) {
        trackAccumulatedTime += getTrackDuration(chapter.tracks[i].audioFile);
      }
      const progressInTrack = progressInChapter - trackAccumulatedTime;
      const currentTrackDuration = getTrackDuration(chapter.tracks[trackIndex].audioFile);

      // Switch to the new audio file
      audio.pause();
      audio.src = getAudioFilePath(chapterIndex, trackIndex);
      audio.currentTime = Math.max(0, Math.min(progressInTrack, currentTrackDuration));
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
      });

      currentAudioIndexRef.current = { chapterIndex, trackIndex };
      setCurrentChapterIndex(chapterIndex);
      setCurrentTrackIndex(trackIndex);
      chapterStartTimeRef.current = Date.now();
    }
  }, [appState, currentProgress, isAudioStarted]);

  // Track progress based on audio playback time
  // Progress calculation: (已完成音轨总时长 + 当前音轨播放进度) / 总时长
  // 已完成音轨总时长 = 所有之前章节的所有音轨时长 + 当前章节中已完成的音轨时长
  useEffect(() => {
    if (appState !== AppState.VIEWING || !audioRef.current || !isAudioStarted) return;

    const updateProgress = () => {
      const currentAudio = currentAudioIndexRef.current;
      if (!currentAudio) return;

      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const { chapterIndex, trackIndex } = currentAudio;

      // 1. 计算所有之前章节的累计时长（已完成的所有音轨）
      // getChapterStartTime(chapterIndex) 返回章节 chapterIndex 的起始时间，
      // 即所有之前章节（0 到 chapterIndex-1）的累计时长
      const completedChaptersDuration = getChapterStartTime(chapterIndex);
      
      // 2. 计算当前章节中已完成的音轨时长
      // 累加当前章节中 trackIndex 之前的所有音轨时长
      const chapter = CHAPTERS[chapterIndex];
      let completedTracksInChapterDuration = 0;
      for (let i = 0; i < trackIndex; i++) {
        completedTracksInChapterDuration += getTrackDuration(chapter.tracks[i].audioFile);
      }
      
      // 3. 获取当前音轨的播放进度
      const currentTrackDuration = getTrackDuration(chapter.tracks[trackIndex].audioFile);
      const currentTrackProgress = Math.min(audio.currentTime, currentTrackDuration);
      
      // 4. 计算总播放时间 = 已完成音轨总时长 + 当前音轨播放进度
      const totalPlayedTime = completedChaptersDuration + completedTracksInChapterDuration + currentTrackProgress;
      
      // 5. 计算进度百分比并更新状态
      const newProgress = Math.min(totalPlayedTime, totalDuration);
      setCurrentProgress(newProgress);

      // Update current chapter index and track index if needed
      if (chapterIndex !== currentChapterIndex) {
        setCurrentChapterIndex(chapterIndex);
      }
      if (trackIndex !== currentTrackIndex) {
        setCurrentTrackIndex(trackIndex);
      }
    };

    const interval = setInterval(updateProgress, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [appState, currentChapterIndex, totalDuration, isAudioStarted]);

  // Handle keyboard shortcuts (space to start in playback mode, arrow keys for seeking)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space key: start audio in playback mode if not started
      if (event.key === ' ' || event.key === 'Spacebar') {
        if (mode === 'playback' && !isAudioStarted) {
          event.preventDefault();
          handleStartAudio();
          return;
        }
      }

      // Arrow keys: only work when audio is started
      if (!isAudioStarted) return;

      const currentAudio = currentAudioIndexRef.current;
      if (!currentAudio || !audioRef.current) return;

      const { chapterIndex, trackIndex } = currentAudio;
      const audio = audioRef.current;

      if (!audio) return;

      const SEEK_AMOUNT = 10; // seconds to seek forward/backward

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        // Fast forward
        const chapter = CHAPTERS[chapterIndex];
        const currentTrackDuration = getTrackDuration(chapter.tracks[trackIndex].audioFile);
        const newTime = Math.min(audio.currentTime + SEEK_AMOUNT, audio.duration || currentTrackDuration);
        audio.currentTime = newTime;
        
        // Update progress using the same calculation logic as updateProgress
        // 1. 所有之前章节的累计时长
        const completedChaptersDuration = getChapterStartTime(chapterIndex);
        
        // 2. 当前章节中已完成的音轨时长
        let completedTracksInChapterDuration = 0;
        for (let i = 0; i < trackIndex; i++) {
          completedTracksInChapterDuration += getTrackDuration(chapter.tracks[i].audioFile);
        }
        
        // 3. 当前音轨的播放进度
        const currentTrackProgress = Math.min(newTime, currentTrackDuration);
        
        // 4. 计算总播放时间
        const totalPlayedTime = completedChaptersDuration + completedTracksInChapterDuration + currentTrackProgress;
        const newProgress = Math.min(totalPlayedTime, totalDuration);
        setCurrentProgress(newProgress);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        // Rewind
        const chapter = CHAPTERS[chapterIndex];
        const currentTrackDuration = getTrackDuration(chapter.tracks[trackIndex].audioFile);
        const newTime = Math.max(audio.currentTime - SEEK_AMOUNT, 0);
        audio.currentTime = newTime;
        
        // Update progress using the same calculation logic as updateProgress
        // 1. 所有之前章节的累计时长
        const completedChaptersDuration = getChapterStartTime(chapterIndex);
        
        // 2. 当前章节中已完成的音轨时长
        let completedTracksInChapterDuration = 0;
        for (let i = 0; i < trackIndex; i++) {
          completedTracksInChapterDuration += getTrackDuration(chapter.tracks[i].audioFile);
        }
        
        // 3. 当前音轨的播放进度
        const currentTrackProgress = Math.min(Math.max(newTime, 0), currentTrackDuration);
        
        // 4. 计算总播放时间
        const totalPlayedTime = completedChaptersDuration + completedTracksInChapterDuration + currentTrackProgress;
        const newProgress = Math.max(totalPlayedTime, 0);
        setCurrentProgress(newProgress);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, isAudioStarted, handleStartAudio]);

  // Note: Auto-advance is now handled by audio track completion
  // The audio will automatically advance chapters when tracks finish

  // Video Export Functions
  const handleStartRecording = async () => {
    try {
      if (!videoExportServiceRef.current) {
        videoExportServiceRef.current = new VideoExportService();
      }

      // If in control mode, open playback tab first
      if (mode === 'control') {
        const playbackUrl = `${window.location.origin}${window.location.pathname}?mode=playback`;
        const playbackWindow = window.open(playbackUrl, '_blank');
        
        if (!playbackWindow) {
          alert('无法打开播放页面。请检查浏览器是否阻止了弹窗。');
          return;
        }

        // Wait a moment for the new tab to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show instruction to user
        alert('请在弹出的浏览器提示中选择刚才打开的播放页面标签页进行录制。');
      }

      await videoExportServiceRef.current.startRecording((state) => {
        setRecordingState(state);
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法开始录制。请确保授予屏幕录制权限，并在浏览器提示中选择"共享标签页音频"以包含音频。');
    }
  };

  // Note: Auto-stop recording is handled in handleTrackEnd when the last track completes

  const handleStopRecording = async () => {
    try {
      if (videoExportServiceRef.current) {
        console.log('Stopping recording...');
        const blob = await videoExportServiceRef.current.stopRecording();
        if (blob && blob.size > 0) {
          console.log(`Recording stopped, blob size: ${blob.size} bytes`);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          videoExportServiceRef.current.downloadVideo(blob, `the-last-pilgrim-${timestamp}.webm`);
          setRecordingState({
            isRecording: false,
            isPaused: false,
            duration: 0,
          });
          // Show success message
          alert('视频已保存！请检查浏览器的下载文件夹。');
        } else {
          console.error('Recording stopped but blob is empty or invalid');
          alert('录制已停止，但视频数据为空。请检查浏览器控制台获取更多信息。');
          setRecordingState({
            isRecording: false,
            isPaused: false,
            duration: 0,
          });
        }
      } else {
        console.warn('VideoExportService is not initialized');
        alert('录制服务未初始化。请重新开始录制。');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert(`停止录制时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      setRecordingState({
        isRecording: false,
        isPaused: false,
        duration: 0,
      });
    }
  };

  const handlePauseRecording = () => {
    if (videoExportServiceRef.current) {
      videoExportServiceRef.current.pauseRecording();
    }
  };

  const handleResumeRecording = () => {
    if (videoExportServiceRef.current) {
      videoExportServiceRef.current.resumeRecording();
    }
  };

  // Update recording duration display
  useEffect(() => {
    if (!recordingState.isRecording) return;

    const interval = setInterval(() => {
      if (videoExportServiceRef.current) {
        const state = videoExportServiceRef.current.getState();
        setRecordingState(state);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState.isRecording]);

  // Control Page UI
  if (mode === 'control') {
    return (
      <div className="relative w-full h-screen bg-black overflow-hidden select-none flex items-center justify-center" style={{ width: '1080px', height: '1920px' }}>
        <div className="mx-auto px-12 py-24 text-center" style={{ maxWidth: '800px' }}>
          <h1 className="text-5xl font-bold mb-16 text-white">录制控制面板</h1>
          <p className="text-xl text-gray-300 mb-16">
            点击"开始录制"将打开一个新标签页显示内容，然后您可以在浏览器提示中选择该标签页进行录制。
          </p>
          
          <div className="flex flex-col gap-4 items-center">
            {!recordingState.isRecording ? (
              <motion.button
                onClick={handleStartRecording}
                className="px-8 py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-lg font-medium transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                开始录制
              </motion.button>
            ) : (
              <>
                <div className={`px-6 py-3 rounded-lg backdrop-blur-md border-2 text-lg font-medium bg-red-500/90 border-red-400/50 text-white`}>
                  <span className="flex items-center gap-2">
                    <motion.span
                      className="w-3 h-3 bg-white rounded-full"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    录制中 {Math.floor(recordingState.duration / 60)}:{(Math.floor(recordingState.duration % 60)).toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {recordingState.isPaused ? (
                    <motion.button
                      onClick={handleResumeRecording}
                      className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      继续
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handlePauseRecording}
                      className="px-6 py-3 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      暂停
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleStopRecording}
                    className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-medium transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    停止
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Playback Page UI (original content)
  return (
    <div className="relative bg-black overflow-hidden select-none" style={{ width: '1080px', height: '1920px' }}>
      {/* Elegant Progress Bar - Always visible, outside of chapter transitions */}
      {isAudioStarted && (
        <ElegantProgressBar
          totalDuration={totalDuration}
          currentProgress={currentProgress}
          currentChapterIndex={currentChapterIndex}
          currentTrackIndex={currentTrackIndex}
          colorTheme={chapter.colorTheme}
          onSeek={handleSeek}
        />
      )}

      {/* Video Export Controls - Only show when recording in playback mode */}
      {mode === 'playback' && isAudioStarted && recordingState.isRecording && (
        <div className="fixed z-50 flex flex-col gap-3" style={{ top: '16px', right: '16px' }}>
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Recording indicator */}
            <div className={`px-4 py-2 rounded-lg backdrop-blur-md border-2 text-sm font-medium ${
              chapter.colorTheme.bg.includes('white')
                ? 'bg-red-500/90 border-red-400/50 text-white'
                : 'bg-red-500/90 border-red-400/50 text-white'
            }`}>
              <span className="flex items-center gap-2">
                <motion.span
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                录制中 {Math.floor(recordingState.duration / 60)}:{(Math.floor(recordingState.duration % 60)).toString().padStart(2, '0')}
              </span>
            </div>
            
            {/* Control buttons */}
            <div className="flex gap-2">
              {recordingState.isPaused ? (
                <motion.button
                  onClick={handleResumeRecording}
                  className={`px-4 py-2 rounded-lg backdrop-blur-md border text-sm font-medium transition-all ${
                    chapter.colorTheme.bg.includes('white')
                      ? 'bg-white/20 border-white/30 text-slate-700 hover:bg-white/30'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  继续
                </motion.button>
              ) : (
                <motion.button
                  onClick={handlePauseRecording}
                  className={`px-4 py-2 rounded-lg backdrop-blur-md border text-sm font-medium transition-all ${
                    chapter.colorTheme.bg.includes('white')
                      ? 'bg-white/20 border-white/30 text-slate-700 hover:bg-white/30'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  暂停
                </motion.button>
              )}
              <motion.button
                onClick={handleStopRecording}
                className={`px-4 py-2 rounded-lg backdrop-blur-md border text-sm font-medium transition-all ${
                  chapter.colorTheme.bg.includes('white')
                    ? 'bg-white/20 border-white/30 text-slate-700 hover:bg-white/30'
                    : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                停止
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Start Button - Show before audio starts, but not in playback mode */}
      {!isAudioStarted && mode !== 'playback' && (
        <motion.div
          className="absolute z-50 flex items-center justify-center"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.button
            onClick={handleStartAudio}
            className={`px-12 py-6 rounded-lg backdrop-blur-md border-2 transition-all duration-300 ${
              chapter.colorTheme.bg.includes('white')
                ? 'bg-white/20 border-white/30 text-slate-700 hover:bg-white/30'
                : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-xl font-medium tracking-wider">
              开始旅程
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* Hint for playback mode - show when audio hasn't started */}
      {mode === 'playback' && !isAudioStarted && (
        <motion.div
          className="absolute z-50 flex items-center justify-center"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className={`px-8 py-5 rounded-lg backdrop-blur-md border-2 ${
              chapter.colorTheme.bg.includes('white')
                ? 'bg-white/20 border-white/30 text-slate-700'
                : 'bg-black/40 border-white/20 text-white'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xl font-medium tracking-wider text-center">
              按空格键开始播放
            </p>
          </motion.div>
        </motion.div>
      )}

          {/* Main Experience */}
      <AnimatePresence mode='wait'>
        {appState === AppState.VIEWING && (
          <motion.div 
            key={currentChapterIndex}
            className={`relative flex flex-col items-center ${chapter.colorTheme.bg}`}
            style={{ width: '1080px', height: '1920px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          >
            {/* Dynamic Background Video with Breathing Effect */}
            <motion.div 
              className="absolute z-0"
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
            >
               {/* Initial Entrance Zoom */}
               <motion.div
                 className="w-full h-full"
                 style={{ width: '1080px', height: '1920px' }}
                 initial={{ scale: 1.1 }}
                 animate={{ scale: 1 }}
                 transition={{ duration: 10, ease: "easeOut" }}
               >
                 <div className="w-full h-full" style={{ width: '1080px', height: '1920px' }}>
                    <video 
                      src={chapter.video} 
                      className="w-full h-full object-contain" 
                      style={{ width: '1080px', height: '1920px' }}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                 </div>
               </motion.div>

              {/* Overlay Gradient for Text Readability */}
              <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-${chapter.colorTheme.bg.replace('bg-', '')}/90`} />
            </motion.div>

            {/* Quote - Separate from background image */}
            <div 
              className="z-10 w-full flex flex-col items-center text-center"
              style={{
                paddingTop: '480px',
                paddingBottom: '40px',
                paddingLeft: '24px',
                paddingRight: '24px',
              }}
            >
              <motion.div
                className={`backdrop-blur-sm rounded-lg px-8 py-8 ${
                  chapter.colorTheme.bg.includes('white') 
                    ? 'bg-white/10 border border-white/20' 
                    : 'bg-black/20 border border-white/10'
                }`}
                style={{ maxWidth: '900px' }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, duration: 2 }}
              >
                <motion.p 
                  className={`quote leading-relaxed italic ${chapter.colorTheme.text}`}
                  style={{
                    fontSize: '48px',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  transition={{ delay: 2.2, duration: 2 }}
                >
                  "{chapter.quote}"
                </motion.p>
              </motion.div>
            </div>

            {/* Grain Overlay for cinematic feel */}
            <div className="absolute pointer-events-none z-20 opacity-[0.05] mix-blend-overlay" 
                 style={{
                   top: 0,
                   left: 0,
                   right: 0,
                   bottom: 0,
                   backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                 }}>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;