import React from 'react';
import { Composition } from 'remotion';
import { Pilgrim } from './Pilgrim';
import { Chapter } from './Chapter';
import { getTotalFrames, getChapterFrameRange, FPS } from '../lib/timing';
import { CHAPTERS } from '../lib/constants';

export const RemotionRoot: React.FC = () => {
  const totalFrames = getTotalFrames(FPS);
  
  return (
    <>
      {/* Full composition */}
      <Composition
        id="ThePilgrim"
        component={Pilgrim}
        durationInFrames={totalFrames}
        fps={FPS}
        width={1080}
        height={1920}
      />
      
      {/* Individual chapter compositions for parallel rendering */}
      {CHAPTERS.map((_, index) => {
        const range = getChapterFrameRange(index, FPS);
        return (
          <Composition
            key={`Chapter${index}`}
            id={`Chapter${index}`}
            component={Chapter}
            durationInFrames={range.durationInFrames}
            fps={FPS}
            width={1080}
            height={1920}
            defaultProps={{ index }}
          />
        );
      })}
    </>
  );
};

