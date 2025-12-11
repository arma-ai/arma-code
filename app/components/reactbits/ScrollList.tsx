'use client';

import React from 'react';
import AnimatedList, { type AnimatedListProps } from './library/AnimatedList';

export interface ScrollListProps extends AnimatedListProps {
  title?: string;
  description?: string;
}

/**
 * Scroll-reveal list built on React Bits AnimatedList.
 *
 * Example:
 * <ScrollList
 *   title="Recent Materials"
 *   description="Auto-reveals items as they enter the viewport."
 *   items={['Physics', 'Chemistry', 'History']}
 *   itemDelay={0.05}
 *   itemDuration={0.25}
 *   onItemSelect={(item) => console.log(item)}
 * />
 *
 * Page usage:
 * import ScrollList from '@/components/reactbits/ScrollList';
 *
 * export default function HomePage() {
 *   return (
 *     <section className="py-12">
 *       <ScrollList title="Modules" items={['Algebra', 'Geometry', 'Calculus']} />
 *     </section>
 *   );
 * }
 */
const ScrollList: React.FC<ScrollListProps> = ({
  title,
  description,
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
          {description && <p className="text-sm text-gray-300">{description}</p>}
        </div>
      )}

      <AnimatedList {...props} />
    </div>
  );
};

export default ScrollList;
