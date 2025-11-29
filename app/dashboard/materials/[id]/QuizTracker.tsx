'use client';

import { useEffect, useRef } from 'react';
import { addXP } from '@/app/actions/progress';

interface QuizTrackerProps {
  materialId: string;
  quizLength: number;
}

export default function QuizTracker({ materialId, quizLength }: QuizTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current || quizLength === 0) return;

    async function trackQuizView() {
      try {
        // Начисление XP за завершение quiz (20 XP)
        await addXP(materialId, 20);
        window.dispatchEvent(new Event('progress-updated'));
        hasTracked.current = true;
      } catch (error) {
        console.error('Failed to track quiz view:', error);
      }
    }

    // Задержка для отслеживания просмотра всех вопросов
    const timer = setTimeout(trackQuizView, 2000);
    return () => clearTimeout(timer);
  }, [materialId, quizLength]);

  return null;
}

