'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import * as pdfParse from 'pdf-parse';
import { parseRichDocument } from '@/lib/rich-document-parser';
import { saveRichContent } from '@/lib/save-rich-content';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to .env.local file.');
}

if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  throw new Error('OPENAI_API_KEY format is incorrect. It should start with "sk-" or "sk-proj-"');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHUNK_SIZE = 8000; // Размер чанка для обработки
const EMBEDDING_CHUNK_SIZE = 1000; // Размер чанка для embeddings (меньше для лучшего контекста)

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const data = await pdfParse(pdfBuffer);
  let text = data.text;

  // Исправляем проблемы с кодировкой для кириллицы
  // Если текст выглядит как неправильная кодировка (например, "Èíôîðìàòèêà" вместо "Информатика")
  // Это означает, что pdf-parse извлек текст в неправильной кодировке
  try {
    // Проверяем, есть ли проблемы с кодировкой
    // Более агрессивная проверка: если нет кириллицы, но есть подозрительные символы
    const hasCyrillic = text.match(/[А-Яа-яЁё]/);
    const hasSuspiciousChars = text.match(/[Èíôîðìàòèêà]/);
    const shouldFix = !hasCyrillic && (hasSuspiciousChars || text.length > 100);

    if (shouldFix) {
      console.log('[extractTextFromPDF] Detected possible encoding issue (no cyrillic found), attempting to fix...');
      console.log('[extractTextFromPDF] Sample text:', text.substring(0, 100));
      console.log('[extractTextFromPDF] Has suspicious chars:', !!hasSuspiciousChars);
      console.log('[extractTextFromPDF] Text length:', text.length);

      try {
        const iconv = require('iconv-lite');

        // НОВЫЙ ПОДХОД: Пробуем ВСЕ популярные кодировки для кириллицы
        // Список всех кодировок для кириллицы
        const cyrillicEncodings = [
          'win1251',  // Windows-1251 (самая популярная)
          'cp866',    // DOS/IBM Cyrillic
          'koi8-r',   // KOI8-R (Unix)
          'iso88595', // ISO-8859-5
          'maccyrillic', // Mac Cyrillic
        ];

        // Список способов получения байтов из строки
        const byteMethods = [
          (str: string) => Buffer.from(str, 'latin1'),
          (str: string) => Buffer.from(str, 'binary'),
          (str: string) => {
            const bytes: number[] = [];
            for (let i = 0; i < str.length; i++) {
              bytes.push(str.charCodeAt(i) & 0xFF);
            }
            return Buffer.from(bytes);
          },
        ];

        let bestResult: { text: string; encoding: string; method: number } | null = null;
        let bestCyrillicCount = 0;

        // Пробуем все комбинации: способ получения байтов × кодировка
        for (let methodIdx = 0; methodIdx < byteMethods.length; methodIdx++) {
          const getBytesMethod = byteMethods[methodIdx];

          for (const encoding of cyrillicEncodings) {
            try {
              const bytes = getBytesMethod(text);
              const converted = iconv.decode(bytes, encoding);

              // Считаем количество кириллических символов
              const cyrillicMatch = converted.match(/[А-Яа-яЁё]/g);
              const cyrillicCount = cyrillicMatch ? cyrillicMatch.length : 0;

              if (cyrillicCount > bestCyrillicCount) {
                bestCyrillicCount = cyrillicCount;
                bestResult = {
                  text: converted,
                  encoding,
                  method: methodIdx + 1,
                };
                console.log(`[extractTextFromPDF] Found better result: encoding=${encoding}, method=${methodIdx + 1}, cyrillic chars=${cyrillicCount}`);
              }
            } catch (err) {
              // Игнорируем ошибки, пробуем дальше
            }
          }
        }

        // Если нашли результат с кириллицей, используем его
        if (bestResult && bestCyrillicCount > 10) {
          text = bestResult.text;
          console.log(`[extractTextFromPDF] ✅ Successfully converted using encoding=${bestResult.encoding}, method=${bestResult.method}`);
          console.log(`[extractTextFromPDF] Found ${bestCyrillicCount} cyrillic characters`);
          console.log('[extractTextFromPDF] Sample converted text:', text.substring(0, 100));
        } else if (bestResult) {
          // Если нашли что-то, но мало кириллицы, все равно пробуем
          text = bestResult.text;
          console.log(`[extractTextFromPDF] ⚠️ Using best result (encoding=${bestResult.encoding}, cyrillic=${bestCyrillicCount})`);
          console.log('[extractTextFromPDF] Sample:', text.substring(0, 100));
        } else {
          console.warn('[extractTextFromPDF] ❌ Could not find any valid cyrillic encoding');
          console.warn('[extractTextFromPDF] Original sample:', text.substring(0, 100));
        }
      } catch (iconvError) {
        console.error('[extractTextFromPDF] iconv-lite error:', iconvError);
        console.warn('[extractTextFromPDF] Could not fix encoding, using original text');
      }
    }
  } catch (error) {
    console.warn('[extractTextFromPDF] Error fixing encoding:', error);
  }

  return text;
}

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

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

