'use client';

import { useState } from 'react';
import { generatePodcastScript, generatePodcastAudio } from '@/app/actions/podcast';

interface PodcastViewProps {
    materialId: string;
    podcastScript: string | null;
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

    const script: ScriptLine[] | null = podcastScript ? JSON.parse(podcastScript) : null;

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

    if (!script) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="mb-6 p-4 bg-blue-50 rounded-full">
                    <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Podcast Script Not Generated</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                    Generate an AI podcast script based on this material. You can then listen to it.
                </p>
                <button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isGeneratingScript ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Writing Script...
                        </>
                    ) : (
                        'Generate Podcast'
                    )}
                </button>
            </div>
        );
    }


    return (
        <div className="h-full flex flex-col bg-white">
            {/* Audio Player Section */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="max-w-3xl mx-auto">
                    {podcastAudioUrl ? (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                            <audio controls className="w-full" src={podcastAudioUrl || undefined}>
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div>
                                <h4 className="font-bold text-gray-900">Script Ready</h4>
                                <p className="text-sm text-gray-500">Generate audio to listen to the podcast.</p>
                            </div>
                            <button
                                onClick={handleGenerateAudio}
                                disabled={isGeneratingAudio}
                                className="px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGeneratingAudio ? 'Generating Audio...' : 'Generate Audio'}
                            </button>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
            </div>

            {/* Script Display */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    {script && script.map((line, index) => (
                        <div key={index} className={`flex gap-4 ${line.speaker === 'Host B' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${line.speaker === 'Host A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                }`}>
                                {line.speaker === 'Host A' ? 'A' : 'B'}
                            </div>
                            <div className={`flex-1 p-4 rounded-2xl ${line.speaker === 'Host A'
                                ? 'bg-gray-100 rounded-tl-none'
                                : 'bg-purple-50 rounded-tr-none'
                                }`}>
                                <div className="text-xs font-bold text-gray-500 mb-1">{line.speaker}</div>
                                <p className="text-gray-800 leading-relaxed">{line.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
