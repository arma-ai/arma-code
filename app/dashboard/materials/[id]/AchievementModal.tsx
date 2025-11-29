'use client';

import { Achievement } from '@/app/actions/achievements';

interface AchievementModalProps {
  achievement: Achievement;
  onClose: () => void;
}

export default function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl animate-bounce-in">
        <div className="text-center">
          <div className="text-6xl mb-4">{achievement.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Achievement Unlocked! 🎉
          </h2>
          <h3 className="text-xl font-semibold text-purple-600 mb-3">
            {achievement.name}
          </h3>
          <p className="text-gray-600 mb-6">
            {achievement.description}
          </p>
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            Отлично!
          </button>
        </div>
      </div>
    </div>
  );
}

