import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

type Intensity = 'sm' | 'md' | 'lg' | 'none';

interface LiquidGlassCardProps extends HTMLMotionProps<'div'> {
  className?: string;
  glowIntensity?: Intensity;
  shadowIntensity?: Intensity;
  blurIntensity?: Intensity;
  borderRadius?: string;
}

const getBlurClass = (intensity: Intensity) => {
  switch (intensity) {
    case 'sm': return 'backdrop-blur-md';
    case 'md': return 'backdrop-blur-xl';
    case 'lg': return 'backdrop-blur-2xl';
    case 'none': return 'backdrop-blur-none';
    default: return 'backdrop-blur-xl';
  }
};

const getShadowClass = (intensity: Intensity) => {
  switch (intensity) {
    case 'sm': return 'shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]';
    case 'md': return 'shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] shadow-[inset_0_2px_2px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.4)]';
    case 'lg': return 'shadow-[0_24px_64px_0_rgba(0,0,0,0.7)] shadow-[inset_0_3px_6px_rgba(255,255,255,0.6),inset_0_-3px_8px_rgba(0,0,0,0.6)]';
    case 'none': return 'shadow-none';
    default: return 'shadow-md';
  }
};

const getGlowClass = (intensity: Intensity) => {
  switch (intensity) {
    case 'sm': return 'before:bg-gradient-to-br before:from-white/10 before:to-transparent';
    case 'md': return 'before:bg-gradient-to-br before:from-white/20 before:via-white/5 before:to-transparent';
    case 'lg': return 'before:bg-gradient-to-br before:from-white/30 before:via-white/10 before:to-transparent';
    case 'none': return 'before:hidden';
    default: return 'before:bg-white/5';
  }
};

export const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  (
    {
      className,
      children,
      glowIntensity = 'md',
      shadowIntensity = 'md',
      blurIntensity = 'md',
      borderRadius = '24px',
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        style={{ borderRadius }}
        className={cn(
          'relative overflow-hidden',
          'bg-white/5 border border-white/20 dark:bg-black/20 dark:border-white/10',
          'before:absolute before:inset-0 before:pointer-events-none before:z-0',
          getBlurClass(blurIntensity),
          getShadowClass(shadowIntensity),
          getGlowClass(glowIntensity),
          className
        )}
        {...props}
      >
        {/* Shine highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-10 opacity-50 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent z-10 opacity-50 pointer-events-none" />
        
        {/* Content wrapper */}
        <div className="relative z-10 h-full w-full">
          {children as React.ReactNode}
        </div>
      </motion.div>
    );
  }
);

LiquidGlassCard.displayName = 'LiquidGlassCard';
