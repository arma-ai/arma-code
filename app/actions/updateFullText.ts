'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import pdfParse from 'pdf-parse';

/**
 * Нормализует текст: убирает лишние переносы строк, двойные пробелы, служебный мусор
 * Более мягкая нормализация, чтобы не удалить весь текст
 */
function normalizeText(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let normalized = text
    // Сначала убираем пробелы в начале и конце строк
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Убираем множественные переносы строк (оставляем максимум два подряд для абзацев)
    .replace(/\n{3,}/g, '\n\n')
    // Убираем служебные символы и мусор (страницы, номера и т.д.) - только если строка состоит ТОЛЬКО из этого
    .replace(/^Page \d+$/gim, '') // Убираем "Page X" только если это вся строка
    .replace(/^\d{1,3}$/gm, '') // Убираем строки, состоящие только из 1-3 цифр (вероятно номера страниц)
    .replace(/^-\s*$/gm, '') // Убираем строки только с дефисом
    // Убираем множественные пробелы (но сохраняем переносы строк)
    .replace(/[ \t]+/g, ' ')
    // Финальная очистка: убираем множественные переносы строк
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Если после нормализации текст стал слишком коротким (меньше 10% от оригинала), возвращаем оригинал
  if (normalized.length < text.length * 0.1 && text.length > 100) {
    console.warn('Normalization removed too much text, using original');
    return text.trim();
  }

  return normalized;
}

/**
 * Обновляет full_text для материала без полной переобработки
 * Полезно для материалов, которые уже обработаны, но full_text отсутствует
 */
export async function updateMaterialFullText(materialId: string) {
  const supabase = await createClient();

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

  // Получение текста в зависимости от типа материала
  // Обрабатываем только PDF документы, YouTube видео не обрабатываются
  if (material.type === 'youtube') {
    throw new Error('YouTube videos are not processed. Only PDF documents are processed.');
  }

  let fullText: string;

  {
    // Для PDF загружаем файл из Storage
    const fileName = material.file_path.replace('materials/', '');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('materials')
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error('Failed to download PDF');
    }

    // Конвертация в Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Извлечение текста
    const data = await pdfParse(pdfBuffer);
    let extractedText = data.text;
    
    // Исправляем проблемы с кодировкой для кириллицы
    const hasEncodingIssue = extractedText.match(/[Èíôîðìàòèêà]/) && !extractedText.match(/[А-Яа-яЁё]/);
    if (hasEncodingIssue) {
      console.log('[updateFullText] Detected encoding issue, fixing...');
      try {
        const iconv = require('iconv-lite');
        const buffer = Buffer.from(extractedText, 'latin1');
        extractedText = iconv.decode(buffer, 'win1251');
        console.log('[updateFullText] Successfully converted from Windows-1251 to UTF-8');
      } catch (iconvError) {
        console.warn('[updateFullText] iconv-lite not available, trying Buffer method');
        try {
          const buffer = Buffer.from(extractedText, 'latin1');
          extractedText = buffer.toString('utf8');
        } catch (e) {
          console.warn('[updateFullText] Could not fix encoding');
        }
      }
    }
    
    fullText = extractedText;
  }

  if (!fullText || fullText.trim().length === 0) {
    throw new Error('No text extracted from material');
  }

  // Нормализация текста
  let normalizedText = normalizeText(fullText);

  // Проверяем, что после нормализации текст не пустой
  if (!normalizedText || normalizedText.trim().length === 0) {
    console.error('Normalized text is empty, using original text');
    normalizedText = fullText.trim();
  }

  // Проверяем, существует ли поле full_text (пробуем прочитать его)
  const { data: checkData, error: checkError } = await supabase
    .from('materials')
    .select('full_text')
    .eq('id', materialId)
    .single();

  if (checkError) {
    // Если ошибка связана с отсутствием поля
    if (checkError.message?.includes('column') || checkError.message?.includes('does not exist')) {
      throw new Error('Column full_text does not exist in database. Please run SQL migration: add-full-text-column.sql');
    }
    console.warn('Warning when checking full_text:', checkError);
  }

  // Сохранение очищенного текста в БД
  const { data: updateData, error: updateError } = await supabase
    .from('materials')
    .update({ full_text: normalizedText })
    .eq('id', materialId)
    .select('id, full_text');

  if (updateError) {
    console.error('Failed to save full_text:', updateError);
    console.error('Update error details:', JSON.stringify(updateError, null, 2));
    
    // Детальная диагностика ошибки
    if (updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
      throw new Error('Column full_text does not exist. Please run SQL migration: add-full-text-column.sql');
    }
    
    if (updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
      throw new Error('Permission denied. Check RLS policies for UPDATE on materials table.');
    }
    
    throw new Error(`Failed to save full_text: ${updateError.message}`);
  }

  if (!updateData || updateData.length === 0) {
    throw new Error('Update succeeded but no data returned. Check RLS policies.');
  }

  const savedText = updateData[0].full_text;
  console.log(`[updateFullText] Successfully saved full_text (${savedText?.length || 0} characters) for material ${materialId}`);
  console.log(`[updateFullText] Verification: saved text length = ${savedText?.length || 0}, original length = ${normalizedText.length}`);
  console.log('[updateFullText] Updated material:', { id: updateData[0].id, textLength: savedText?.length || 0 });

  // Принудительно обновляем кэш
  revalidatePath(`/dashboard/materials/${materialId}`, 'page');
  revalidatePath(`/dashboard/materials/${materialId}`, 'layout');
  
  return { success: true, textLength: savedText?.length || normalizedText.length };
}

