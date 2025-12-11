'use server';

import { createClient } from '@/lib/supabase/server';
import { QuizAttempt } from './submitQuizAttempt';

export interface QuizStatistics {
  totalAttempts: number;
  bestScore: number;
  bestPercentage: number;
  averageScore: number;
  averagePercentage: number;
  lastAttempt: QuizAttempt | null;
  attempts: QuizAttempt[];
}

/**
 * Получает статистику по всем попыткам прохождения quiz для материала
 */
export async function getQuizStatistics(materialId: string): Promise<QuizStatistics | null> {
  try {
    const supabase = await createClient();

    // Проверка авторизации
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Получение всех попыток пользователя для этого материала
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('material_id', materialId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('[getQuizStatistics] Error:', error);
      return null;
    }

    if (!attempts || attempts.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        bestPercentage: 0,
        averageScore: 0,
        averagePercentage: 0,
        lastAttempt: null,
        attempts: [],
      };
    }

    // Расчет статистики
    const totalAttempts = attempts.length;
    const bestScore = Math.max(...attempts.map((a) => a.score));
    const bestPercentage = Math.max(...attempts.map((a) => a.percentage));
    const averageScore = Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts);
    const averagePercentage = Math.round(
      attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
    );
    const lastAttempt = attempts[0] as QuizAttempt; // Уже отсортировано по убыванию

    return {
      totalAttempts,
      bestScore,
      bestPercentage,
      averageScore,
      averagePercentage,
      lastAttempt,
      attempts: attempts as QuizAttempt[],
    };
  } catch (error) {
    console.error('[getQuizStatistics] Unexpected error:', error);
    return null;
  }
}

/**
 * Получает лучший процент по quiz для пользователя (для achievements)
 * Возвращает максимальный процент среди всех попыток пользователя
 */
export async function getBestQuizPercentage(materialId?: string): Promise<number> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    let query = supabase
      .from('quiz_attempts')
      .select('percentage')
      .eq('user_id', user.id);

    // Если указан materialId, ищем только по нему
    if (materialId) {
      query = query.eq('material_id', materialId);
    }

    const { data: attempts, error } = await query;

    if (error || !attempts || attempts.length === 0) {
      return 0;
    }

    return Math.max(...attempts.map((a) => a.percentage));
  } catch (error) {
    console.error('[getBestQuizPercentage] Unexpected error:', error);
    return 0;
  }
}

/**
 * Получает среднюю оценку по всем quiz для пользователя (для достижений)
 */
export async function getAverageQuizPercentage(): Promise<number> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('percentage')
      .eq('user_id', user.id);

    if (error || !attempts || attempts.length === 0) {
      return 0;
    }

    const sum = attempts.reduce((total, a) => total + a.percentage, 0);
    return Math.round(sum / attempts.length);
  } catch (error) {
    console.error('[getAverageQuizPercentage] Unexpected error:', error);
    return 0;
  }
}
