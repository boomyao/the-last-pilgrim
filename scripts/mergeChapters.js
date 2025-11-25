#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const chaptersDir = join(projectRoot, 'out', 'chapters');
const outputFile = join(projectRoot, 'out', 'pilgrim.mp4');

// Number of chapters
const NUM_CHAPTERS = 4;

/**
 * Check if ffmpeg is available
 */
function checkFFmpeg() {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', ['-version'], {
      stdio: 'ignore',
      shell: true,
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error('ffmpeg not found. Please install ffmpeg first.'));
      }
    });
    
    process.on('error', () => {
      reject(new Error('ffmpeg not found. Please install ffmpeg first.'));
    });
  });
}

/**
 * Create a file list for ffmpeg concat
 */
function createConcatFile() {
  const concatFile = join(projectRoot, 'out', 'chapters', 'concat.txt');
  const lines = [];
  
  for (let i = 0; i < NUM_CHAPTERS; i++) {
    const chapterFile = join(chaptersDir, `chapter${i}.mp4`);
    if (!existsSync(chapterFile)) {
      throw new Error(`Chapter file not found: ${chapterFile}`);
    }
    // Use absolute path for ffmpeg concat
    lines.push(`file '${chapterFile}'`);
  }
  
  writeFileSync(concatFile, lines.join('\n') + '\n', 'utf-8');
  return concatFile;
}

/**
 * Merge chapters using ffmpeg
 */
async function mergeChapters() {
  console.log('🔗 Merging chapters...\n');
  
  // Check if all chapter files exist
  console.log('📋 Checking chapter files...');
  for (let i = 0; i < NUM_CHAPTERS; i++) {
    const chapterFile = join(chaptersDir, `chapter${i}.mp4`);
    if (!existsSync(chapterFile)) {
      console.error(`❌ Chapter ${i} file not found: ${chapterFile}`);
      console.error('   Please run the render script first: npm run render-chapters');
      process.exit(1);
    }
    console.log(`   ✓ Chapter ${i}: ${chapterFile}`);
  }
  
  // Check ffmpeg
  try {
    await checkFFmpeg();
    console.log('   ✓ ffmpeg is available\n');
  } catch (error) {
    console.error(`❌ ${error.message}`);
    console.error('\nInstall ffmpeg:');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Linux: sudo apt-get install ffmpeg');
    console.error('   Windows: Download from https://ffmpeg.org/download.html');
    process.exit(1);
  }
  
  // Create concat file
  const concatFile = createConcatFile();
  console.log(`📝 Created concat file: ${concatFile}\n`);
  
  // Merge using ffmpeg
  console.log('🎬 Starting merge process...');
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c', 'copy', // Use stream copy for faster merging (no re-encoding)
      '-y', // Overwrite output file
      outputFile,
    ];
    
    const process = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    
    let stderr = '';
    
    process.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Show progress if available
      const timeMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        const hours = timeMatch[1];
        const minutes = timeMatch[2];
        const seconds = timeMatch[3];
        process.stdout.write(`\r⏳ Merging... ${hours}:${minutes}:${seconds}`);
      }
    });
    
    process.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        console.log(`\n\n✅ Merge completed successfully in ${duration}s!`);
        console.log(`📁 Output file: ${outputFile}`);
        resolve();
      } else {
        console.error(`\n❌ Merge failed with code ${code}`);
        console.error('ffmpeg stderr:', stderr);
        reject(new Error(`Merge failed with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      console.error(`\n❌ Process error:`, error.message);
      reject(error);
    });
  });
}

// Run the script
mergeChapters().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

