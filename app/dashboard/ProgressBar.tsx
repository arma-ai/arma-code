'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMaterialProcessingStatus } from '@/app/actions/getProcessingStatus';

interface ProgressBarProps {
  materialId: string;
}

export default function ProgressBar({ materialId }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('Processing...');
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const checkProgress = async () => {
      try {
        const status = await getMaterialProcessingStatus(materialId);

        if (status.isComplete) {
          setProgress(100);
          setStatus('Complete');

          // Refresh the page to show the generated content
          router.refresh();

          clearInterval(interval);
          clearTimeout(timeout);
        } else {
          // Используем реальный прогресс из статуса
          setProgress(status.progress);

          if (status.hasFlashcards) {
            setStatus('Finalizing...');
          } else if (status.hasNotes) {
            setStatus('Generating flashcards...');
          } else if (status.hasSummary) {
            setStatus('Generating notes...');
          } else if (status.hasFullText) {
            setStatus('Generating summary...');
          } else {
            setStatus('Extracting text and transcribing...');
          }
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    };

    // Первая проверка сразу
    checkProgress();

    // Проверяем каждую секунду
    interval = setInterval(checkProgress, 1000);

    // Автоматически останавливаем через 5 минут
    timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [materialId, router]);

  // The user requested to hide this bar ("let it be in the background")
  // So we render nothing, but the polling logic above continues to run
  // and will refresh the page when complete.
  return null;
}
