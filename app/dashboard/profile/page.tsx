import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllAchievements, getUserAchievements } from '@/app/actions/achievements';
import { signOut } from '@/app/actions/auth';
import type { Achievement, UserAchievement } from '@/app/actions/achievements';
import Link from 'next/link';
import Sidebar from '../Sidebar';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Получаем профиль
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Получаем все достижения
  const allAchievements = await getAllAchievements();

  // Получаем достижения пользователя
  const userAchievements = await getUserAchievements();

  const unlockedAchievementIds = new Set(
    userAchievements.map((ua) => ua.achievement_id)
  );

  // Группируем достижения по категориям
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">Profile</h1>
            <p className="text-lg text-gray-600">Manage your account and view achievements</p>
          </div>

          <div className="grid gap-8">
            {/* User Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Full Name</p>
                  <p className="text-lg text-black font-medium border-b border-gray-100 pb-2">
                    {profile?.full_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Email Address</p>
                  <p className="text-lg text-black font-medium border-b border-gray-100 pb-2">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Achievements Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-black">Achievements</h2>
                <div className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium">
                  {unlockedCount} / {totalCount} Unlocked
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allAchievements.map((achievement) => {
                  const isUnlocked = unlockedAchievementIds.has(achievement.id);
                  const userAch = userAchievements.find(
                    (ua) => ua.achievement_id === achievement.id
                  );

                  return (
                    <div
                      key={achievement.id}
                      className={`p-6 rounded-lg border transition-all ${isUnlocked
                          ? 'border-black bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-black text-sm">{achievement.name}</h3>
                            {isUnlocked && (
                              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-3 leading-relaxed">{achievement.description}</p>
                          {isUnlocked && userAch && (
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                              Unlocked {new Date(userAch.unlocked_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
