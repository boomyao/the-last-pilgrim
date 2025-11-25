import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getChapterBoundaries } from '../constants';

interface CascadingProgressBarProps {
  totalDuration: number; // Total duration in seconds
  currentProgress: number; // Current progress in seconds
  currentChapterIndex: number;
  colorTheme: {
    bg: string;
    text: string;
    accent: string;
  };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export const CascadingProgressBar: React.FC<CascadingProgressBarProps> = ({
  totalDuration,
  currentProgress,
  currentChapterIndex,
  colorTheme,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const progressPercentage = Math.min((currentProgress / totalDuration) * 100, 100);
  const chapterBoundaries = getChapterBoundaries();

  // Extract color from Tailwind classes
  const getColorFromTheme = (themeClass: string): string => {
    const colorMap: Record<string, string> = {
      'text-amber-500': '#f59e0b',
      'text-cyan-400': '#22d3ee',
      'text-white': '#ffffff',
      'text-slate-900': '#0f172a',
    };
    return colorMap[themeClass] || '#ffffff';
  };

  const accentColor = getColorFromTheme(colorTheme.accent);

  // Generate particles at the progress edge
  useEffect(() => {
    if (!containerRef.current) return;

    const generateParticle = (): Particle => {
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const progressX = (progressPercentage / 100) * containerWidth;
      
      return {
        id: particleIdRef.current++,
        x: progressX + (Math.random() - 0.5) * 20,
        y: -10,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5,
      };
    };

    // Generate new particles periodically
    const interval = setInterval(() => {
      if (progressPercentage > 0 && progressPercentage < 100) {
        setParticles((prev) => {
          const newParticles = [...prev, generateParticle()];
          // Keep only last 50 particles for performance
          return newParticles.slice(-50);
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [progressPercentage]);

  // Animate particles falling down
  useEffect(() => {
    const animate = () => {
      setParticles((prev) => {
        return prev
          .map((particle) => ({
            ...particle,
            y: particle.y + particle.speed,
            opacity: Math.max(0, particle.opacity - 0.01),
          }))
          .filter((particle) => particle.y < 200 && particle.opacity > 0);
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Create wave path for liquid effect
  const createWavePath = (width: number, height: number, offset: number): string => {
    const waveLength = 60;
    const amplitude = 4;
    let path = `M 0 ${height}`;
    
    // Start from bottom left
    path += ` L 0 ${height * 0.7}`;
    
    // Create wave along the top edge
    for (let x = 0; x <= width; x += 3) {
      const y = height * 0.7 + Math.sin((x / waveLength + offset) * Math.PI * 2) * amplitude;
      path += ` L ${x} ${Math.max(0, Math.min(height, y))}`;
    }
    
    // Close the path
    path += ` L ${width} ${height} Z`;
    return path;
  };

  const [waveOffset, setWaveOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveOffset((prev) => (prev + 0.03) % 2);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const containerWidthRef = useRef<number>(0);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        containerWidthRef.current = containerRef.current.offsetWidth;
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-50 h-10 pointer-events-none"
    >
      {/* Background bar with chapter color */}
      <motion.div
        className={`h-full w-full ${colorTheme.bg} opacity-20 transition-colors duration-1000`}
      />

      {/* Progress bar container */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden">
        {/* Base progress fill */}
        <motion.div
          className="h-full relative overflow-hidden"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: accentColor,
          }}
          transition={{ duration: 0.3, ease: 'linear' }}
        >
          {/* Liquid wave effect using SVG */}
          {containerWidthRef.current > 0 && progressPercentage > 0 && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${Math.max(100, containerWidthRef.current * (progressPercentage / 100))} 40`}
              preserveAspectRatio="none"
              style={{ mixBlendMode: 'overlay' }}
            >
              <defs>
                <linearGradient id={`waveGradient-${currentChapterIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
                  <stop offset="50%" stopColor={accentColor} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <motion.path
                d={createWavePath(Math.max(100, containerWidthRef.current * (progressPercentage / 100)), 40, waveOffset)}
                fill={`url(#waveGradient-${currentChapterIndex})`}
                animate={{
                  d: [
                    createWavePath(Math.max(100, containerWidthRef.current * (progressPercentage / 100)), 40, waveOffset),
                    createWavePath(Math.max(100, containerWidthRef.current * (progressPercentage / 100)), 40, waveOffset + 0.2),
                    createWavePath(Math.max(100, containerWidthRef.current * (progressPercentage / 100)), 40, waveOffset),
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </svg>
          )}

          {/* Gradient overlay for depth */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${accentColor}CC, ${accentColor}88, ${accentColor}66)`,
            }}
          />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}AA 50%, transparent 100%)`,
              width: '40%',
            }}
            animate={{
              x: ['-100%', '350%'],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Additional cascading effect - multiple layers */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at top, ${accentColor}FF 0%, transparent 70%)`,
              opacity: 0.6,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Particles falling effect */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: accentColor,
              opacity: particle.opacity,
              boxShadow: `0 0 ${particle.size * 2}px ${accentColor}`,
            }}
            initial={{ opacity: particle.opacity }}
            animate={{
              y: particle.y,
              opacity: particle.opacity,
            }}
          />
        ))}

        {/* Cascading droplets effect at the edge - multiple layers */}
        <motion.div
          className="absolute top-0"
          style={{
            left: `${progressPercentage}%`,
            width: '6px',
            height: '100%',
            background: `linear-gradient(to bottom, ${accentColor}FF, ${accentColor}88, transparent)`,
            boxShadow: `0 0 15px ${accentColor}, 0 0 30px ${accentColor}66`,
            filter: 'blur(1px)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
            scaleY: [1, 1.3, 1],
            x: [-2, 2, -2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Additional glow at the edge */}
        <motion.div
          className="absolute top-0"
          style={{
            left: `${progressPercentage}%`,
            width: '20px',
            height: '100%',
            background: `radial-gradient(ellipse at center, ${accentColor}88, transparent)`,
            transform: 'translateX(-50%)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Chapter markers */}
      {chapterBoundaries.slice(1, -1).map((boundary, index) => {
        const position = (boundary / totalDuration) * 100;
        return (
          <div
            key={index}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${position}%`,
              backgroundColor: colorTheme.text,
              opacity: 0.3,
            }}
          />
        );
        })}
    </div>
  );
};

