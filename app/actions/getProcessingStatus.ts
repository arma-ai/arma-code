'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore } from 'next/cache';

export interface ProcessingStatus {
  isComplete: boolean;
  hasFullText: boolean;
  hasSummary: boolean;
  hasNotes: boolean;
  hasFlashcards: boolean;
  progress: number;
  status: string;
}

export async function getMaterialProcessingStatus(materialId: string): Promise<ProcessingStatus> {
  unstable_noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Проверяем наличие данных обработки
  // Используем maybeSingle() вместо single() чтобы не падать, если записей еще нет
  const [materialResult, summaryResult, notesResult, flashcardsResult] = await Promise.all([
    supabase
      .from('materials')
      .select('full_text, type, processing_progress, processing_status')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('material_summaries')
      .select('id')
      .eq('material_id', materialId)
      .maybeSingle(),
    supabase
      .from('material_notes')
      .select('id')
      .eq('material_id', materialId)
      .maybeSingle(),
    supabase
      .from('flashcards')
      .select('id')
      .eq('material_id', materialId)
      .limit(1)
      .maybeSingle(),
  ]);

  const material = materialResult.data;
  const hasFullText = !!material?.full_text;
  const hasSummary = !!summaryResult.data;
  const hasNotes = !!notesResult.data;
  const hasFlashcards = !!flashcardsResult.data;

  // Use database-tracked progress if available
  let progress = material?.processing_progress || 0;
  let status = material?.processing_status || 'queued';
  let isComplete = status === 'completed' || (hasFullText && hasSummary && hasNotes);

  // If no database progress but processing is done, set to 100%
  if (isComplete && progress < 100) {
    progress = 100;
  }

  return {
    isComplete,
    hasFullText,
    hasSummary,
    hasNotes,
    hasFlashcards,
    progress,
    status,
  };
}

