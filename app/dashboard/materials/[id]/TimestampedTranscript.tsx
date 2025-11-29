'use client';

import { useEffect, useState, useRef } from 'react';
import { getTranscriptSegments, type TranscriptSegment } from '@/app/actions/getTranscriptSegments';

interface TimestampedTranscriptProps {
    materialId: string;
    videoRef?: React.RefObject<HTMLIFrameElement>;
    onNoSegments?: () => void;
}

export default function TimestampedTranscript({ materialId, videoRef, onNoSegments }: TimestampedTranscriptProps) {
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(true);
    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Загрузка сегментов
    useEffect(() => {
        async function loadSegments() {
            try {
                const data = await getTranscriptSegments(materialId);
                if (data.length === 0 && onNoSegments) {
                    onNoSegments();
                }
                setSegments(data);
            } catch (error) {
                console.error('Failed to load transcript segments:', error);
                if (onNoSegments) onNoSegments();
            } finally {
                setLoading(false);
            }
        }

        loadSegments();
    }, [materialId, onNoSegments]);

    // Отслеживание текущего времени видео
    useEffect(() => {
        if (!videoRef?.current || segments.length === 0) return;

        const interval = setInterval(() => {
            try {
                const iframe = videoRef.current;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
                }
            } catch (error) {
                console.error('Failed to get video time:', error);
            }
        }, 100);

        const handleMessage = (event: MessageEvent) => {
            // Проверяем origin для безопасности, но YouTube может использовать разные домены
            // if (event.origin !== 'https://www.youtube.com') return;

            try {
                // Некоторые сообщения могут быть не JSON
                if (typeof event.data !== 'string') return;

                const data = JSON.parse(event.data);
                if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
                    const currentTime = data.info.currentTime;
                    updateCurrentSegment(currentTime);
                }
            } catch (error) {
                // Игнорируем ошибки парсинга
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            clearInterval(interval);
            window.removeEventListener('message', handleMessage);
        };
    }, [videoRef, segments]);

    // Обновление текущего сегмента на основе времени
    const updateCurrentSegment = (currentTime: number) => {
        const index = segments.findIndex(
            (segment) => currentTime >= segment.start_time && currentTime <= segment.end_time
        );

        if (index !== currentSegmentIndex) {
            setCurrentSegmentIndex(index);

            // Автоматическая прокрутка к текущему сегменту
            if (index >= 0 && segmentRefs.current[index]) {
                segmentRefs.current[index]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
    };

    // Клик по сегменту для перемотки видео
    const handleSegmentClick = (segment: TranscriptSegment) => {
        if (!videoRef?.current) return;

        try {
            const iframe = videoRef.current;
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    `{"event":"command","func":"seekTo","args":[${segment.start_time}, true]}`,
                    '*'
                );
                // Также запускаем воспроизведение, если оно было на паузе
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
        } catch (error) {
            console.error('Failed to seek video:', error);
        }
    };

    // Форматирование времени
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500">
                <div className="animate-pulse">Loading transcript timeline...</div>
            </div>
        );
    }

    if (segments.length === 0) {
        return null; // Родитель покажет fallback
    }

    return (
        <div className="space-y-1 p-4 max-h-[600px] overflow-y-auto bg-gray-50 rounded-xl border border-gray-200">
            {segments.map((segment, index) => {
                const isActive = index === currentSegmentIndex;
                return (
                    <div
                        key={segment.id}
                        ref={(el) => { segmentRefs.current[index] = el; }}
                        onClick={() => handleSegmentClick(segment)}
                        className={`
              group flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200
              ${isActive
                                ? 'bg-white border-l-4 border-black shadow-md scale-[1.01]'
                                : 'hover:bg-gray-100 border-l-4 border-transparent'
                            }
            `}
                    >
                        <span
                            className={`
                text-xs font-mono font-medium flex-shrink-0 mt-1 w-12 text-right
                ${isActive ? 'text-black font-bold' : 'text-gray-400 group-hover:text-gray-600'}
              `}
                        >
                            {formatTime(segment.start_time)}
                        </span>
                        <p
                            className={`
                text-sm leading-relaxed
                ${isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}
              `}
                        >
                            {segment.text}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
