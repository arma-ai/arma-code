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

async function generateFlashcardsFromText(text: string): Promise<Array<{ question: string; answer: string }>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at creating educational flashcards. Generate flashcards in JSON format as an object with a "flashcards" array containing objects with "question" and "answer" fields. Generate at least 10-15 flashcards. Return only valid JSON, no additional text.',
      },
      {
        role: 'user',
        content: `Create 10-15 flashcards from the following text. Return as JSON object with "flashcards" array:\n\n${text}`,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    const flashcards = parsed.flashcards || parsed.cards || [];
    return flashcards
      .filter((card: any) => card.question && card.answer)
      .map((card: any) => ({
        question: card.question || card.front || '',
        answer: card.answer || card.back || '',
      }));
  } catch {
    return [];
  }
}

export async function generateFlashcards(materialId: string) {
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

  // Проверка, не созданы ли уже flashcards
  const { data: existingFlashcards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('material_id', materialId);

  if (existingFlashcards && existingFlashcards.length > 0) {
    // Вместо ошибки удаляем старые карточки, чтобы позволить перегенерацию
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('material_id', materialId);

    if (deleteError) {
      console.error('Failed to delete existing flashcards:', deleteError);
      // Продолжаем, даже если удаление не удалось (хотя это странно)
    }
  }

  // Try to get full text first, then notes, then embeddings
  let textToUse = await getMaterialFullText(materialId);

  if (!textToUse || textToUse.trim().length === 0) {
    const notes = await getMaterialNotes(materialId);
    if (notes && notes.notes) {
      textToUse = notes.notes;
    } else {
      // ... (embeddings fallback)
      const { data: embeddings } = await supabase
        .from('material_embeddings')
        .select('chunk_text')
        .eq('material_id', materialId)
        .order('chunk_index', { ascending: true })
        .limit(20); // Increased limit

      if (embeddings && embeddings.length > 0) {
        textToUse = embeddings.map((e: any) => e.chunk_text).join('\n\n');
      }
    }
  }

  if (!textToUse || textToUse.trim().length === 0) {
    throw new Error('No content available for generating flashcards. Please process the material with AI first.');
  }

  // Генерация flashcards
  const flashcards = await generateFlashcardsFromText(textToUse);

  if (flashcards.length === 0) {
    throw new Error('Failed to generate flashcards. Please try again.');
  }

  // Сохранение flashcards
  const { error: insertError } = await supabase.from('flashcards').insert(
    flashcards.map((card) => ({
      material_id: materialId,
      question: card.question,
      answer: card.answer,
    }))
  );

  if (insertError) {
    throw new Error(`Failed to save flashcards: ${insertError.message}`);
  }

  revalidatePath(`/dashboard/materials/${materialId}`);
  return { success: true, count: flashcards.length };
}

