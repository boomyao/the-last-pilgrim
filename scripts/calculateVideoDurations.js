import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to get video duration using ffprobe
const getVideoDuration = (filePath) => {
  // Method 1: Try using ffprobe (most reliable)
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
  
  // Method 2: Try using ffmpeg
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

// Read constants to get all video file paths
const constantsPath = path.join(__dirname, '../src/lib/constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');

// Extract video file paths from constants (looking for video: "XX.mp4")
const videoFileRegex = /video:\s*"([^"]+\.mp4)"/g;
const videoFiles = [];
let match;

while ((match = videoFileRegex.exec(constantsContent)) !== null) {
  videoFiles.push(match[1]);
}

console.log(`Found ${videoFiles.length} video files to process:`);
videoFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

// Calculate durations
const calculateDurations = () => {
  const durations = {};
  const publicDir = path.join(__dirname, '../public');
  
  for (const videoFile of videoFiles) {
    const filePath = path.join(publicDir, path.basename(videoFile));
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Video file not found: ${filePath}`);
      durations[videoFile] = 30; // Fallback to default 30 seconds
      continue;
    }
    
    try {
      const duration = getVideoDuration(filePath);
      if (duration === null || duration === undefined || duration <= 0) {
        console.warn(`⚠ ${path.basename(videoFile)}: Could not determine duration, using fallback 30s`);
        durations[videoFile] = 30; // Fallback to default 30 seconds
      } else {
        durations[videoFile] = duration;
        console.log(`✓ ${path.basename(videoFile)}: ${duration.toFixed(2)}s`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      durations[videoFile] = 30; // Fallback to default 30 seconds
    }
  }
  
  return durations;
};

// Main execution
try {
  console.log('\nCalculating video durations...\n');
  const durations = calculateDurations();
  
  // Create output object
  const output = {
    videoDurations: durations,
    calculatedAt: new Date().toISOString(),
  };
  
  // Write to JSON file
  const outputPath = path.join(__dirname, '../videoDurations.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log('\n✓ Calculation complete!');
  console.log(`\nVideo durations:`);
  Object.entries(durations).forEach(([file, duration]) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    console.log(`  ${file}: ${minutes}:${seconds.toString().padStart(2, '0')} (${duration.toFixed(2)}s)`);
  });
  console.log(`\nResults saved to: ${outputPath}`);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

