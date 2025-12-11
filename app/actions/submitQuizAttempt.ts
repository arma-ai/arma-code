'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface QuizAnswer {
  questionId: string;
  selected: 'a' | 'b' | 'c' | 'd';
  correct: boolean;
  correctOption: 'a' | 'b' | 'c' | 'd';
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  material_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  answers: QuizAnswer[];
  completed_at: string;
  created_at: string;
}

export interface SubmitQuizAttemptParams {
  materialId: string;
  score: number;
  totalQuestions: number;
  answers: QuizAnswer[];
}

/**
 * Сохраняет результат прохождения quiz в БД
 */
export async function submitQuizAttempt({
  materialId,
  score,
  totalQuestions,
  answers,
}: SubmitQuizAttemptParams): Promise<{ success: boolean; attempt?: QuizAttempt; error?: string }> {
  try {
    const supabase = await createClient();

    // Проверка авторизации
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Валидация параметров
    if (!materialId || score < 0 || totalQuestions <= 0 || !answers || answers.length === 0) {
      return { success: false, error: 'Invalid parameters' };
    }

    // Проверка что материал принадлежит пользователю
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (materialError || !material) {
      return { success: false, error: 'Material not found or access denied' };
    }

    // Расчет процента
    const percentage = Math.round((score / totalQuestions) * 100);

    // Сохранение попытки
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        material_id: materialId,
        score,
        total_questions: totalQuestions,
        percentage,
        answers,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[submitQuizAttempt] Insert error:', insertError);
      return { success: false, error: `Failed to save quiz attempt: ${insertError.message}` };
    }

    // Обновить кэш страницы
    revalidatePath(`/dashboard/materials/${materialId}`);

    // Триггер проверки достижений
    // (вызывается из InteractiveQuiz через event)

    return { success: true, attempt: attempt as QuizAttempt };
  } catch (error) {
    console.error('[submitQuizAttempt] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
