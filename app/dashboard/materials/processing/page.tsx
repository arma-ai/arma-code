'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMaterialProcessingStatus } from '@/app/actions/getProcessingStatus';
import { getMaterialInfo } from '@/app/actions/getMaterialInfo';
import { getMaterialFullText } from '@/app/actions/materials';
import Logo from '@/app/components/Logo';
import { startProcessing } from '@/app/actions/startProcessing';

function extractYouTubeVideoId(url: string): string | null {
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

export default function ProcessingPage() {
  const router = useRouter();
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isProcessingStarted, setIsProcessingStarted] = useState(false);

  // Получаем materialId из URL напрямую
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) {
        setMaterialId(id);
        console.log('[ProcessingPage] Material ID:', id);

        // Trigger processing immediately
        if (!isProcessingStarted) {
          setIsProcessingStarted(true);
          startProcessing(id).then(() => {
            console.log('[ProcessingPage] Processing started successfully');
          }).catch(err => {
            console.error('[ProcessingPage] Failed to start processing:', err);
          });
        }

        // Load material info to get YouTube URL
        getMaterialInfo(id).then((material) => {
          if (material?.type === 'youtube' && material.source) {
            const videoId = extractYouTubeVideoId(material.source);
            if (videoId) {
              setYoutubeUrl(`https://www.youtube.com/embed/${videoId}`);
            }
          }
        });
      } else {
        console.error('[ProcessingPage] No material ID in URL');
        setError('Material ID is missing from URL');
      }
    }
  }, [isProcessingStarted]);

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('Starting processing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!materialId) {
      return;
    }

    console.log('[ProcessingPage] Starting progress check for material:', materialId);
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const checkProgress = async () => {
      try {
        const processingStatus = await getMaterialProcessingStatus(materialId!);

        // Обновляем прогресс
        setProgress(processingStatus.progress);

        // Обновляем статус с более понятными сообщениями
        const statusMessages: Record<string, string> = {
          'queued': 'Waiting to start...',
          'transcribing': 'Getting subtitles...',
          'Getting subtitles...': 'Getting YouTube subtitles...',
          'Downloading audio...': 'Downloading audio for Whisper...',
          'Transcribing with Whisper...': 'Transcribing audio with Whisper AI...',
          'Whisper transcription completed': 'Whisper transcription completed',
          'processing_text': 'Processing transcription...',
          'generating_summary': 'Creating summary...',
          'generating_notes': 'Generating study notes...',
          'generating_flashcards': 'Creating flashcards...',
          'generating_quiz': 'Preparing quiz...',
          'completed': 'Processing complete!',
          'failed': 'Processing failed',
        };

        setStatus(statusMessages[processingStatus.status] || processingStatus.status);

        // Пытаемся загрузить транскрипт, если он уже доступен
        if (processingStatus.hasFullText && !transcript) {
          const text = await getMaterialFullText(materialId!);
          if (text) {
            setTranscript(text);
          }
        }

        // Обновляем статус
        if (processingStatus.isComplete) {
          setProgress(100);
          setStatus('Processing complete!');
          console.log('[ProcessingPage] Processing complete, redirecting...');

          // Ждем немного и переходим на страницу материала
          setTimeout(() => {
            router.push(`/dashboard/materials/${materialId}`);
          }, 1500);

          if (interval) clearInterval(interval);
          if (timeout) clearTimeout(timeout);
        }
      } catch (error) {
        console.error('[ProcessingPage] Error checking progress:', error);
        setError(`Failed to check processing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
      }
    };

    // Первая проверка сразу
    checkProgress();

    // Проверяем каждую секунду
    interval = setInterval(checkProgress, 1000);

    // Таймаут на 15 минут (для длинных видео)
    timeout = setTimeout(() => {
      if (interval) clearInterval(interval);
      setError('Processing is taking too long. You can close this page and check back later - processing will continue in the background.');
    }, 15 * 60 * 1000);

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [materialId, router, transcript]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Processing Error</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Dashboard
            </button>
            {materialId && (
              <button
                onClick={() => router.push(`/dashboard/materials/${materialId}`)}
                className="px-6 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
              >
                View Material
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <Logo size="sm" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Processing Material</h1>
          </div>
          <div className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Status & Bar */}
          <div className="mb-8 text-center">
            <div className="mb-2 text-2xl font-bold text-gray-900">{status}</div>
            <p className="text-gray-500 text-sm mb-8">AI is analyzing your video content to generate study materials...</p>

            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden p-1">
              <div
                className="bg-black h-full rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
              </div>
            </div>
          </div>

          {/* Preview (YouTube or PDF) */}
          {youtubeUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-black aspect-video mb-8 relative group">
              <iframe
                src={youtubeUrl}
                className="w-full h-full"
                title="YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-2xl"></div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50 aspect-[4/3] mb-8 relative flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 font-medium">Processing PDF Document...</p>
              </div>
            </div>
          )}

          {/* Steps Indicator */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border transition-all duration-300 ${progress > 5 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${progress > 5 ? 'bg-green-100' : 'bg-gray-200 text-gray-500'}`}>1</div>
                <span className="text-xs font-semibold">Transcribing</span>
              </div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all duration-300 ${progress > 50 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${progress > 50 ? 'bg-green-100' : 'bg-gray-200 text-gray-500'}`}>2</div>
                <span className="text-xs font-semibold">Analyzing</span>
              </div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all duration-300 ${progress > 90 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${progress > 90 ? 'bg-green-100' : 'bg-gray-200 text-gray-500'}`}>3</div>
                <span className="text-xs font-semibold">Generating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


