import OpenAI from 'openai';
import { getYouTubeTranscript } from './youtube-transcript';
import { downloadYouTubeAudio, cleanupAudioFile, extractYouTubeVideoId } from './youtube-audio';
import * as fs from 'fs';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Получает транскрипцию YouTube видео, комбинируя субтитры и Whisper
 */
export async function getYouTubeTranscription(
  youtubeUrl: string,
  onProgress?: (progress: number, status: string) => Promise<void>
): Promise<string> {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  let subtitlesText: string | null = null;
  let whisperText: string | null = null;
  let fallbackText: string | null = null;

  // 1. Пробуем получить субтитры через youtube-transcript (быстро)
  try {
    console.log('[YouTube Transcription] Attempting to get subtitles...');
    if (onProgress) await onProgress(0.1, 'Getting subtitles...');

    // Получаем сырой результат, который может быть субтитрами или fallback-текстом
    const rawResult = await getYouTubeTranscript(youtubeUrl);

    // Проверяем, является ли это fallback-текстом (описанием)
    const isFallback = rawResult.includes('Это видео добавлено без транскрипта') ||
      rawResult.includes('транскрипт недоступен') ||
      rawResult.startsWith('YouTube Video:');

    if (!isFallback && rawResult.length > 50) {
      subtitlesText = rawResult;
      console.log('[YouTube Transcription] Subtitles obtained successfully, length:', subtitlesText.length);
      if (onProgress) await onProgress(0.2, 'Subtitles obtained');
    } else {
      // Сохраняем fallback текст на случай, если Whisper тоже не сработает
      fallbackText = rawResult;
      console.log('[YouTube Transcription] Subtitles not available, saved fallback text');
    }
  } catch (error) {
    console.error('[YouTube Transcription] Failed to get subtitles/metadata:', error);
    // CRITICAL FIX: Ensure fallbackText is set even if getYouTubeTranscript throws
    fallbackText = `YouTube Video (${videoId}).\n\nAutomatic transcription failed and metadata could not be retrieved. Please try again later or check if the video is accessible.`;
  }

  // 2. ВСЕГДА скачиваем аудио и транскрибируем через Whisper для точности
  // Делаем это параллельно с получением субтитров для скорости
  let audioFilePath: string | null = null;

  // Запускаем Whisper параллельно (не ждем субтитры)
  const whisperPromise = (async () => {
    try {
      console.log('[YouTube Transcription] Downloading audio for Whisper...');
      if (onProgress) await onProgress(0.3, 'Downloading audio...');

      audioFilePath = await downloadYouTubeAudio(youtubeUrl);
      console.log('[YouTube Transcription] Audio downloaded:', audioFilePath);

      if (onProgress) await onProgress(0.5, 'Transcribing with Whisper...');

      // Транскрибируем через Whisper с временными метками
      console.log('[YouTube Transcription] Transcribing with Whisper...');
      const audioFile = fs.createReadStream(audioFilePath);

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json', // Получаем детальный JSON с временными метками
        timestamp_granularities: ['segment'], // Получаем метки для сегментов
      });

      // verbose_json возвращает объект с text и segments
      const result = typeof transcription === 'object' && 'text' in transcription
        ? transcription.text
        : String(transcription);

      console.log('[YouTube Transcription] Whisper transcription completed, length:', result.length);
      if (onProgress) await onProgress(0.8, 'Whisper transcription completed');

      return {
        text: result,
        segments: 'segments' in transcription ? transcription.segments : []
      };
    } catch (error) {
      console.error('[YouTube Transcription] Failed to transcribe with Whisper:', error);
      return null;
    } finally {
      // Очищаем временный файл
      if (audioFilePath) {
        await cleanupAudioFile(audioFilePath);
      }
    }
  })();

  // Ждем завершения Whisper
  const whisperResult = await whisperPromise;
  whisperText = whisperResult?.text || null;

  // 3. Объединяем результаты
  let combinedText: string | null = null;

  if (subtitlesText && whisperText) {
    // Если оба присутствуют, объединяем
    console.log('[YouTube Transcription] Combining subtitles and Whisper transcription...');
    combinedText = `${subtitlesText}\n\n---\n\n${whisperText}`;
  } else if (subtitlesText) {
    combinedText = subtitlesText;
  } else if (whisperText) {
    combinedText = whisperText;
  } else if (fallbackText) {
    // Если ничего нет, используем fallback (описание видео или сообщение об ошибке)
    console.warn('[YouTube Transcription] Using fallback text as no transcription available');
    combinedText = fallbackText;
    if (onProgress) await onProgress(0.9, 'Using video info (no speech found)');
  }

  if (!combinedText || combinedText.trim().length === 0) {
    // Absolute last resort - should never happen due to fallbackText in catch
    console.error('[YouTube Transcription] CRITICAL: All methods failed, returning generic error message');
    return `YouTube Video (${videoId}).\n\nProcessing failed completely. No transcription or metadata could be retrieved.`;
  }

  // 4. Проверяем, есть ли речь в тексте (если это не fallback)
  // Если мы используем fallback, мы уже знаем, что это не речь, но это полезный контент
  const isUsingFallback = combinedText === fallbackText;

  if (!isUsingFallback) {
    const hasSpeech = combinedText.length > 50 &&
      /[а-яА-Яa-zA-Z]{3,}/.test(combinedText); // Проверка на наличие слов

    if (!hasSpeech) {
      console.warn('[YouTube Transcription] Text seems to have no speech, reverting to fallback if available');
      if (fallbackText) {
        combinedText = fallbackText;
      } else {
        // Instead of throwing, return the text (even if it looks like no speech) or a message
        console.warn('[YouTube Transcription] No speech detected but no fallback available. Returning original text.');
      }
    }
  }

  // 5. Редактируем через GPT-4 для улучшения качества (только если текст достаточно длинный и это не fallback)
  if (!isUsingFallback && combinedText.length > 300) {
    console.log('[YouTube Transcription] Editing with GPT-4 for better quality...');
    const editedText = await editTranscriptionWithGPT(combinedText);
    return editedText;
  } else {
    // Для коротких текстов или fallback просто нормализуем
    console.log('[YouTube Transcription] Text is short or fallback, normalizing only');
    return normalizeTranscriptionText(combinedText);
  }
}

