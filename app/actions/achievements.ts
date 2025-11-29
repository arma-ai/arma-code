'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  material_id: string | null;
  unlocked_at: string;
  achievement?: Achievement;
}

async function getUserProgressStats(supabase: any, userId: string, materialId?: string) {
  // Общий прогресс пользователя
  const { data: allProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);

  // Статистика по материалам
  let totalXP = 0;
  let maxLevel = 0;
  let maxStreak = 0;
  let firstXP = false;

  if (allProgress && allProgress.length > 0) {
    totalXP = allProgress.reduce((sum: number, p: any) => sum + p.xp, 0);
    maxLevel = Math.max(...allProgress.map((p: any) => p.level));
    maxStreak = Math.max(...allProgress.map((p: any) => p.streak));
    firstXP = allProgress.some((p: any) => p.xp > 0);
  }

  // Прогресс по конкретному материалу (если указан)
  let materialProgress = null;
  if (materialId) {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .single();
    materialProgress = progress;
  }

  // Количество просмотренных flashcards
  const { data: flashcards } = await supabase
    .from('flashcards')
    .select('material_id')
    .in('material_id', allProgress?.map((p: any) => p.material_id) || []);

  const flashcardsViewed = flashcards?.length || 0;

  // Количество пройденных quiz
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('material_id')
    .in('material_id', allProgress?.map((p: any) => p.material_id) || []);

  const quizCompleted = new Set(quizzes?.map((q: any) => q.material_id) || []).size;

  // Количество сообщений в tutor chat
  // Получаем материалы пользователя и считаем сообщения в них
  const userMaterialIds = allProgress?.map((p: any) => p.material_id) || [];
  let tutorMessages = 0;
  if (userMaterialIds.length > 0) {
    const { data: messages } = await supabase
      .from('tutor_messages')
      .select('role')
      .in('material_id', userMaterialIds)
      .eq('role', 'user');
    tutorMessages = messages?.length || 0;
  }

  // Quiz score (пока упрощённо - считаем что если есть quiz, то можно проверить)
  // В реальности нужно хранить результаты прохождения quiz
  const quizScore = null; // TODO: добавить систему подсчета quiz score

  return {
    firstXP,
    maxStreak,
    maxLevel,
    flashcardsViewed,
    quizCompleted,
    tutorMessages,
    quizScore,
    materialProgress,
  };
}

export async function checkAchievements(materialId?: string): Promise<UserAchievement[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Получаем все достижения
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*');

  if (!allAchievements || allAchievements.length === 0) {
    return [];
  }

  // Получаем уже полученные достижения пользователя
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id);

  const unlockedAchievementIds = new Set(
    userAchievements?.map((ua: any) => ua.achievement_id) || []
  );

  // Получаем статистику пользователя
  const stats = await getUserProgressStats(supabase, user.id, materialId);

  // Проверяем каждое достижение
  const newAchievements: UserAchievement[] = [];

  for (const achievement of allAchievements) {
    // Пропускаем уже полученные
    if (unlockedAchievementIds.has(achievement.id)) {
      continue;
    }

    let conditionMet = false;

    switch (achievement.condition_type) {
      case 'first_xp':
        conditionMet = stats.firstXP;
        break;

      case 'streak':
        if (achievement.condition_value) {
          conditionMet = stats.maxStreak >= achievement.condition_value;
        }
        break;

      case 'level':
        if (achievement.condition_value) {
          conditionMet = stats.maxLevel >= achievement.condition_value;
        }
        break;

      case 'flashcards_viewed':
        if (achievement.condition_value) {
          conditionMet = stats.flashcardsViewed >= achievement.condition_value;
        }
        break;

      case 'quiz_completed':
        if (achievement.condition_value) {
          conditionMet = stats.quizCompleted >= achievement.condition_value;
        }
        break;

      case 'quiz_score':
        // TODO: реализовать проверку quiz score
        // Пока пропускаем
        break;

      case 'tutor_messages':
        if (achievement.condition_value) {
          conditionMet = stats.tutorMessages >= achievement.condition_value;
        }
        break;
    }

    if (conditionMet) {
      // Создаём запись о получении достижения
      const { data: newAchievement, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievement.id,
          material_id: materialId || null,
        })
        .select()
        .single();

      if (!error && newAchievement) {
        newAchievements.push({
          ...newAchievement,
          achievement,
        } as UserAchievement);
      }
    }
  }

  if (newAchievements.length > 0) {
    revalidatePath(materialId ? `/dashboard/materials/${materialId}` : '/dashboard/profile');
  }

  return newAchievements;
}

export async function getUserAchievements(materialId?: string): Promise<UserAchievement[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', user.id);

  if (materialId) {
    query = query.eq('material_id', materialId);
  }

  const { data, error } = await query.order('unlocked_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as UserAchievement[];
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return (data || []) as Achievement[];
}

