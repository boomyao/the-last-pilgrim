#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const outputDir = join(projectRoot, 'out', 'chapters');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Number of chapters (adjust based on your project)
const NUM_CHAPTERS = 4;

// Concurrency for each chapter render (can be adjusted)
const CONCURRENCY = 10;

// Render options
const renderOptions = {
  codec: 'h264',
  crf: '23',
  pixelFormat: 'yuv420p',
};

/**
 * Render a single chapter
 */
function renderChapter(chapterIndex) {
  return new Promise((resolve, reject) => {
    const outputFile = join(outputDir, `chapter${chapterIndex}.mp4`);
    const compositionId = `Chapter${chapterIndex}`;
    
    console.log(`[Chapter ${chapterIndex}] Starting render...`);
    const startTime = Date.now();
    
    const args = [
      'render',
      'src/remotion/index.ts',
      compositionId,
      outputFile,
      '--concurrency', String(CONCURRENCY),
      '--codec', renderOptions.codec,
      '--crf', renderOptions.crf,
      '--pixel-format', renderOptions.pixelFormat,
    ];
    
    const process = spawn('npx', ['remotion', ...args], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Extract progress information if available
      const progressMatch = output.match(/Rendering frames.*?(\d+)\/(\d+)/);
      if (progressMatch) {
        const current = parseInt(progressMatch[1]);
        const total = parseInt(progressMatch[2]);
        const percent = ((current / total) * 100).toFixed(1);
        process.stdout.write(`\r[Chapter ${chapterIndex}] Progress: ${percent}% (${current}/${total})`);
      }
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        console.log(`\n[Chapter ${chapterIndex}] ✓ Completed in ${duration}s`);
        resolve({ chapterIndex, outputFile, duration });
      } else {
        console.error(`\n[Chapter ${chapterIndex}] ✗ Failed with code ${code}`);
        console.error(`[Chapter ${chapterIndex}] stderr:`, stderr);
        reject(new Error(`Chapter ${chapterIndex} render failed with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      console.error(`\n[Chapter ${chapterIndex}] ✗ Process error:`, error.message);
      reject(error);
    });
  });
}

/**
 * Render all chapters in parallel
 */
async function renderAllChapters() {
  console.log('🚀 Starting parallel chapter rendering...');
  console.log(`📊 Chapters: ${NUM_CHAPTERS}`);
  console.log(`⚡ Concurrency per chapter: ${CONCURRENCY}`);
  console.log(`📁 Output directory: ${outputDir}\n`);
  
  const startTime = Date.now();
  const chapterPromises = [];
  
  // Create render promises for all chapters
  for (let i = 0; i < NUM_CHAPTERS; i++) {
    chapterPromises.push(renderChapter(i));
  }
  
  try {
    // Wait for all chapters to complete
    const results = await Promise.all(chapterPromises);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All chapters rendered successfully!');
    console.log('='.repeat(60));
    console.log(`⏱️  Total time: ${totalDuration}s`);
    console.log('\n📋 Rendered files:');
    results.forEach(({ chapterIndex, outputFile, duration }) => {
      console.log(`   Chapter ${chapterIndex}: ${outputFile} (${duration}s)`);
    });
    console.log('\n💡 Next step: Run the merge script to combine chapters:');
    console.log('   npm run merge-chapters');
    
    return results;
  } catch (error) {
    console.error('\n❌ Error during parallel rendering:', error.message);
    process.exit(1);
  }
}

// Run the script
renderAllChapters().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

