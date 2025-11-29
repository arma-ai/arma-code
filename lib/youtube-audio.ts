import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Извлекает video ID из YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Сжимает аудио файл для соответствия лимиту OpenAI (25MB)
 * Использует ffmpeg для конвертации в моно с низким битрейтом
 */
async function compressAudioIfNeeded(inputPath: string): Promise<string> {
  const stats = await fs.promises.stat(inputPath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`[YouTube Audio] File size: ${fileSizeMB.toFixed(2)} MB`);

  // OpenAI лимит 25MB, оставляем запас
  if (fileSizeMB < 24) {
    console.log('[YouTube Audio] File size is acceptable, no compression needed');
    return inputPath;
  }

  console.log('[YouTube Audio] File too large, compressing...');

  // Создаем путь для сжатого файла
  const compressedPath = inputPath.replace('.mp3', '_compressed.mp3');

  try {
    // Проверяем наличие ffmpeg
    try {
      await execAsync('which ffmpeg');
    } catch {
      console.warn('[YouTube Audio] ffmpeg not found, cannot compress. Proceeding with original file.');
      return inputPath;
    }

    // Сжимаем: моно канал, 64k битрейт (хорошо для речи)
    const compressCommand = `ffmpeg -i "${inputPath}" -ac 1 -ar 16000 -b:a 64k "${compressedPath}" -y`;

    console.log('[YouTube Audio] Compressing with command:', compressCommand);
    await execAsync(compressCommand, {
      timeout: 180000, // 3 минуты
      maxBuffer: 10 * 1024 * 1024,
    });

    // Проверяем размер сжатого файла
    const compressedStats = await fs.promises.stat(compressedPath);
    const compressedSizeMB = compressedStats.size / (1024 * 1024);

    console.log(`[YouTube Audio] Compressed size: ${compressedSizeMB.toFixed(2)} MB`);

    // Удаляем оригинал
    await fs.promises.unlink(inputPath);

    return compressedPath;
  } catch (error) {
    console.error('[YouTube Audio] Compression failed:', error);
    // Если сжатие не удалось, пробуем использовать оригинал
    if (fs.existsSync(compressedPath)) {
      await fs.promises.unlink(compressedPath);
    }
    return inputPath;
  }
}

/**
 * Скачивает аудио из YouTube видео и возвращает путь к файлу
 * Использует yt-dlp (должен быть установлен в системе)
 */
export async function downloadYouTubeAudio(youtubeUrl: string): Promise<string> {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Создаем временную директорию
  const tempDir = path.join(os.tmpdir(), `youtube-audio-${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `${videoId}.mp3`);

  try {
    // Проверяем наличие yt-dlp
    let ytDlpCommand = 'yt-dlp';
    try {
      await execAsync('which yt-dlp');
    } catch {
      // Пробуем yt-dlp через python
      try {
        await execAsync('python3 -m yt_dlp --version');
        ytDlpCommand = 'python3 -m yt_dlp';
      } catch {
        throw new Error('yt-dlp is not installed. Please install it: pip install yt-dlp or brew install yt-dlp');
      }
    }

    // Скачиваем аудио в формате mp3 с низким битрейтом сразу
    // Используем --no-playlist чтобы скачать только одно видео
    // --audio-quality 9 = самое низкое качество (достаточно для транскрипции)
    const command = `${ytDlpCommand} -x --audio-format mp3 --audio-quality 9 --no-playlist -o "${outputPath}" "${youtubeUrl}"`;

    console.log('[YouTube Audio] Downloading audio with command:', command);
    await execAsync(command, {
      timeout: 300000, // 5 минут таймаут
      maxBuffer: 10 * 1024 * 1024, // 10MB буфер
    });

    // Проверяем, что файл создан
    let finalPath = outputPath;
    if (!fs.existsSync(outputPath)) {
      // Пробуем найти файл с другим расширением
      const files = await fs.promises.readdir(tempDir);
      const audioFile = files.find(f => f.startsWith(videoId));

      if (audioFile) {
        const actualPath = path.join(tempDir, audioFile);
        // Переименовываем в mp3 если нужно
        if (!actualPath.endsWith('.mp3')) {
          const newPath = path.join(tempDir, `${videoId}.mp3`);
          await fs.promises.rename(actualPath, newPath);
          finalPath = newPath;
        } else {
          finalPath = actualPath;
        }
      } else {
        throw new Error('Audio file was not downloaded');
      }
    }

    // Сжимаем если файл слишком большой
    const compressedPath = await compressAudioIfNeeded(finalPath);

    return compressedPath;
  } catch (error) {
    // Очищаем временную директорию при ошибке
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch { }

    throw error;
  }
}

/**
 * Удаляет временный аудио файл
 */
export async function cleanupAudioFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      // Пробуем удалить родительскую директорию
      const dir = path.dirname(filePath);
      try {
        const files = await fs.promises.readdir(dir);
        if (files.length === 0) {
          await fs.promises.rmdir(dir);
        }
      } catch { }
    }
  } catch (error) {
    console.error('Failed to cleanup audio file:', error);
  }
}

