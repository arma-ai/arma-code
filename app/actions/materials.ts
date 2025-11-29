'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { RichDocumentBlock } from '@/types/rich-content';

export interface Material {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  type?: string; // 'pdf' | 'youtube'
  source?: string; // YouTube URL для type='youtube'
  created_at: string;
  updated_at: string;
  summary?: string; // Optional summary from material_summaries
}

export async function uploadMaterial(formData: FormData) {
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File;
  const title = formData.get('title') as string;

  if (!file || !title) {
    throw new Error('File and title are required');
  }

  // Проверка типа файла
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  // Проверка размера файла (50 MB = 52428800 bytes)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of 50 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  }

  if (file.size === 0) {
    throw new Error('File is empty');
  }

  // Генерация уникального имени файла
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `materials/${fileName}`;

  // Загрузка файла в Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('materials')
    .upload(fileName, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Создание записи в таблице materials
  const { data: materialData, error: dbError } = await supabase
    .from('materials')
    .insert({
      user_id: user.id,
      title: title.trim(),
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      type: 'pdf',
      processing_progress: 0,
      processing_status: 'queued',
    })
    .select()
    .single();

  if (dbError || !materialData) {
    // Если запись не создалась, удаляем загруженный файл
    await supabase.storage.from('materials').remove([fileName]);
    throw new Error(`Database error: ${dbError?.message || 'Failed to create material'}`);
  }

  // We do NOT trigger processing here anymore.
  // The client will redirect to /dashboard/materials/processing which triggers it.
  // This ensures the user sees the progress bar immediately.

  revalidatePath('/dashboard');
  return { success: true, id: materialData.id };
}

export async function getMaterials(): Promise<Material[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('materials')
    .select('*, material_summaries(summary)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  // Map the result to flatten the summary structure
  return (data || []).map((item: any) => ({
    ...item,
    summary: item.material_summaries?.[0]?.summary || null,
    // Remove the nested object to keep it clean (optional, but good for matching interface)
    material_summaries: undefined,
  }));
}

export async function getMaterialById(id: string): Promise<Material | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getMaterialFileUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Извлекаем имя файла из пути
  const fileName = filePath.replace('materials/', '');

  const { data } = await supabase.storage
    .from('materials')
    .createSignedUrl(fileName, 3600); // URL действителен 1 час

  return data?.signedUrl || null;
}

export interface MaterialSummary {
  id: string;
  material_id: string;
  summary: string;
  created_at: string;
}

export interface MaterialNotes {
  id: string;
  material_id: string;
  notes: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  material_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export async function getMaterialSummary(materialId: string): Promise<MaterialSummary | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('material_summaries')
    .select('*')
    .eq('material_id', materialId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getMaterialNotes(materialId: string): Promise<MaterialNotes | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('material_notes')
    .select('*')
    .eq('material_id', materialId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getMaterialFlashcards(materialId: string): Promise<Flashcard[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

export interface Quiz {
  id: string;
  material_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  created_at: string;
}

export async function getMaterialQuiz(materialId: string): Promise<Quiz[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

export interface TutorMessage {
  id: string;
  material_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  context?: 'chat' | 'selection';
}

export async function getTutorMessages(materialId: string): Promise<TutorMessage[]> {
  // Отключаем кэширование для этой функции, чтобы всегда получать актуальные данные
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('tutor_messages')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tutor messages:', error);
    return [];
  }

  return (data || []) as TutorMessage[];
}

/**
 * Получает очищенный полный текст документа из БД
 */
export async function getMaterialFullText(materialId: string): Promise<string | null> {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('materials')
    .select('full_text, id, title')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching material full_text:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Если ошибка связана с отсутствием поля, выводим понятное сообщение
    if (error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.error('Column full_text does not exist. Please run SQL migration: add-full-text-column.sql');
    }

    return null;
  }

  if (!data) {
    console.error('Material not found or no data returned');
    return null;
  }

  console.log(`Material ${data.id} (${data.title}): full_text is ${data.full_text ? `present (${data.full_text.length} chars)` : 'NULL or EMPTY'}`);

  return data.full_text || null;
}

type RichBlockRow = {
  order_index: number;
  block_type: string;
  page_number: number | null;
  content: any;
};

export async function getMaterialRichContent(materialId: string): Promise<{
  blocks: RichDocumentBlock[];
  metadata: Record<string, any> | null;
}> {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { blocks: [], metadata: null };
  }

  const { data, error } = await supabase
    .from('material_rich_blocks')
    .select('order_index, block_type, page_number, content')
    .eq('material_id', materialId)
    .order('order_index', { ascending: true });

  if (error) {
    if (error.message?.includes('relation') && error.message?.includes('material_rich_blocks')) {
      console.warn('[getMaterialRichContent] material_rich_blocks table missing. Run add-rich-content.sql.');
      return { blocks: [], metadata: null };
    }
    console.error('[getMaterialRichContent] Failed to fetch rich blocks:', error);
    return { blocks: [], metadata: null };
  }

  const rows = (data || []) as RichBlockRow[];
  const metadataBlock = rows.find((row) => row.block_type === 'meta');
  const metadata = (metadataBlock?.content?.metadata as Record<string, any>) || null;

  const blocks = rows
    .filter((row) => row.block_type !== 'meta')
    .map((row) => row.content as RichDocumentBlock);

  return { blocks, metadata };
}

export async function getDocumentText(materialId: string): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Получаем все чанки текста из material_embeddings, отсортированные по chunk_index
  const { data: embeddings, error } = await supabase
    .from('material_embeddings')
    .select('chunk_text, chunk_index')
    .eq('material_id', materialId)
    .order('chunk_index', { ascending: true });

  if (error || !embeddings || embeddings.length === 0) {
    return null;
  }

  // Объединяем все чанки в один текст
  const fullText = embeddings
    .map((e) => e.chunk_text)
    .filter((text) => text && text.length > 0)
    .join('\n\n');

  return fullText || null;
}

export async function createYouTubeMaterial(youtubeUrl: string, title: string) {
  console.log('[createYouTubeMaterial] Starting...', { youtubeUrl, title });
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[createYouTubeMaterial] Unauthorized');
    throw new Error('Unauthorized');
  }

  console.log('[createYouTubeMaterial] User authenticated:', user.id);

  // Валидация YouTube URL
  const videoIdMatch = youtubeUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );

  if (!videoIdMatch || !videoIdMatch[1]) {
    console.error('[createYouTubeMaterial] Invalid YouTube URL');
    throw new Error('Invalid YouTube URL');
  }

  console.log('[createYouTubeMaterial] Video ID:', videoIdMatch[1]);

  // Создание записи в таблице materials
  const { data: materialData, error: dbError } = await supabase
    .from('materials')
    .insert({
      user_id: user.id,
      title: title.trim(),
      file_path: `youtube/${videoIdMatch[1]}`,
      file_name: `YouTube Video: ${videoIdMatch[1]}`,
      file_size: null,
      type: 'youtube',
      source: youtubeUrl,
      processing_progress: 0,
      processing_status: 'queued',
    })
    .select()
    .single();

  if (dbError || !materialData) {
    console.error('[createYouTubeMaterial] Database error:', dbError);
    throw new Error(`Database error: ${dbError?.message || 'Failed to create material'}`);
  }

  console.log('[createYouTubeMaterial] Material created:', materialData.id);

  // Для YouTube видео - переходим на страницу обработки
  if (materialData.type === 'youtube') {
    // Processing will be triggered by the client on the processing page
    // to avoid blocking the UI response
    const result = { success: true, id: materialData.id };
    console.log('[createYouTubeMaterial] Returning result:', result);
    return result;
  } else {
    // Для PDF - запускаем обработку в фоне и сразу переходим
    import('@/app/actions/processMaterial').then(({ processMaterial }) => {
      processMaterial(materialData.id).catch((error) => {
        console.error('Auto-processing failed:', error);
      });
    });

    revalidatePath('/dashboard');
    return { success: true, id: materialData.id };
  }
}

