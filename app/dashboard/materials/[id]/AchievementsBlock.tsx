'use client';

import { useEffect, useState } from 'react';
import { getAllAchievements, getUserAchievements, checkAchievements } from '@/app/actions/achievements';
import type { Achievement, UserAchievement } from '@/app/actions/achievements';
import AchievementModal from './AchievementModal';

interface AchievementsBlockProps {
  materialId: string;
}

export default function AchievementsBlock({ materialId }: AchievementsBlockProps) {
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAchievement, setNewAchievement] = useState<UserAchievement | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const [achievements, userAch] = await Promise.all([
          getAllAchievements(),
          getUserAchievements(materialId),
        ]);
        console.log('Loaded achievements:', achievements.length);
        console.log('User achievements:', userAch.length);
        setAllAchievements(achievements);
        setUserAchievements(userAch);
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, [materialId]);

  // Проверка достижений при обновлении прогресса
  useEffect(() => {
    const handleProgressUpdate = async () => {
      try {
        const newAch = await checkAchievements(materialId);
        if (newAch.length > 0) {
          setNewAchievement(newAch[0]);
          setShowModal(true);
          // Обновляем список достижений
          const updated = await getUserAchievements(materialId);
          setUserAchievements(updated);
        }
      } catch (error) {
        console.error('Failed to check achievements:', error);
      }
    };

    window.addEventListener('progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('progress-updated', handleProgressUpdate);
  }, [materialId]);

  const unlockedAchievementIds = new Set(
    userAchievements.map((ua) => ua.achievement_id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
        <h3 className="text-2xl font-bold text-black mb-4">Achievements</h3>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (allAchievements.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
        <h3 className="text-2xl font-bold text-black mb-4">Achievements</h3>
        <p className="text-gray-600 text-sm">
          No achievements found. Please run the populate-achievements.sql script in Supabase SQL Editor.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
        <h3 className="text-2xl font-bold text-black mb-6">Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {allAchievements.map((achievement) => {
            const isUnlocked = unlockedAchievementIds.has(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all shadow-md ${
                  isUnlocked
                    ? 'border-black bg-white'
                    : 'border-black/20 bg-gray-50 opacity-60'
                }`}
                title={achievement.description}
              >
                <div className="text-2xl mb-2 font-bold">{achievement.icon}</div>
                <div className="text-xs font-semibold text-center text-black">
                  {achievement.name}
                </div>
                {isUnlocked ? (
                  <div className="text-black text-xs mt-2 font-bold">✓</div>
                ) : (
                  <div className="text-gray-400 text-xs mt-2">Locked</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && newAchievement && (
        <AchievementModal
          achievement={newAchievement.achievement || allAchievements.find(a => a.id === newAchievement.achievement_id)!}
          onClose={() => {
            setShowModal(false);
            setNewAchievement(null);
          }}
        />
      )}
    </>
  );
}

