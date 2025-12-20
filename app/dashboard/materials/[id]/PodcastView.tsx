'use client';

import { useState } from 'react';
import { generatePodcastScript, generatePodcastAudio } from '@/lib/api/podcast';

interface PodcastViewProps {
    materialId: string;
    podcastScript: Array<{speaker: string; text: string}> | null;
    podcastAudioUrl: string | null;
    onUpdate: () => void;
}

interface ScriptLine {
    speaker: string;
    text: string;
}

export default function PodcastView({ materialId, podcastScript, podcastAudioUrl, onUpdate }: PodcastViewProps) {
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

    const script: ScriptLine[] | null = podcastScript;

    const handleGenerateScript = async () => {
        setIsGeneratingScript(true);
        setError(null);
        try {
            await generatePodcastScript(materialId);
            onUpdate();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate script');
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateAudio = async () => {
        setIsGeneratingAudio(true);
        setError(null);
        try {
            await generatePodcastAudio(materialId);
            onUpdate();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate audio');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    // Если нет скрипта - показываем экран генерации
    if (!script || script.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="max-w-md">
                    {/* Иконка подкаста */}
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                        <div className="relative p-8 bg-white rounded-full shadow-xl">
                            <svg className="w-20 h-20 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Создайте AI Подкаст
                    </h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Превратите ваш материал в увлекательный подкаст с диалогом двух ведущих, которые обсуждают ключевые темы.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript}
                        className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none font-semibold"
                    >
                        {isGeneratingScript ? (
                            <div className="flex items-center gap-3">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Генерируем скрипт...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Сгенерировать Подкаст</span>
                            </div>
                        )}
                    </button>

                    <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                        <div className="p-4">
                            <div className="text-2xl font-bold text-purple-600">AI</div>
                            <div className="text-xs text-gray-500 mt-1">Генерация</div>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl font-bold text-blue-600">5-10</div>
                            <div className="text-xs text-gray-500 mt-1">Минут</div>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl font-bold text-indigo-600">2</div>
                            <div className="text-xs text-gray-500 mt-1">Ведущих</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Получаем URL аудио
    const audioUrl = podcastAudioUrl ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${podcastAudioUrl}` : null;

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-purple-50/30">
            {/* Аудиоплеер */}
            <div className="p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto">
                    {audioUrl ? (
                        <div className="space-y-4">
                            {/* Статус */}
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-medium">Подкаст готов к прослушиванию</span>
                            </div>

                            {/* Аудиоплеер */}
                            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-2xl shadow-xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold text-lg">AI Подкаст</h3>
                                        <p className="text-white/80 text-sm">Диалог двух ведущих</p>
                                    </div>
                                </div>
                                <audio
                                    controls
                                    className="w-full"
                                    src={audioUrl}
                                    onPlay={() => setCurrentSpeaker(null)}
                                >
                                    Ваш браузер не поддерживает аудио элемент.
                                </audio>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-dashed border-purple-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Скрипт готов!</h4>
                                        <p className="text-sm text-gray-500">Сгенерируйте аудио для прослушивания</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateAudio}
                                    disabled={isGeneratingAudio}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                                >
                                    {isGeneratingAudio ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Генерация аудио...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Озвучить Подкаст</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Скрипт подкаста */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-3 mb-8">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900">Транскрипт Подкаста</h2>
                    </div>

                    {script.map((line, index) => {
                        const isHostA = line.speaker === 'Host A';
                        const isHostB = line.speaker === 'Host B';

                        return (
                            <div
                                key={index}
                                className={`flex gap-4 ${isHostB ? 'flex-row-reverse' : ''} animate-fade-in`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Аватар */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                                    isHostA
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                        : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                                }`}>
                                    {isHostA ? 'A' : 'B'}
                                </div>

                                {/* Сообщение */}
                                <div className={`flex-1 max-w-2xl ${isHostB ? 'text-right' : ''}`}>
                                    <div className={`inline-block p-5 rounded-2xl shadow-md ${
                                        isHostA
                                            ? 'bg-white border-l-4 border-blue-500 rounded-tl-none'
                                            : 'bg-gradient-to-br from-purple-50 to-purple-100 border-r-4 border-purple-500 rounded-tr-none'
                                    }`}>
                                        <div className={`text-xs font-bold mb-2 ${
                                            isHostA ? 'text-blue-600' : 'text-purple-600'
                                        }`}>
                                            {line.speaker}
                                        </div>
                                        <p className="text-gray-800 leading-relaxed">
                                            {line.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
}
