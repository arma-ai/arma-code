'use client';

import React from 'react';
import { motion } from 'motion/react';
import StarBorder from './library/StarBorder';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface HeroButtonProps {
  label: string;
  onClick?: () => void;
  color?: string;
  speed?: string;
  thickness?: number;
  mountDelay?: number;
  hoverScale?: number;
  className?: string;
}

/**
 * Animated hero CTA using React Bits StarBorder.
 * Respects reduced-motion users by toning down hover/mount effects.
 *
 * Example:
 * <HeroButton
 *   label="Get Started"
 *   color="#7C3AED"
 *   speed="5s"
 *   thickness={2}
 *   hoverScale={1.08}
 * />
 *
 * Page usage:
 * // app/page.tsx (excerpt)
 * import HeroButton from '@/components/reactbits/HeroButton';
 *
 * export default function HomePage() {
 *   return (
 *     <div className="flex flex-col items-center gap-6 py-16">
 *       <HeroButton label="Launch Quiz" onClick={() => router.push('/dashboard')} />
 *     </div>
 *   );
 * }
 */
const HeroButton: React.FC<HeroButtonProps> = ({
  label,
  onClick,
  color = '#22d3ee',
  speed = '6s',
  thickness = 1,
  mountDelay = 0.1,
  hoverScale = 1.06,
  className = ''
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: mountDelay, ease: 'easeOut' }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              scale: hoverScale,
              transition: { duration: 0.18, ease: 'easeOut' }
            }
      }
      className={className}
    >
      <StarBorder color={color} speed={speed} thickness={thickness} onClick={onClick}>
        {label}
      </StarBorder>
    </motion.div>
  );
};

export default HeroButton;
