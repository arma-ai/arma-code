'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { addXP } from '@/app/actions/progress';
import type { TutorMessage } from '@/app/actions/materials';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to .env.local file.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askAboutSelection(
  materialId: string,
  selectedText: string,
  userQuestion: string
): Promise<TutorMessage[]> {
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

  if (!selectedText || selectedText.trim().length === 0) {
    throw new Error('Selected text is empty');
  }

  if (!userQuestion || userQuestion.trim().length === 0) {
    throw new Error('Question is required');
  }

  // Сохранение вопроса пользователя
  const { data: userMessage, error: userMessageError } = await supabase
    .from('tutor_messages')
    .insert({
      material_id: materialId,
      role: 'user',
      content: userQuestion,
      context: 'selection',
    })
    .select()
    .single();

  if (userMessageError) {
    throw new Error(`Failed to save user message: ${userMessageError.message}`);
  }

  // Начисление XP за вопрос (4 XP) - начисляем сразу за вопрос
  try {
    await addXP(materialId, 4);
    // Проверяем достижения после начисления XP
    const { checkAchievements } = await import('@/app/actions/achievements');
    await checkAchievements(materialId);
  } catch (error) {
    console.error('Failed to add XP for selection question:', error);
  }

  // Генерация ответа на основе выделенного текста
  // Согласно инструкции: отвечай только на основе выделенного текста
  const systemPrompt = `You are an AI tutor. Your task is to answer questions based ONLY on the provided selected text.

CRITICAL RULES:
1. Answer ONLY using information from the selected text
2. Do NOT add any facts, information, or knowledge that is not in the selected text
3. If the answer is not in the selected text, respond EXACTLY: "В выделенном фрагменте нет ответа."
4. Do not make assumptions or inferences beyond what is explicitly stated in the text
5. Be precise and accurate`;

  const userPrompt = `Выделенный текст:\n"${selectedText}"\n\nВопрос: ${userQuestion}\n\nОтвечай только на основе выделенного текста. Если в выделенном тексте нет ответа — напиши: "В выделенном фрагменте нет ответа." Не добавляй фактов, которых нет в тексте.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Низкая температура для более точных ответов
    max_tokens: 1000,
  });

  let assistantResponse = response.choices[0]?.message?.content || '';
  
  // Если ответ пустой, используем стандартное сообщение
  if (!assistantResponse || assistantResponse.trim().length < 5) {
    assistantResponse = 'В выделенном фрагменте нет ответа.';
  }

  // Сохранение ответа ассистента
  const { data: assistantMessage, error: assistantError } = await supabase
    .from('tutor_messages')
    .insert({
      material_id: materialId,
      role: 'assistant',
      content: assistantResponse,
      context: 'selection',
    })
    .select()
    .single();

  if (assistantError) {
    throw new Error(`Failed to save assistant message: ${assistantError.message}`);
  }

  // Получение обновлённой истории сообщений
  const { data: allMessages } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  // Не используем revalidatePath для ускорения - обновление через события
  // revalidatePath(`/dashboard/materials/${materialId}`);
  
  return (allMessages || []) as TutorMessage[];
}
