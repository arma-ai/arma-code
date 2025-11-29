'use client';

import { useEffect, useRef } from 'react';
import { addXP } from '@/app/actions/progress';

interface ViewTrackerProps {
  materialId: string;
  xpAmount: number;
  trackOnce?: boolean;
}

export default function ViewTracker({ materialId, xpAmount, trackOnce = true }: ViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (trackOnce && hasTracked.current) return;

    async function trackView() {
      try {
        await addXP(materialId, xpAmount);
        window.dispatchEvent(new Event('progress-updated'));
        hasTracked.current = true;
      } catch (error) {
        // Игнорируем ошибки начисления XP
        console.error('Failed to track view:', error);
      }
    }

    // Небольшая задержка, чтобы убедиться, что элемент виден
    const timer = setTimeout(trackView, 1000);
    return () => clearTimeout(timer);
  }, [materialId, xpAmount, trackOnce]);

  return null;
}

