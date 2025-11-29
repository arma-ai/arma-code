'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Принудительно обновляет full_text для материала, даже если он уже обработан
 * Использует существующий текст из chunks или извлекает заново
 */
export async function forceUpdateFullText(materialId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Получаем материал
  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (materialError || !material) {
    throw new Error('Material not found');
  }

  // ПРИНУДИТЕЛЬНО извлекаем текст из PDF, игнорируя chunks
  // Это гарантирует правильную кодировку при извлечении
  console.log('[forceUpdateFullText] Force extracting text from PDF source (ignoring chunks)...');

  let fullText: string | null = null;

  // Извлекаем текст только из PDF документов, YouTube видео не обрабатываются
  if (material.type === 'youtube') {
    throw new Error('YouTube videos are not processed. Only PDF documents are processed.');
  }

  if (!fullText) {
    console.log('[forceUpdateFullText] Extracting text from source...');

    if (material.file_path) {
      const fileName = material.file_path.replace('materials/', '');
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('materials')
        .download(fileName);

      if (downloadError || !fileData) {
        throw new Error('Failed to download PDF');
      }

      // Используем ту же функцию извлечения, что и в processMaterial
      // Она автоматически исправляет кодировку
      const { extractTextFromPDF } = await import('./processMaterial');

      const arrayBuffer = await fileData.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      console.log('[forceUpdateFullText] Extracting text from PDF with encoding fix...');
      const extractedText = await extractTextFromPDF(pdfBuffer);

      console.log('[forceUpdateFullText] Extracted text sample:', extractedText.substring(0, 150));
      console.log('[forceUpdateFullText] Contains cyrillic:', !!extractedText.match(/[А-Яа-яЁё]/));
      console.log('[forceUpdateFullText] Contains encoding issue:', !!extractedText.match(/[Èíôîðìàòèêà]/));

      fullText = extractedText;
    }
  }

  if (!fullText || fullText.trim().length === 0) {
    throw new Error('No text available to save');
  }

  // Нормализуем текст
  const normalizeText = (text: string): string => {
    if (!text || text.trim().length === 0) return text;

    let normalized = text
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (normalized.length < text.length * 0.1 && text.length > 100) {
      return text.trim();
    }

    return normalized;
  };

  const normalizedText = normalizeText(fullText);

  // Сохраняем
  const { data: updateData, error: updateError } = await supabase
    .from('materials')
    .update({ full_text: normalizedText })
    .eq('id', materialId)
    .select('id, full_text');

  if (updateError) {
    console.error('[forceUpdateFullText] Update error:', updateError);
    throw new Error(`Failed to save: ${updateError.message}`);
  }

  if (!updateData || updateData.length === 0) {
    throw new Error('Update failed: no data returned');
  }

  console.log(`[forceUpdateFullText] Successfully saved ${updateData[0].full_text?.length || 0} characters`);

  revalidatePath(`/dashboard/materials/${materialId}`, 'page');
  revalidatePath(`/dashboard/materials/${materialId}`, 'layout');

  return { success: true, textLength: updateData[0].full_text?.length || 0 };
}

