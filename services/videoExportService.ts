/**
 * Video Export Service
 * Uses MediaRecorder API to record screen and audio
 */

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

export class VideoExportService {
  private mediaRecorder: MediaRecorder | null = null;
  private screenStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private stateCallbacks: ((state: RecordingState) => void)[] = [];

  /**
   * Start recording screen and audio
   * Note: For audio capture, user should select "Share tab audio" when prompted
   * 
   * For vertical video (9:16 aspect ratio) suitable for TikTok, Instagram Reels, YouTube Shorts:
   * - Recommended resolution: 1080x1920 (Full HD vertical)
   * - Set Chrome DevTools to Responsive mode with 1080x1920 before recording
   * - Or use a custom device with 1080x1920 resolution
   */
  async startRecording(
    onStateChange?: (state: RecordingState) => void
  ): Promise<void> {
    try {
      // Check if we're in a secure context (required for getDisplayMedia)
      if (!window.isSecureContext) {
        throw new Error('录制功能需要在安全上下文（HTTPS）中运行。请确保使用 HTTPS 访问应用。');
      }

      // Request screen capture with audio
      // User should select "Share tab audio" option in the browser prompt
      // Note: The actual resolution will match the browser window size
      // For vertical video (9:16), set browser to 1080x1920 before recording
      
      // Try with 'browser' first to ensure current tab appears in selection list
      // This ensures the current application tab is available in the Chrome tabs selection
      // If that fails (e.g., on IP addresses), fall back to unrestricted mode
      let screenStream: MediaStream;
      
      try {
        // First attempt: use 'browser' with selfBrowserSurface to ensure current tab appears
        // This is the proper way to include the current tab in the selection list
        // selfBrowserSurface: 'include' explicitly tells the browser to show the current tab
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // @ts-ignore - mediaSource and selfBrowserSurface are valid properties but may not be in TypeScript definitions
            mediaSource: 'browser',
            selfBrowserSurface: 'include', // Explicitly include current tab in selection list
            // These are ideal values - actual resolution depends on browser window size
            // For vertical video: set browser window to 1080x1920 before recording
            width: { ideal: 1080 },  // Vertical: 1080x1920 (9:16)
            height: { ideal: 1920 }, // For horizontal: use 1920x1080 (16:9)
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            // Request system audio capture (browser may prompt user)
            // suppressLocalAudioPlayback: false,
          },
        });
      } catch (browserError) {
        // If 'browser' fails (e.g., on IP addresses or due to certificate issues), try without restriction
        console.warn('Failed to get display media with browser source, trying unrestricted:', browserError);
        
        // Check if error might be related to certificate/security context
        const errorMessage = browserError instanceof Error ? browserError.message : String(browserError);
        if (errorMessage.includes('certificate') || errorMessage.includes('secure') || errorMessage.includes('NotAllowedError')) {
          console.warn('Possible certificate/security issue detected. If using self-signed certificate, ensure you have accepted it in the browser.');
        }
        
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              // Don't restrict mediaSource - let browser show all options
              // This works better for IP addresses
              width: { ideal: 1080 },  // Vertical: 1080x1920 (9:16)
              height: { ideal: 1920 }, // For horizontal: use 1920x1080 (16:9)
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              suppressLocalAudioPlayback: false,
            },
          });
        } catch (fallbackError) {
          // Provide helpful error message about certificate if applicable
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          if (window.location.protocol === 'https:' && fallbackMessage.includes('NotAllowedError')) {
            throw new Error('无法访问屏幕录制功能。如果使用自签名证书，请确保已在浏览器中接受证书（点击地址栏的"高级"→"继续访问"）。');
          }
          throw fallbackError;
        }
      }

      this.screenStream = screenStream;
      this.combinedStream = screenStream;

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 5000000, // 5 Mbps
      };

      // Fallback to other codecs if vp9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.combinedStream, options);
      this.chunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          console.log(`Data chunk received: ${event.data.size} bytes, total chunks: ${this.chunks.length}`);
        } else {
          console.warn('Received empty data chunk');
        }
      };

      // Handle stop
      this.mediaRecorder.onstop = () => {
        this.notifyStateChange({
          isRecording: false,
          isPaused: false,
          duration: this.getDuration(),
        });
      };

      // Handle pause
      this.mediaRecorder.onpause = () => {
        this.pauseStartTime = Date.now();
        this.notifyStateChange({
          isRecording: true,
          isPaused: true,
          duration: this.getDuration(),
        });
      };

      // Handle resume
      this.mediaRecorder.onresume = () => {
        if (this.pauseStartTime > 0) {
          this.pausedDuration += Date.now() - this.pauseStartTime;
          this.pauseStartTime = 0;
        }
        this.notifyStateChange({
          isRecording: true,
          isPaused: false,
          duration: this.getDuration(),
        });
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

      // Handle screen stream end (user stops sharing)
      screenStream.getVideoTracks()[0].onended = () => {
        this.stopRecording();
      };

      if (onStateChange) {
        this.stateCallbacks.push(onStateChange);
      }

      this.notifyStateChange({
        isRecording: true,
        isPaused: false,
        duration: 0,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please grant screen sharing permissions.');
    }
  }

  /**
   * Stop recording and return the video blob
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.warn('MediaRecorder is not active');
      return null;
    }

    return new Promise((resolve) => {
      // Store the original onstop handler if it exists
      const originalOnStop = this.mediaRecorder!.onstop;
      
      // Set up a new onstop handler that will resolve the promise
      this.mediaRecorder!.onstop = () => {
        try {
          // Request final data chunk before creating blob
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.requestData();
          }
          
          // Small delay to ensure all chunks are collected
          setTimeout(() => {
            if (this.chunks.length === 0) {
              console.error('No video chunks collected');
              resolve(null);
              return;
            }

            const blob = new Blob(this.chunks, { type: 'video/webm' });
            console.log(`Video blob created: ${blob.size} bytes, ${this.chunks.length} chunks`);
            
            // Restore original handler before cleanup
            if (originalOnStop) {
              this.mediaRecorder!.onstop = originalOnStop;
            }
            
            this.cleanup();
            resolve(blob);
          }, 100);
        } catch (error) {
          console.error('Error in onstop handler:', error);
          resolve(null);
        }
      };

      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        } else if (this.mediaRecorder.state === 'paused') {
          this.mediaRecorder.stop();
        } else {
          console.warn(`MediaRecorder state is ${this.mediaRecorder.state}, cannot stop`);
          resolve(null);
        }
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
        resolve(null);
      }
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration(): number {
    if (!this.startTime) return 0;
    const currentTime = this.pauseStartTime > 0 ? this.pauseStartTime : Date.now();
    return (currentTime - this.startTime - this.pausedDuration) / 1000;
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return {
      isRecording: this.mediaRecorder?.state === 'recording' || this.mediaRecorder?.state === 'paused',
      isPaused: this.mediaRecorder?.state === 'paused',
      duration: this.getDuration(),
    };
  }

  /**
   * Download the recorded video
   * Enhanced for Firefox compatibility
   */
  downloadVideo(blob: Blob, filename: string = 'the-last-pilgrim-recording.webm'): void {
    try {
      if (!blob || blob.size === 0) {
        console.error('Invalid blob for download:', blob);
        alert('视频数据无效，无法下载。请检查录制是否成功。');
        return;
      }

      console.log(`Downloading video: ${filename}, size: ${blob.size} bytes`);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // Firefox requires the element to be in the DOM before clicking
      document.body.appendChild(a);
      
      // Trigger download
      a.click();
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Download initiated successfully');
      }, 100);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert(`下载视频时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    // Only stop combined stream if it's different from screen stream
    if (this.combinedStream && this.combinedStream !== this.screenStream) {
      this.combinedStream.getTracks().forEach((track) => track.stop());
    }
    this.combinedStream = null;

    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.pauseStartTime = 0;
    this.stateCallbacks = [];
  }

  /**
   * Notify state change to all callbacks
   */
  private notifyStateChange(state: RecordingState): void {
    this.stateCallbacks.forEach((callback) => callback(state));
  }
}

