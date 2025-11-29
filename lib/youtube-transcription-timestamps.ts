import OpenAI from 'openai';
import { downloadYouTubeAudio, cleanupAudioFile, extractYouTubeVideoId } from './youtube-audio';
import * as fs from 'fs';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptSegment {
    id: number;
    start: number;
    end: number;
    text: string;
}

export interface TranscriptionWithTimestamps {
    text: string;
    segments: TranscriptSegment[];
}

/**
 * Получает транскрипцию YouTube видео с временными метками
 * Гарантированно возвращает результат или выбрасывает ошибку
 */
export async function getYouTubeTranscriptionWithTimestamps(
    youtubeUrl: string,
    onProgress?: (progress: number, status: string) => Promise<void>
): Promise<TranscriptionWithTimestamps> {
    const videoId = extractYouTubeVideoId(youtubeUrl);

    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    let audioFilePath: string | null = null;

    try {
        console.log('[YouTube Transcription] Downloading audio for Whisper...');
        if (onProgress) await onProgress(0.3, 'Downloading audio...');

        audioFilePath = await downloadYouTubeAudio(youtubeUrl);
        console.log('[YouTube Transcription] Audio downloaded:', audioFilePath);

        if (onProgress) await onProgress(0.5, 'Transcribing with Whisper...');

        // Транскрибируем через Whisper с временными метками
        console.log('[YouTube Transcription] Transcribing with Whisper with timestamps...');
        const audioFile = fs.createReadStream(audioFilePath);

        // Используем verbose_json для получения сегментов
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });

        if (onProgress) await onProgress(0.9, 'Processing transcription...');

        // Обрабатываем результат
        const segments: TranscriptSegment[] = [];
        let fullText = '';

        // Проверяем структуру ответа Whisper
        // Типы могут варьироваться, поэтому используем безопасную проверку
        const responseObj = transcription as any;

        if (responseObj.segments && Array.isArray(responseObj.segments)) {
            responseObj.segments.forEach((segment: any, index: number) => {
                const segmentData: TranscriptSegment = {
                    id: index,
                    start: segment.start || 0,
                    end: segment.end || 0,
                    text: (segment.text || '').trim(),
                };
                segments.push(segmentData);
                fullText += segment.text + ' ';
            });
        }

        // Если сегментов нет, но есть текст
        if (segments.length === 0 && responseObj.text) {
            fullText = responseObj.text;
        }

        console.log('[YouTube Transcription] Transcription completed with', segments.length, 'segments');

        return {
            text: fullText.trim(),
            segments,
        };
    } catch (error) {
        console.error('[YouTube Transcription] Failed to transcribe with timestamps:', error);
        throw error;
    } finally {
        // Очищаем временный файл
        if (audioFilePath) {
            await cleanupAudioFile(audioFilePath);
        }
    }
}