async function generateSummary(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at summarizing educational materials. Create a concise, comprehensive summary of the provided text. CRITICAL INSTRUCTION: The summary MUST be written in the EXACT SAME LANGUAGE as the provided source text. If the text is in Russian, the summary MUST be in Russian. If the text is in English, the summary MUST be in English. Do not translate.',
      },
      {
        role: 'user',
        content: `Summarize the following text:\n\n${text}`,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateNotes(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at creating study notes. Extract key points, concepts, and important information from the provided text in a structured format. CRITICAL INSTRUCTION: The notes MUST be written in the EXACT SAME LANGUAGE as the provided source text. If the text is in Russian, the notes MUST be in Russian. Do not translate.',
      },
      {
        role: 'user',
        content: `Create detailed study notes from the following text:\n\n${text}`,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateFlashcards(text: string): Promise<Array<{ question: string; answer: string }>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at creating educational flashcards. Generate flashcards in JSON format as an object with a "flashcards" array containing objects with "question" and "answer" fields. Return only valid JSON, no additional text. CRITICAL INSTRUCTION: The questions and answers MUST be written in the EXACT SAME LANGUAGE as the provided source text. If the text is in Russian, the flashcards MUST be in Russian. Do not translate.',
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
          'You are an expert at creating educational quiz questions. Generate quiz questions in JSON format as an object with a "questions" array. Each question must have: question (text), option_a, option_b, option_c, option_d (all text), and correct_option (one of: "a", "b", "c", "d"). Generate at least 10 questions. CRITICAL INSTRUCTION: The questions and answers MUST be written in the EXACT SAME LANGUAGE as the provided source text. If the text is in Russian, the quiz MUST be in Russian. Do not translate. Return only valid JSON, no additional text.',
      },
      {
        role: 'user',
        content: `Create at least 10 multiple-choice quiz questions (with 4 options each) based on the following text. Ensure the language matches the text. Return as JSON object with "questions" array:\n\n${text.substring(0, 50000)}`,
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


export async function processMaterial(materialId: string) {
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

  // Проверка, не обработан ли уже материал
  // Но разрешаем обновление full_text даже для обработанных материалов
  const { data: existingSummary } = await supabase
    .from('material_summaries')
    .select('id')
    .eq('material_id', materialId)
    .single();

  // Проверяем, есть ли уже full_text
  const { data: existingMaterial } = await supabase
    .from('materials')
    .select('full_text')
    .eq('id', materialId)
    .single();

  // Если материал уже обработан И full_text уже есть, не обрабатываем заново
  if (existingSummary && existingMaterial?.full_text) {
    throw new Error('Material already processed');
  }

  // Если материал обработан, но full_text отсутствует, продолжаем обработку для сохранения full_text
  const shouldSkipAI = existingSummary && !existingMaterial?.full_text;

  // Получение текста в зависимости от типа материала
  let fullText: string = '';

  if (material.type === 'youtube' && material.source) {
    // Для YouTube видео получаем транскрипцию с временными метками
    console.log('[processMaterial] Processing YouTube video:', material.source);

    // Update progress: Starting transcription (10%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 10,
        processing_status: 'transcribing'
      })
      .eq('id', materialId);

    // 1. Попытка получить транскрипт
    try {
      let transcriptionResult: { text: string; segments: any[] } | null = null;
      let timestampSuccess = false;

      // А. Пробуем новую функцию с временными метками
      try {
        console.log('[processMaterial] Attempting timestamped transcription...');
        const { getYouTubeTranscriptionWithTimestamps } = await import('@/lib/youtube-transcription-timestamps');

        transcriptionResult = await getYouTubeTranscriptionWithTimestamps(
          material.source,
          async (progress: number, status: string) => {
            const transcriptionProgress = 10 + Math.floor(progress * 40);
            try {
              await supabase
                .from('materials')
                .update({
                  processing_progress: transcriptionProgress,
                  processing_status: status
                })
                .eq('id', materialId);
            } catch (e) { /* ignore */ }
          }
        );

        if (transcriptionResult && transcriptionResult.text) {
          fullText = transcriptionResult.text;
          timestampSuccess = true;
        }
      } catch (timestampError) {
        console.warn('[processMaterial] Timestamped transcription failed:', timestampError);
        timestampSuccess = false;
      }

      // Б. Если первая попытка не удалась, используем стандартный метод (Fallback)
      if (!timestampSuccess || !fullText) {
        console.log('[processMaterial] Falling back to standard transcription...');
        try {
          const { getYouTubeTranscription } = await import('@/lib/youtube-transcription');
          fullText = await getYouTubeTranscription(material.source, async (progress: number, status: string) => {
            const transcriptionProgress = 10 + Math.floor(progress * 40);
            try {
              await supabase
                .from('materials')
                .update({
                  processing_progress: transcriptionProgress,
                  processing_status: status
                })
                .eq('id', materialId);
            } catch (e) { /* ignore */ }
          });
        } catch (standardError) {
          console.error('[processMaterial] Standard transcription also failed:', standardError);
        }
      }

      // В. Если ВСЕ методы не сработали - используем заглушку
      if (!fullText || fullText.trim().length < 10) {
        console.warn('[processMaterial] All transcription methods failed. Using emergency fallback.');
        fullText = `YouTube Video: ${material.source}\n\nК сожалению, автоматическая транскрипция для этого видео недоступна. Возможно, видео не содержит речи, имеет ограничения доступа или возникла ошибка при обработке аудио.\n\nВы можете попробовать обработать материал повторно позже.`;
      }

      // 3. Сохраняем сегменты (только если они есть и транскрипция с метками удалась)
      if (timestampSuccess && transcriptionResult?.segments && transcriptionResult.segments.length > 0) {
        try {
          console.log('[processMaterial] Saving', transcriptionResult.segments.length, 'transcript segments...');

          // Удаляем старые сегменты
          await supabase.from('transcript_segments').delete().eq('material_id', materialId);

          // Сохраняем новые
          const segmentsToInsert = transcriptionResult.segments.map((segment) => ({
            material_id: materialId,
            segment_index: segment.id,
            start_time: segment.start,
            end_time: segment.end,
            text: segment.text,
          }));

          const { error: segmentsError } = await supabase
            .from('transcript_segments')
            .insert(segmentsToInsert);

          if (segmentsError) {
            console.error('[processMaterial] Failed to save segments (DB error):', segmentsError);
          } else {
            console.log('[processMaterial] Segments saved successfully');
          }
        } catch (dbError) {
          console.error('[processMaterial] Failed to save segments (Exception):', dbError);
        }
      }

      console.log('[processMaterial] Transcription phase completed. Text length:', fullText.length);

      // Update progress and SAVE TEXT immediately
      await supabase
        .from('materials')
        .update({
          processing_progress: 50,
          processing_status: 'processing_text',
          full_text: fullText // Сохраняем текст сразу!
        })
        .eq('id', materialId);

    } catch (criticalError) {
      // Этот блок ловит только критические ошибки в самой логике оркестрации, 
      // но не в транскрипции (так как она обернута выше)
      console.error('[processMaterial] Critical error in transcription orchestration:', criticalError);
      // Даже тут мы пытаемся продолжить с заглушкой
      fullText = `Error processing video: ${criticalError instanceof Error ? criticalError.message : 'Unknown error'}`;
    }
  } else {
    // Для PDF загружаем файл из Storage
    if (!material.file_path) {
      throw new Error('File path is required for PDF materials');
    }

    // Update progress: Downloading PDF (10%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 10,
        processing_status: 'downloading_pdf'
      })
      .eq('id', materialId);

    const fileName = material.file_path.replace('materials/', '');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('materials')
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error('Failed to download PDF');
    }

    // Update progress: Extracting text (20%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 20,
        processing_status: 'extracting_text'
      })
      .eq('id', materialId);

    // Конвертация в Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Попытка извлечь структуру и текст через rich parser
    try {
      const richContent = await parseRichDocument(pdfBuffer, {
        mimeType: fileData.type,
        fileName,
      });

      if (richContent?.plainText) {
        fullText = richContent.plainText;
      }

      await saveRichContent(supabase, materialId, richContent);
    } catch (richError) {
      console.error('[processMaterial] Failed to parse rich document content:', richError);
    }

    // Если rich парсер не смог получить текст, используем классический pdf-parse
    if (!fullText) {
      fullText = await extractTextFromPDF(pdfBuffer);
    }

    // Дополнительная проверка и исправление кодировки после извлечения
    if (fullText && fullText.match(/[Èíôîðìàòèêà]/) && !fullText.match(/[А-Яа-яЁё]/)) {
      console.log('[processMaterial] Detected encoding issue, attempting to fix...');
      // Пробуем исправить через Buffer
      try {
        const buffer = Buffer.from(fullText, 'latin1');
        fullText = buffer.toString('utf8');
        console.log('[processMaterial] Encoding fixed via Buffer conversion');
      } catch (e) {
        console.warn('[processMaterial] Could not fix encoding via Buffer');
      }
    }

    // Update progress: Text extracted (40%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 40,
        processing_status: 'processing_text'
      })
      .eq('id', materialId);
  }

  if (!fullText || fullText.trim().length === 0) {
    throw new Error('No text extracted from material');
  }

  // Нормализация текста: очистка от лишних переносов строк, двойных пробелов и служебного мусора
  // normalizeText теперь также исправляет кодировку
  let normalizedText = normalizeText(fullText);

  // Проверяем, что после нормализации текст не пустой
  if (!normalizedText || normalizedText.trim().length === 0) {
    console.error('Normalized text is empty, using original text');
    // Используем оригинальный текст, если нормализация удалила всё
    normalizedText = fullText.trim();
  }

  // Сохранение очищенного текста в БД
  console.log(`[processMaterial] Attempting to save full_text (${normalizedText.length} chars) for material ${materialId}`);

  const { data: updateData, error: updateError } = await supabase
    .from('materials')
    .update({ full_text: normalizedText })
    .eq('id', materialId)
    .select('id, full_text');

  if (updateError) {
    console.error('[processMaterial] Failed to save full_text:', updateError);
    console.error('[processMaterial] Update error details:', JSON.stringify(updateError, null, 2));
    // Если ошибка связана с отсутствием поля, выбрасываем исключение
    if (updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
      throw new Error('Column full_text does not exist. Please run the SQL migration: add-full-text-column.sql');
    }
    // Для других ошибок не прерываем выполнение, но логируем
  } else {
    if (updateData && updateData.length > 0) {
      const savedText = updateData[0].full_text;
      console.log(`[processMaterial] Successfully saved full_text (${savedText?.length || 0} characters) for material ${materialId}`);
      console.log(`[processMaterial] Verification: saved text length = ${savedText?.length || 0}, original length = ${normalizedText.length}`);
    } else {
      console.warn('[processMaterial] Update succeeded but no data returned. RLS policy might be blocking SELECT.');
    }
  }

  // Разделение на чанки (используем нормализованный текст)
  const chunks = chunkText(normalizedText, CHUNK_SIZE);

  // Если материал уже обработан, но мы обновляем только full_text, пропускаем генерацию AI
  if (shouldSkipAI) {
    // Сохраняем только full_text, не генерируем summary/notes/flashcards
    revalidatePath(`/dashboard/materials/${materialId}`);
    return { success: true, fullTextOnly: true };
  }

  // Для YouTube видео - полная обработка с flashcards и quiz
  if (material.type === 'youtube') {
    try {
      // Update progress: Generating summary (50%)
      await supabase
        .from('materials')
        .update({
          processing_progress: 50,
          processing_status: 'generating_summary'
        })
        .eq('id', materialId);

      // Генерируем summary
      const summaryText = chunks.length > 0 ? chunks[0] : normalizedText.substring(0, 5000);
      const summary = await generateSummary(summaryText);

      // Update progress: Generating notes (60%)
      await supabase
        .from('materials')
        .update({
          processing_progress: 60,
          processing_status: 'generating_notes'
        })
        .eq('id', materialId);

      const notesText = chunks.slice(0, 3).join('\n\n'); // Используем первые 3 чанка
      const notes = await generateNotes(notesText);

      // Update progress: Generating flashcards (70%)
      await supabase
        .from('materials')
        .update({
          processing_progress: 70,
          processing_status: 'generating_flashcards'
        })
        .eq('id', materialId);

      // Генерируем flashcards
      const flashcardsText = chunks.slice(0, 5).join('\n\n'); // Используем первые 5 чанков
      const flashcards = await generateFlashcards(flashcardsText);

      // Update progress: Generating quiz (85%)
      await supabase
        .from('materials')
        .update({
          processing_progress: 85,
          processing_status: 'generating_quiz'
        })
        .eq('id', materialId);

      // Генерируем quiz
      const quizText = chunks.slice(0, 5).join('\n\n'); // Используем первые 5 чанков
      const quizQuestions = await generateQuizQuestions(quizText);

      // Сохранение результатов
      const { error: summaryError } = await supabase.from('material_summaries').insert({
        material_id: materialId,
        summary,
      });

      if (summaryError) {
        console.error(`[processMaterial] Failed to save summary: ${summaryError.message}`);
      }

      const { error: notesError } = await supabase.from('material_notes').insert({
        material_id: materialId,
        notes,
      });

      if (notesError) {
        console.error(`[processMaterial] Failed to save notes: ${notesError.message}`);
      }

      // Сохранение flashcards
      if (flashcards.length > 0) {
        const { error: flashcardsError } = await supabase.from('flashcards').insert(
          flashcards.map((card) => ({
            material_id: materialId,
            question: card.question,
            answer: card.answer,
          }))
        );

        if (flashcardsError) {
          console.error(`[processMaterial] Failed to save flashcards: ${flashcardsError.message}`);
        }
      }

      // Сохранение quiz
      if (quizQuestions.length > 0) {
        const { error: quizError } = await supabase.from('quizzes').insert(
          quizQuestions.map((q) => ({
            material_id: materialId,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
          }))
        );

        if (quizError) {
          console.error(`[processMaterial] Failed to save quiz: ${quizError.message}`);
        }
      }
    } catch (aiError) {
      console.error('[processMaterial] AI generation for YouTube video failed:', aiError);
      // Don't fail the whole process if AI fails, we still have the text
    }

    // Update progress: Complete (95%) - embeddings will bring it to 100%
    await supabase
      .from('materials')
      .update({
        processing_progress: 95,
        processing_status: 'generating_embeddings'
      })
      .eq('id', materialId);

    console.log('[processMaterial] YouTube video processed (summary, notes, flashcards, and quiz generated)');

    // We continue to generate embeddings below instead of returning early
  }

  // Для PDF - полная обработка
  if (material.type !== 'youtube') {
    // Update progress: Generating summary (50%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 50,
        processing_status: 'generating_summary'
      })
      .eq('id', materialId);

    // Генерация summary (из первого чанка или всего текста, если короткий)
    const summaryText = chunks.length > 0 ? chunks[0] : normalizedText.substring(0, 10000);
    const summary = await generateSummary(summaryText);

    // Update progress: Generating notes (60%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 60,
        processing_status: 'generating_notes'
      })
      .eq('id', materialId);

    // Генерация notes (из всех чанков)
    const notesText = chunks.slice(0, 3).join('\n\n'); // Используем первые 3 чанка
    const notes = await generateNotes(notesText);

    // Update progress: Generating flashcards (70%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 70,
        processing_status: 'generating_flashcards'
      })
      .eq('id', materialId);

    // Генерация flashcards (из всех чанков)
    const flashcardsText = chunks.slice(0, 5).join('\n\n'); // Используем первые 5 чанков
    const flashcards = await generateFlashcards(flashcardsText);

    // Update progress: Generating quiz (85%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 85,
        processing_status: 'generating_quiz'
      })
      .eq('id', materialId);

    // Генерация quiz
    const quizText = chunks.slice(0, 5).join('\n\n'); // Используем первые 5 чанков
    const quizQuestions = await generateQuizQuestions(quizText);

    // Update progress: Saving results (90%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 90,
        processing_status: 'saving_results'
      })
      .eq('id', materialId);

    // Сохранение результатов - используем delete + insert для надежности при повторной обработке

    // 1. Summary
    await supabase.from('material_summaries').delete().eq('material_id', materialId);
    const { error: summaryError } = await supabase.from('material_summaries').insert({
      material_id: materialId,
      summary,
    });

    if (summaryError) {
      console.error(`[processMaterial] Failed to save summary: ${summaryError.message}`);
      // Не прерываем, чтобы сохранить остальное
    } else {
      console.log(`[processMaterial] Saved summary (${summary.length} chars)`);
    }

    // 2. Notes
    await supabase.from('material_notes').delete().eq('material_id', materialId);
    const { error: notesError } = await supabase.from('material_notes').insert({
      material_id: materialId,
      notes,
    });

    if (notesError) {
      console.error(`[processMaterial] Failed to save notes: ${notesError.message}`);
    } else {
      console.log(`[processMaterial] Saved notes (${notes.length} chars)`);
    }

    // 3. Flashcards
    await supabase.from('flashcards').delete().eq('material_id', materialId);
    if (flashcards.length > 0) {
      const { error: flashcardsError } = await supabase.from('flashcards').insert(
        flashcards.map((card) => ({
          material_id: materialId,
          question: card.question,
          answer: card.answer,
        }))
      );

      if (flashcardsError) {
        console.error(`[processMaterial] Failed to save flashcards: ${flashcardsError.message}`);
      } else {
        console.log(`[processMaterial] Saved ${flashcards.length} flashcards`);
      }
    }

    // 4. Quiz
    await supabase.from('quizzes').delete().eq('material_id', materialId);
    if (quizQuestions.length > 0) {
      const { error: quizError } = await supabase.from('quizzes').insert(
        quizQuestions.map((q) => ({
          material_id: materialId,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
        }))
      );

      if (quizError) {
        console.error(`[processMaterial] Failed to save quiz: ${quizError.message}`);
      } else {
        console.log(`[processMaterial] Saved ${quizQuestions.length} quiz questions`);
      }
    }

    // Update progress: Complete (95%)
    await supabase
      .from('materials')
      .update({
        processing_progress: 95,
        processing_status: 'generating_embeddings'
      })
      .eq('id', materialId);
  }

  // Создание embeddings для RAG (используем нормализованный текст)
  // Удаляем старые embeddings перед созданием новых
  await supabase.from('material_embeddings').delete().eq('material_id', materialId);

  const embeddingChunks = chunkText(normalizedText, EMBEDDING_CHUNK_SIZE);
  const embeddings = [];

  for (let i = 0; i < embeddingChunks.length; i++) {
    const chunk = embeddingChunks[i];
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk,
      });

      const embedding = response.data[0].embedding;

      embeddings.push({
        material_id: materialId,
        chunk_text: chunk,
        chunk_index: i,
        embedding: embedding, // Массив чисел, Supabase преобразует в vector
      });
    } catch (error) {
      console.error(`Failed to create embedding for chunk ${i}:`, error);
    }
  }

  // Сохранение embeddings
  if (embeddings.length > 0) {
    const { error: embeddingsError } = await supabase
      .from('material_embeddings')
      .insert(embeddings);

    if (embeddingsError) {
      console.error('Failed to save embeddings:', embeddingsError);
      // Не прерываем выполнение, embeddings не критичны
    } else {
      console.log(`[processMaterial] Saved ${embeddings.length} embeddings`);
    }
  }

  // Auto-generate Podcast Script (but not audio)
  try {
    console.log('[processMaterial] Auto-generating podcast script...');
    const { generatePodcastScript } = await import('./podcast');
    await generatePodcastScript(materialId);
    console.log('[processMaterial] Podcast script generated successfully');
  } catch (podcastError) {
    console.error('[processMaterial] Failed to auto-generate podcast script:', podcastError);
    // Don't fail the whole process
  }

  // FINAL COMPLETION UPDATE
  console.log('[processMaterial] Processing complete. Updating status to completed.');
  await supabase
    .from('materials')
    .update({
      processing_progress: 100,
      processing_status: 'completed'
    })
    .eq('id', materialId);

  revalidatePath(`/dashboard/materials/${materialId}`);
  return { success: true };
}

