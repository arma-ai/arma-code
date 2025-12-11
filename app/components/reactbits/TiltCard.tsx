'use client';

import React from 'react';
import TiltedCard, { type TiltedCardProps } from './library/TiltedCard';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface TiltCardProps extends TiltedCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
}

/**
 * 3D tilt card using React Bits TiltedCard with optional overlay content.
 *
 * Example:
 * <TiltCard
 *   imageSrc="/hero.jpg"
 *   captionText="Hover to explore"
 *   rotateAmplitude={10}
 *   scaleOnHover={1.12}
 *   badge="New"
 * />
 *
 * Page usage:
 * import TiltCard from '@/components/reactbits/TiltCard';
 *
 * export default function HomePage() {
 *   return (
 *     <div className="grid md:grid-cols-2 gap-10">
 *       <TiltCard
 *         imageSrc="/images/study.jpg"
 *         title="Adaptive Learning"
 *         subtitle="Cards tilt & react to cursor"
 *       />
 *     </div>
 *   );
 * }
 */
const TiltCard: React.FC<TiltCardProps> = ({
  title = '',
  subtitle = '',
  badge,
  rotateAmplitude = 14,
  scaleOnHover = 1.06,
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-col gap-4 text-gray-900">
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && <h3 className="text-xl font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      <TiltedCard
        {...props}
        rotateAmplitude={prefersReducedMotion ? 0 : rotateAmplitude}
        scaleOnHover={prefersReducedMotion ? 1 : scaleOnHover}
        displayOverlayContent={!prefersReducedMotion && Boolean(badge)}
        overlayContent={
          badge ? (
            <div className="px-3 py-1 bg-black/70 text-xs uppercase tracking-wide rounded-b-[15px] rounded-tr-[15px] text-white shadow-lg">
              {badge}
            </div>
          ) : null
        }
      />
    </div>
  );
};

export default TiltCard;
