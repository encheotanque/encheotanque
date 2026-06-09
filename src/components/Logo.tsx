import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Logo component for Enche o Tanque.
 * Design: A gold location pin with a fuel nozzle cutout.
 * Features: Floating animation, Shimmer effect, and glow.
 */
export function Logo({ className = "", size = 'md' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-10 h-10' },
    md: { container: 'w-16 h-16' },
    lg: { container: 'w-32 h-32' }
  };

  const currentSize = sizes[size];

  return (
    <motion.div 
      className={`relative flex items-center justify-center ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`relative ${currentSize.container} flex items-center justify-center`}>
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          animate={{ 
            y: [0, -4, 0],
            scale: [1, 1.03, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          {/* Render the official Logo_maker_project.png */}
          <img 
            src="/Logo_maker_project.png" 
            className="w-full h-full object-contain" 
            alt="Enche o Tanque" 
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
