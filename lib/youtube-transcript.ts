import { YoutubeTranscript } from 'youtube-transcript';

export async function getYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please check the URL format.');
  }

  // Пробуем получить транскрипт
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Объединяем все текстовые сегменты в один текст
    const fullText = transcriptItems
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (fullText && fullText.length > 0) {
      return fullText;
    }
  } catch (error) {
    console.log('Transcript not available, using fallback method:', error);
  }

  // Если транскрипт недоступен, используем fallback - получаем описание через oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      const title = data.title || '';
      const description = data.description || '';
      
      // Создаем базовый контент из метаданных
      const fallbackText = `${title}\n\n${description}\n\nЭто видео добавлено без транскрипта. AI будет работать с доступной информацией о видео. Для лучших результатов рекомендуется использовать видео с включенными субтитрами.`;
      
      if (fallbackText.trim().length > 0) {
        return fallbackText;
      }
    }
  } catch (error) {
    console.log('Failed to get oEmbed data:', error);
  }

  // Если ничего не получилось, возвращаем минимальный контент
  return `YouTube Video: ${videoId}\n\nЭто видео было добавлено, но транскрипт недоступен. AI будет работать с ограниченной информацией. Рекомендуется использовать видео с включенными субтитрами для лучших результатов.`;
}

function extractYouTubeVideoId(url: string): string | null {
  // Поддержка различных форматов YouTube URL
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

