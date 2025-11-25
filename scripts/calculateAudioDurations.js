import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Function to get audio duration using multiple methods
const getAudioDuration = async (filePath) => {
  // Method 1: Try using music-metadata if available
  try {
    const mm = require('music-metadata');
    const metadata = await mm.parseFile(filePath);
    if (metadata.format.duration && metadata.format.duration > 0) {
      return metadata.format.duration;
    }
  } catch (error) {
    // music-metadata not available or failed, try next method
  }
  
  // Method 2: Try using ffprobe if available
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const duration = parseFloat(output.trim());
    if (!isNaN(duration) && duration > 0) {
      return duration;
    }
  } catch (error) {
    // ffprobe not available or failed, try next method
  }
  
  // Method 3: Try using ffmpeg
  try {
    const output = execSync(
      `ffmpeg -i "${filePath}" 2>&1 | grep Duration | cut -d ' ' -f 4 | sed s/,//`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const timeStr = output.trim();
    if (timeStr) {
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        const hours = parseFloat(parts[0]) || 0;
        const minutes = parseFloat(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        const duration = hours * 3600 + minutes * 60 + seconds;
        if (duration > 0) {
          return duration;
        }
      }
    }
  } catch (error) {
    // ffmpeg method failed
  }
  
  // If all methods fail, return null
  console.warn(`Could not determine duration for ${filePath}`);
  return null;
};

// Read constants to get all audio file paths
const constantsPath = path.join(__dirname, '../constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');

// Extract audio file paths from constants
const audioFileRegex = /audioFile:\s*"([^"]+)"/g;
const audioFiles = [];
let match;

while ((match = audioFileRegex.exec(constantsContent)) !== null) {
  audioFiles.push(match[1]);
}

console.log(`Found ${audioFiles.length} audio files to process:`);
audioFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

// Calculate durations
const calculateDurations = async () => {
  const durations = {};
  const assetsDir = path.join(__dirname, '../assets');
  
  for (const audioFile of audioFiles) {
    const filePath = path.join(assetsDir, path.basename(audioFile));
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Audio file not found: ${filePath}`);
      durations[audioFile] = 180; // Fallback to default 3 minutes
      continue;
    }
    
    try {
      const duration = await getAudioDuration(filePath);
      if (duration === null || duration === undefined || duration <= 0) {
        console.warn(`⚠ ${path.basename(audioFile)}: Could not determine duration, using fallback 180s`);
        durations[audioFile] = 180; // Fallback to default 3 minutes
      } else {
        durations[audioFile] = duration;
        console.log(`✓ ${path.basename(audioFile)}: ${duration.toFixed(2)}s`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      durations[audioFile] = 180; // Fallback to default 3 minutes
    }
  }
  
  return durations;
};

// Main execution
(async () => {
  try {
    console.log('\nCalculating audio durations...\n');
    const durations = await calculateDurations();
    
    // Calculate chapter durations and total duration
    const CHAPTERS = [
      {
        tracks: [
          { audioFile: '/assets/a_01_01.mp3' },
          { audioFile: '/assets/a_01_02.mp3' },
          { audioFile: '/assets/a_01_03.mp3' },
        ]
      },
      {
        tracks: [
          { audioFile: '/assets/a_02_01.mp3' },
          { audioFile: '/assets/a_02_02.mp3' },
          { audioFile: '/assets/a_02_03.mp3' },
        ]
      },
      {
        tracks: [
          { audioFile: '/assets/a_03_01.mp3' },
          { audioFile: '/assets/a_03_02.mp3' },
        ]
      },
      {
        tracks: [
          { audioFile: '/assets/a_04_01.mp3' },
          { audioFile: '/assets/a_04_02.mp3' },
        ]
      },
    ];
    
    const chapterDurations = CHAPTERS.map((chapter, chapterIndex) => {
      const chapterDuration = chapter.tracks.reduce((sum, track) => {
        return sum + (durations[track.audioFile] || 180);
      }, 0);
      return chapterDuration;
    });
    
    const totalDuration = chapterDurations.reduce((sum, duration) => sum + duration, 0);
    
    // Create output object
    const output = {
      trackDurations: durations,
      chapterDurations,
      totalDuration,
      calculatedAt: new Date().toISOString(),
    };
    
    // Write to JSON file
    const outputPath = path.join(__dirname, '../audioDurations.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log('\n✓ Calculation complete!');
    console.log(`\nChapter durations:`);
    chapterDurations.forEach((duration, index) => {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      console.log(`  Chapter ${index + 1}: ${minutes}:${seconds.toString().padStart(2, '0')} (${duration.toFixed(2)}s)`);
    });
    console.log(`\nTotal duration: ${Math.floor(totalDuration / 60)}:${Math.floor(totalDuration % 60).toString().padStart(2, '0')} (${totalDuration.toFixed(2)}s)`);
    console.log(`\nResults saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

