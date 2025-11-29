'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UserProgress {
  id: string;
  user_id: string;
  material_id: string;
  xp: number;
  level: number;
  streak: number;
  last_study_date: string | null;
  created_at: string;
  updated_at: string;
}

async function getOrCreateProgress(
  supabase: any,
  userId: string,
  materialId: string
): Promise<UserProgress> {
  // Проверяем существующий прогресс
  const { data: existing } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .single();

  if (existing) {
    return existing as UserProgress;
  }

  // Создаём новый прогресс
  const { data: newProgress, error } = await supabase
    .from('user_progress')
    .insert({
      user_id: userId,
      material_id: materialId,
      xp: 0,
      level: 1,
      streak: 0,
      last_study_date: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create progress: ${error.message}`);
  }

  return newProgress as UserProgress;
}

export async function addXP(materialId: string, amount: number): Promise<UserProgress> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Получаем или создаём прогресс
  const progress = await getOrCreateProgress(supabase, user.id, materialId);

  // Вычисляем новый уровень: floor(xp / 100) + 1
  const newXP = progress.xp + amount;
  const newLevel = Math.floor(newXP / 100) + 1;

  // Обновляем прогресс
  const { data: updated, error } = await supabase
    .from('user_progress')
    .update({
      xp: newXP,
      level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', progress.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update XP: ${error.message}`);
  }

  // Обновляем streak
  await updateStreak(materialId);

  // Проверяем достижения
  try {
    const { checkAchievements } = await import('@/app/actions/achievements');
    await checkAchievements(materialId);
  } catch (error) {
    // Игнорируем ошибки проверки достижений
    console.error('Failed to check achievements:', error);
  }

  revalidatePath(`/dashboard/materials/${materialId}`);
  return updated as UserProgress;
}

export async function updateStreak(materialId: string): Promise<UserProgress> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Получаем или создаём прогресс
  const progress = await getOrCreateProgress(supabase, user.id, materialId);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastStudyDate = progress.last_study_date;

  let newStreak = progress.streak;

  if (!lastStudyDate) {
    // Первое изучение
    newStreak = 1;
  } else {
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(today);
    const daysDiff = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      // Уже занимались сегодня - streak не меняется
      newStreak = progress.streak;
    } else if (daysDiff === 1) {
      // Продолжаем streak
      newStreak = progress.streak + 1;
    } else {
      // Пропустили день - сбрасываем streak
      newStreak = 1;
    }
  }

  // Обновляем streak и дату
  const { data: updated, error } = await supabase
    .from('user_progress')
    .update({
      streak: newStreak,
      last_study_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', progress.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update streak: ${error.message}`);
  }

  revalidatePath(`/dashboard/materials/${materialId}`);
  return updated as UserProgress;
}

export async function getUserProgress(materialId: string): Promise<UserProgress | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('material_id', materialId)
    .single();

  if (error || !data) {
    // Если прогресса нет, возвращаем null (будет создан при первом действии)
    return null;
  }

  return data as UserProgress;
}

