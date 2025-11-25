import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ChevronDown } from 'lucide-react';
import { Track } from '../types';

interface MusicInfoProps {
  tracks: Track[];
  colorTheme: {
    text: string;
    accent: string;
    bg: string;
  };
  movementTitle?: string;
}

export const MusicInfo: React.FC<MusicInfoProps> = ({ tracks, colorTheme, movementTitle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine if we're on a light background (movement 4)
  const isLightBg = colorTheme.bg.includes('white');
  const bgOpacity = isLightBg ? 'bg-white/80' : 'bg-black/40';
  const borderColor = isLightBg ? 'border-black/20' : 'border-white/10';
  const hoverBg = isLightBg ? 'hover:bg-black/5' : 'hover:bg-white/5';

  return (
    <motion.div
      className="absolute bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3, duration: 1 }}
    >
      <div className={`backdrop-blur-md ${bgOpacity} ${borderColor} border rounded-lg overflow-hidden shadow-lg ${colorTheme.text}`}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full px-4 py-3 flex items-center justify-between ${hoverBg} transition-colors`}
        >
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-3">
              <Music className={`w-4 h-4 ${colorTheme.accent}`} />
              <span className="text-sm font-medium uppercase tracking-wider">
                歌单：巨物的静默
              </span>
            </div>
            {movementTitle && (
              <span className={`text-xs ${isLightBg ? 'opacity-60' : 'opacity-70'} ml-7`}>
                {movementTitle}
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className={`w-4 h-4 ${isLightBg ? 'opacity-40' : 'opacity-60'}`} />
          </motion.div>
        </button>

        {/* Track List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className={`px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto ${isLightBg ? 'scrollbar-thin scrollbar-thumb-black/20' : 'scrollbar-thin scrollbar-thumb-white/20'}`}>
                {tracks.map((track, index) => (
                  <motion.div
                    key={index}
                    className={`pt-4 ${isLightBg ? 'border-t border-black/10' : 'border-t border-white/10'} first:border-t-0 first:pt-0`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="mb-2">
                      <div className={`text-sm font-semibold ${colorTheme.accent} mb-1`}>
                        {track.artist}
                      </div>
                      <div className={`text-xs ${isLightBg ? 'opacity-70' : 'opacity-90'} italic`}>
                        {track.title}
                      </div>
                    </div>
                    <p className={`text-xs ${isLightBg ? 'opacity-60' : 'opacity-70'} leading-relaxed mt-2`}>
                      {track.reason}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