export async function deleteMaterial(materialId: string) {
  const supabase = await createClient();

  // Проверка авторизации
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Получаем материал для проверки владельца и удаления файла
  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (materialError || !material) {
    throw new Error('Material not found or you do not have permission to delete it');
  }

  // Удаляем файл из Storage (только для PDF материалов)
  if (material.type !== 'youtube' && material.file_path) {
    const fileName = material.file_path.replace('materials/', '');
    await supabase.storage.from('materials').remove([fileName]);
  }

  // Удаляем материал из базы данных
  // Все связанные данные (summaries, notes, flashcards, quiz, embeddings, messages, progress, achievements)
  // будут удалены автоматически благодаря ON DELETE CASCADE
  const { error: deleteError } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId)
    .eq('user_id', user.id);

  if (deleteError) {
    throw new Error(`Failed to delete material: ${deleteError.message}`);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getMaterialPodcastData(materialId: string): Promise<{ podcastScript: string | null; podcastAudioUrl: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { podcastScript: null, podcastAudioUrl: null };

  const { data, error } = await supabase
    .from('materials')
    .select('podcast_script, podcast_audio_url')
    .eq('id', materialId)
    .single();

  if (error || !data) return { podcastScript: null, podcastAudioUrl: null };

  // Generate signed URL if we have a path stored
  let signedUrl = data.podcast_audio_url;
  if (data.podcast_audio_url && !data.podcast_audio_url.startsWith('http')) {
    const { data: signedData } = await supabase
      .storage
      .from('materials')
      .createSignedUrl(data.podcast_audio_url, 3600); // 1 hour expiry

    if (signedData) {
      signedUrl = signedData.signedUrl;
    }
  }

  return {
    podcastScript: data.podcast_script,
    podcastAudioUrl: signedUrl
  };
}

export async function getMaterialPresentationData(materialId: string): Promise<{ presentationStatus: string | null; presentationUrl: string | null; presentationEmbedUrl: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { presentationStatus: null, presentationUrl: null, presentationEmbedUrl: null };

  const { data, error } = await supabase
    .from('materials')
    .select('presentation_status, presentation_url, presentation_embed_url')
    .eq('id', materialId)
    .single();

  if (error || !data) return { presentationStatus: null, presentationUrl: null, presentationEmbedUrl: null };

  return {
    presentationStatus: data.presentation_status,
    presentationUrl: data.presentation_url,
    presentationEmbedUrl: data.presentation_embed_url
  };
}

