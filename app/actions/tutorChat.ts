'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import type { TutorMessage } from '@/app/actions/materials';
import { addXP } from '@/app/actions/progress';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to .env.local file.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getTutorMessages(materialId: string): Promise<TutorMessage[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  return (data || []) as TutorMessage[];
}

export async function sendTutorMessage(
  materialId: string,
  userPrompt: string
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

  // Сохранение вопроса пользователя
  const { data: userMessage, error: userMessageError } = await supabase
    .from('tutor_messages')
    .insert({
      material_id: materialId,
      role: 'user',
      content: userPrompt,
      context: 'chat', // Указываем контекст для обычного чата
    })
    .select()
    .single();

  if (userMessageError) {
    throw new Error(`Failed to save user message: ${userMessageError.message}`);
  }

  // Начисление XP за вопрос (3 XP)
  try {
    await addXP(materialId, 3);
  } catch (error) {
    // Игнорируем ошибки начисления XP
    console.error('Failed to add XP for question:', error);
  }

  // Получение embeddings для поиска релевантных чанков
  const { data: allEmbeddings, error: embeddingsError } = await supabase
    .from('material_embeddings')
    .select('*')
    .eq('material_id', materialId);

  if (embeddingsError || !allEmbeddings || allEmbeddings.length === 0) {
    // Если embeddings нет, сохраняем сообщение что материал не обработан
    const { data: assistantMessage } = await supabase
      .from('tutor_messages')
      .insert({
        material_id: materialId,
        role: 'assistant',
        content: 'В документе нет ответа. Материал еще не обработан. Пожалуйста, сначала обработайте материал с помощью AI.',
        context: 'chat', // Указываем контекст для обычного чата
      })
      .select()
      .single();

    revalidatePath(`/dashboard/materials/${materialId}`);
    return assistantMessage ? [userMessage, assistantMessage] : [userMessage];
  }

  // Создание embedding для вопроса пользователя
  const questionEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: userPrompt,
  });

  const questionVector = questionEmbedding.data[0].embedding;

  // Поиск релевантных чанков через cosine similarity
  // Используем более низкий threshold (0.5 вместо 0.7) для более гибкого поиска
  const { data: relevantChunks, error: searchError } = await supabase.rpc(
    'match_material_chunks',
    {
      query_embedding: questionVector,
      match_material_id: materialId,
      match_threshold: 0.5, // Понижен с 0.7 до 0.5 для более гибкого поиска
      match_count: 5,
    }
  );

  // Если функция RPC не существует или возвращает ошибку, используем fallback
  let contextChunks: string[] = [];
  if (searchError || !relevantChunks || relevantChunks.length === 0) {
    console.log('RPC search failed or returned no results, using fallback. Error:', searchError?.message);
    // Fallback: используем первые несколько чанков (они все равно содержат информацию о материале)
    contextChunks = allEmbeddings
      .slice(0, 5)
      .map((e) => e.chunk_text)
      .filter((text) => text && text.length > 0);
    console.log('Fallback chunks found:', contextChunks.length);
  } else {
    contextChunks = relevantChunks.map((chunk: any) => chunk.chunk_text).filter(Boolean);
    console.log('Relevant chunks found via RPC:', contextChunks.length);
  }

  // Если все еще нет чанков, используем ВСЕ доступные чанки (лучше что-то, чем ничего)
  if (contextChunks.length === 0) {
    console.log('No chunks found, using all available embeddings');
    contextChunks = allEmbeddings
      .map((e) => e.chunk_text)
      .filter((text) => text && text.length > 0)
      .slice(0, 10); // Используем до 10 чанков
  }

  // Если действительно нет никаких данных
  if (contextChunks.length === 0) {
    const { data: assistantMessage } = await supabase
      .from('tutor_messages')
      .insert({
        material_id: materialId,
        role: 'assistant',
        content: 'В документе нет ответа. Материал еще не обработан или не содержит текста. Пожалуйста, сначала обработайте материал с помощью AI.',
        context: 'chat', // Указываем контекст для обычного чата
      })
      .select()
      .single();

    revalidatePath(`/dashboard/materials/${materialId}`);
    return assistantMessage ? [userMessage, assistantMessage] : [userMessage];
  }

  // Формирование контекста из релевантных чанков
  const context = contextChunks.join('\n\n');

  // Получение истории сообщений для контекста (последние 10)
  const { data: messageHistory } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('material_id', materialId)
    .neq('id', userMessage.id) // Исключаем текущее сообщение
    .order('created_at', { ascending: false }) // Сначала новые
    .limit(10);

  // Формирование промпта для GPT
  const systemPrompt = `You are an expert AI tutor helping students learn from educational materials.
Your primary goal is to help the student understand the material.

INSTRUCTIONS:
1. **Answer based on the provided document context.** This is your main source of truth.
2. **Be conversational and helpful.** If the user says "Hello" or asks "How are you?", respond politely and ask how you can help with the material. Do NOT say "The document does not contain an answer" to greetings.
3. **Use general knowledge to supplement.** If the context is missing specific details but you know the answer from general knowledge, you MAY provide it, but you MUST explicitly state: "This information is not in the document, but generally..." or similar.
4. **Handle unrelated questions gracefully.** If the question is completely unrelated to the material (e.g., "What is the weather?"), politely decline and steer back to the material.
5. **Be detailed and educational.** Explain concepts clearly.

Document Context is provided in the user's last message. Use it to answer the student's question.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Добавление истории сообщений (в хронологическом порядке)
  if (messageHistory && messageHistory.length > 0) {
    // messageHistory сейчас от новых к старым, нужно развернуть
    const history = [...messageHistory].reverse();
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
  }

  // Добавляем текущий вопрос с контекстом
  messages.push({
    role: 'user',
    content: `Document context:\n\n${context}\n\nStudent question: ${userPrompt}`,
  });

  // Генерация ответа через GPT
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const assistantResponse = response.choices[0]?.message?.content || 'The document does not contain an answer to this question';

  // Сохранение ответа ассистента
  const { data: assistantMessage, error: assistantError } = await supabase
    .from('tutor_messages')
    .insert({
      material_id: materialId,
      role: 'assistant',
      content: assistantResponse,
      context: 'chat', // Указываем контекст для обычного чата
    })
    .select()
    .single();

  if (assistantError) {
    throw new Error(`Failed to save assistant message: ${assistantError.message}`);
  }

  // Начисление XP за просмотр ответа (2 XP)
  try {
    await addXP(materialId, 2);
  } catch (error) {
    // Игнорируем ошибки начисления XP
    console.error('Failed to add XP for answer view:', error);
  }

  // Получение обновлённой истории сообщений
  const { data: allMessages } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  // Проверяем достижения
  try {
    const { checkAchievements } = await import('@/app/actions/achievements');
    await checkAchievements(materialId);
  } catch (error) {
    // Игнорируем ошибки проверки достижений
    console.error('Failed to check achievements:', error);
  }

  revalidatePath(`/dashboard/materials/${materialId}`);
  return (allMessages || []) as TutorMessage[];
}
