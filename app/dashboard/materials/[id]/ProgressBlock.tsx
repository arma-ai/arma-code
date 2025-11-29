'use client';

import { useEffect, useState } from 'react';
import { getUserProgress } from '@/app/actions/progress';
import type { UserProgress } from '@/app/actions/progress';

interface ProgressBlockProps {
  materialId: string;
  initialProgress: UserProgress | null;
}

export default function ProgressBlock({ materialId, initialProgress }: ProgressBlockProps) {
  const [progress, setProgress] = useState<UserProgress | null>(initialProgress);

  // Обновляем прогресс при изменении materialId
  useEffect(() => {
    async function loadProgress() {
      const updated = await getUserProgress(materialId);
      setProgress(updated);
    }
    loadProgress();
  }, [materialId]);

  // Подписка на обновления через событие
  useEffect(() => {
    const handleProgressUpdate = () => {
      getUserProgress(materialId).then(setProgress);
    };

    window.addEventListener('progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('progress-updated', handleProgressUpdate);
  }, [materialId]);

  if (!progress) {
    return (
      <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
        <h3 className="text-2xl font-bold text-black mb-4">Progress</h3>
        <p className="text-gray-600 text-sm">Start studying the material to earn XP!</p>
      </div>
    );
  }

  const currentLevelXP = progress.xp % 100;
  const nextLevelXP = 100;
  const progressPercentage = (currentLevelXP / nextLevelXP) * 100;

  return (
    <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
      <h3 className="text-2xl font-bold text-black mb-6">Progress</h3>
      
      <div className="space-y-6">
        {/* Level и XP */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Level</p>
            <p className="text-3xl font-bold text-black">Level {progress.level}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">XP</p>
            <p className="text-3xl font-bold text-black">{progress.xp}</p>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>{currentLevelXP} / {nextLevelXP} XP</span>
            <span>To next level: {nextLevelXP - currentLevelXP} XP</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="bg-black h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="pt-4 border-t border-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Streak</p>
              <p className="text-2xl font-bold text-black">
                {progress.streak} {progress.streak === 1 ? 'day' : 'days'}
              </p>
            </div>
            {progress.last_study_date && (
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Last study:
                </p>
                <p className="text-xs text-black">
                  {new Date(progress.last_study_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

