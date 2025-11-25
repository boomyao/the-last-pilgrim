import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Conjuring Reality..." }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <motion.div
        className="w-16 h-16 border-t-2 border-white rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <motion.p 
        className="mt-6 font-serif text-lg tracking-widest text-gray-400"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      >
        {message}
      </motion.p>
    </div>
  );
};