import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { CHAPTERS } from '../lib/constants';
import { getAllChapterFrameRanges, FPS } from '../lib/timing';
import { Chapter } from './Chapter';

export const Pilgrim: React.FC = () => {
  const chapterRanges = getAllChapterFrameRanges(FPS);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {CHAPTERS.map((_, index) => {
        const range = chapterRanges[index];
        return (
          <Sequence
            key={`chapter-${index}`}
            from={range.from}
            durationInFrames={range.durationInFrames}
          >
            <Chapter index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