/**
 * Нормализует транскрипцию: убирает лишние пробелы, исправляет базовую пунктуацию
 */
function normalizeTranscriptionText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Убираем множественные пробелы
    .replace(/\s+([.,!?;:])/g, '$1') // Убираем пробелы перед знаками препинания
    .replace(/([.,!?;:])\s*([.,!?;:])/g, '$1') // Убираем дублирующиеся знаки
    .replace(/\n{3,}/g, '\n\n') // Убираем множественные переносы строк
    .trim();
}

/**
 * Редактирует транскрипцию через GPT-4: убирает лишнее, исправляет пунктуацию, разбивает на абзацы
 * (Используется только если нужно улучшить качество, но замедляет процесс)
 */
async function editTranscriptionWithGPT(rawText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Используем gpt-4o для редактирования транскрипции
      messages: [
        {
          role: 'system',
          content: `You are an expert text editor. Your task is to edit and format a video transcription.

INSTRUCTIONS:
1. Remove filler words, repetitions, and unnecessary interjections (um, uh, like, etc.)
2. Fix punctuation and capitalization
3. Break text into logical paragraphs without distorting meaning
4. Preserve all important information and meaning
5. Maintain the original language and style
6. Remove timestamps and technical artifacts if present
7. Make the text readable and well-structured
8. Do not add information that is not in the original text
9. Return only the edited text, no additional comments or explanations`,
        },
        {
          role: 'user',
          content: `Edit and format the following video transcription. Preserve all important information and meaning:\n\n${rawText.substring(0, 100000)}`, // Ограничиваем размер для GPT (100k символов)
        },
      ],
      temperature: 0.3, // Низкая температура для точности
      max_tokens: 16000, // Увеличенный лимит для длинных транскрипций
    });

    const editedText = response.choices[0]?.message?.content || rawText;

    // Если GPT вернул слишком короткий текст, используем оригинал
    if (editedText.length < rawText.length * 0.3) {
      console.warn('[YouTube Transcription] GPT returned too short text, using original');
      return rawText;
    }

    return editedText;
  } catch (error) {
    console.error('[YouTube Transcription] Failed to edit with GPT, using original text:', error);
    // В случае ошибки возвращаем оригинальный текст
    return rawText;
  }
}

