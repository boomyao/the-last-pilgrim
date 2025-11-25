import React from 'react';
import { motion } from 'framer-motion';

interface PilgrimProps {
  movement: number; // 1, 2, 3, or 4
}

export const Pilgrim: React.FC<PilgrimProps> = ({ movement }) => {
  // Different animations/poses based on the movement
  
  const variants = {
    walking: {
      x: [0, 10, 0],
      y: [0, -2, 0],
      transition: {
        x: { duration: 4, repeat: Infinity, ease: "linear" },
        y: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
      }
    },
    standing: {
      y: [0, -1, 0],
      opacity: [0.8, 1, 0.8],
      transition: { duration: 3, repeat: Infinity }
    },
    floating: {
      y: [0, -15, 5, 0],
      rotate: [0, 5, -5, 0],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
    },
    sitting: {
      y: 0,
      scale: [1, 0.98, 1],
      opacity: [1, 0.6, 0.4], // Fading away
      transition: { duration: 5, repeat: Infinity }
    }
  };

  const getVariant = () => {
    switch (movement) {
      case 1: return "walking";
      case 2: return "standing";
      case 3: return "floating";
      case 4: return "sitting";
      default: return "standing";
    }
  };

  return (
    <motion.div
      className="absolute bottom-[15%] left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
        <motion.div 
            animate={getVariant()}
            variants={variants}
            className="relative"
        >
            {/* The Silhouette SVG */}
            <svg 
                width="24" 
                height="48" 
                viewBox="0 0 24 48" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-8 md:w-6 md:h-12 lg:w-8 lg:h-16 ${movement === 4 ? 'fill-gray-500' : 'fill-black'}`}
            >
                {/* Simplified Human Shape */}
                <path d="M12 0C14.2091 0 16 1.79086 16 4C16 6.20914 14.2091 8 12 8C9.79086 8 8 6.20914 8 4C8 1.79086 9.79086 0 12 0ZM12 10C16.4183 10 20 13.5817 20 18V26C20 26.5523 19.5523 27 19 27H17V46C17 47.1046 16.1046 48 15 48H9C7.89543 48 7 47.1046 7 46V27H5C4.44772 27 4 26.5523 4 26V18C4 13.5817 7.58172 10 12 10Z" />
            </svg>
            
            {/* Shadow/Reflection */}
            {movement !== 3 && (
                <div className="absolute top-full left-0 w-full h-1 bg-black/30 blur-[2px] rounded-full transform scale-x-150" />
            )}
        </motion.div>
    </motion.div>
  );
};