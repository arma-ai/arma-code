'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Исправляет кодировку для уже сохраненного текста в БД
 * Конвертирует из Windows-1251 (неправильно интерпретированного как UTF-8) в правильный UTF-8
 */
export async function fixMaterialEncoding(materialId: string) {
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
    .select('full_text')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (materialError || !material) {
    throw new Error('Material not found');
  }

  if (!material.full_text) {
    throw new Error('Material has no full_text to fix');
  }

  // Проверяем, есть ли проблема с кодировкой
  const hasEncodingIssue = material.full_text.match(/[Èíôîðìàòèêà]/) && !material.full_text.match(/[А-Яа-яЁё]/);

  if (!hasEncodingIssue) {
    return { success: true, message: 'No encoding issue detected' };
  }

  console.log('[fixMaterialEncoding] Fixing encoding for material', materialId);
  console.log('[fixMaterialEncoding] Sample text (first 100 chars):', material.full_text.substring(0, 100));

  // Исправляем кодировку
  // Текст в БД уже интерпретирован как UTF-8, но на самом деле это Windows-1251
  // Нужно конвертировать: UTF-8 строка (неправильно) -> байты -> Windows-1251 -> правильный UTF-8
  let fixedText: string = '';
  try {
    const iconv = require('iconv-lite');

    console.log('[fixMaterialEncoding] Original text sample:', material.full_text.substring(0, 150));

    // Пробуем разные методы конвертации
    const methods = [
      // Метод 1: latin1 -> win1251
      () => {
        const buffer = Buffer.from(material.full_text, 'latin1');
        return iconv.decode(buffer, 'win1251');
      },
      // Метод 2: binary -> win1251
      () => {
        const buffer = Buffer.from(material.full_text, 'binary');
        return iconv.decode(buffer, 'win1251');
      },
      // Метод 3: Прямая конвертация через charCodeAt
      () => {
        const bytes = [];
        for (let i = 0; i < material.full_text.length; i++) {
          bytes.push(material.full_text.charCodeAt(i) & 0xFF);
        }
        const buffer = Buffer.from(bytes);
        return iconv.decode(buffer, 'win1251');
      },
    ];

    let success = false;
    for (let i = 0; i < methods.length; i++) {
      try {
        const converted = methods[i]();
        if (converted && converted.match(/[А-Яа-яЁё]/)) {
          fixedText = converted;
          console.log(`[fixMaterialEncoding] Method ${i + 1} succeeded!`);
          console.log('[fixMaterialEncoding] Converted sample:', fixedText.substring(0, 150));
          success = true;
          break;
        } else {
          console.warn(`[fixMaterialEncoding] Method ${i + 1} did not produce cyrillic text`);
        }
      } catch (methodError) {
        console.warn(`[fixMaterialEncoding] Method ${i + 1} error:`, methodError);
      }
    }

    if (!success) {
      // Если все методы не сработали, пробуем последний вариант - переизвлечь из PDF
      throw new Error('All encoding conversion methods failed. Please use "Переобработать" button to re-extract text from PDF.');
    }

    const hasCyrillic = !!fixedText.match(/[А-Яа-яЁё]/);
    if (!hasCyrillic) {
      console.warn('[fixMaterialEncoding] Warning: Converted text does not contain cyrillic characters');
      throw new Error('Encoding conversion did not produce valid cyrillic text. Please use "Переобработать" button.');
    }
  } catch (iconvError) {
    console.error('[fixMaterialEncoding] iconv-lite error:', iconvError);
    throw new Error(`Could not fix encoding: ${iconvError instanceof Error ? iconvError.message : 'Unknown error'}`);
  }

  // Сохраняем исправленный текст
  const { error: updateError } = await supabase
    .from('materials')
    .update({ full_text: fixedText })
    .eq('id', materialId)
    .select('id, full_text');

  if (updateError) {
    throw new Error(`Failed to save fixed text: ${updateError.message}`);
  }

  console.log(`[fixMaterialEncoding] Fixed text saved (${fixedText.length} chars)`);

  revalidatePath(`/dashboard/materials/${materialId}`, 'page');
  revalidatePath(`/dashboard/materials/${materialId}`, 'layout');

  return { success: true, textLength: fixedText.length };
}

