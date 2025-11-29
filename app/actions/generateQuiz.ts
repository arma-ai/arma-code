'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { getMaterialNotes, getMaterialFullText } from './materials';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to .env.local file.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuizQuestion {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
}

async function generateQuizQuestions(text: string): Promise<QuizQuestion[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at creating educational quiz questions. Generate quiz questions in JSON format as an object with a "questions" array. Each question must have: question (text), option_a, option_b, option_c, option_d (all text), and correct_option (one of: "a", "b", "c", "d"). Generate at least 10 questions. The questions and answers MUST be in the same language as the source text provided. Return only valid JSON, no additional text.',
      },
      {
        role: 'user',
        content: `Create at least 10 multiple-choice quiz questions (with 4 options each) based on the following text. Ensure the language matches the text. Return as JSON object with "questions" array:\n\n${text.substring(0, 50000)}`, // Limit context
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    const questions = parsed.questions || [];
    return questions
      .filter((q: any) => q.question && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option)
      .map((q: any) => ({
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option.toLowerCase() as 'a' | 'b' | 'c' | 'd',
      }))
      .filter((q: QuizQuestion) => ['a', 'b', 'c', 'd'].includes(q.correct_option));
  } catch {
    return [];
  }
}

export async function generateQuiz(materialId: string) {
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Получение материала
  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (materialError || !material) {
    throw new Error('Material not found');
  }

  // Проверка, не создан ли уже quiz
  const { data: existingQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('material_id', materialId);

  if (existingQuiz && existingQuiz.length > 0) {
    // Вместо ошибки удаляем старый квиз, чтобы позволить перегенерацию
    const { error: deleteError } = await supabase
      .from('quizzes')
      .delete()
      .eq('material_id', materialId);

    if (deleteError) {
      console.error('Failed to delete existing quiz:', deleteError);
    }
  }

  // Try to get full text first, then notes
  let textToUse = await getMaterialFullText(materialId);

  if (!textToUse || textToUse.trim().length === 0) {
    const { data: notes } = await supabase
      .from('material_notes')
      .select('notes')
      .eq('material_id', materialId)
      .single();

    if (notes && notes.notes) {
      textToUse = notes.notes;
    }
  }

  if (!textToUse || textToUse.trim().length === 0) {
    throw new Error('No content available for generating quiz. Please process the material with AI first.');
  }

  // Генерация вопросов
  const questions = await generateQuizQuestions(textToUse);

  if (questions.length === 0) {
    throw new Error('Failed to generate quiz questions');
  }

  // Сохранение вопросов
  const { error: insertError } = await supabase.from('quizzes').insert(
    questions.map((q) => ({
      material_id: materialId,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
    }))
  );

  if (insertError) {
    throw new Error(`Failed to save quiz: ${insertError.message}`);
  }

  revalidatePath(`/dashboard/materials/${materialId}`);
  return { success: true, count: questions.length };
}
