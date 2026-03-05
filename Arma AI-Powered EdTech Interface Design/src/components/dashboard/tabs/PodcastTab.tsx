import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Play, Download, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { materialsApi } from '../../../services/api';
import type { Material } from '../../../types/api';

export function PodcastTab({ material, onRefetch }: { material: Material; onRefetch: () => Promise<void> | void }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (material.podcast_audio_url) {
            // Build full URL for audio (backend returns relative path like /storage/...)
            const audioUrl = material.podcast_audio_url.startsWith('http')
                ? material.podcast_audio_url
                : `http://localhost:8000${material.podcast_audio_url}`;

            const audio = new Audio(audioUrl);
            audio.addEventListener('loadedmetadata', () => {
                setDuration(audio.duration);
            });
            audio.addEventListener('timeupdate', () => {
                setCurrentTime(audio.currentTime);
            });
            audio.addEventListener('ended', () => {
                setIsPlaying(false);
            });
            setAudioElement(audio);
            return () => {
                audio.pause();
                audio.remove();
            };
        }
    }, [material.podcast_audio_url]);

    const handleGeneratePodcast = async () => {
        try {
            setIsGenerating(true);
            toast.info('Generating podcast script...');

            // First generate script
            const scriptResponse = await materialsApi.generatePodcastScript(material.id);
            toast.success('Script generated! Now generating audio with Edge TTS...');

            // Then generate audio using Edge TTS (free, high-quality Microsoft TTS)
            const audioResponse = await materialsApi.generatePodcastAudio(material.id, 'edge');
            toast.success(`Podcast generated successfully using ${audioResponse.provider}!`);

            // Refresh material data and wait for it
            await onRefetch();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to generate podcast');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlayPause = () => {
        if (!audioElement) return;

        if (isPlaying) {
            audioElement.pause();
        } else {
            audioElement.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioElement) return;
        const time = parseFloat(e.target.value);
        audioElement.currentTime = time;
        setCurrentTime(time);
    };

    const handleDownload = () => {
        if (!material.podcast_audio_url) return;

        // Build full URL for download
        const audioUrl = material.podcast_audio_url.startsWith('http')
            ? material.podcast_audio_url
            : `http://localhost:8000${material.podcast_audio_url}`;

        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `${material.title}_podcast.mp3`;
        a.click();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Show audio player if podcast exists
    if (material.podcast_audio_url && material.podcast_script) {
        // Calculate which script line should be shown based on time
        // For simplicity, we'll divide total duration by number of lines
        const currentLineIndex = material.podcast_script.length > 0 && duration > 0
            ? Math.floor((currentTime / duration) * material.podcast_script.length)
            : 0;
        const currentLine = material.podcast_script[Math.min(currentLineIndex, material.podcast_script.length - 1)];

        return (
            <div className="h-full flex flex-col overflow-y-auto scrollbar-hide">
                {/* TOP SECTION - Icon, Title, Player */}
                <div className="flex flex-col items-center pt-16 pb-8 px-8 border-b border-white/5">
                    {/* Podcast Icon */}
                    <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white mb-8 border border-white/10 shadow-2xl relative">
                        <Headphones size={64} />
                        {isPlaying && <div className="absolute inset-0 bg-white/5 rounded-3xl animate-pulse" />}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-medium text-white mb-2 text-center max-w-2xl">{material.title}</h2>
                    <p className="text-white/40 text-sm mb-10 text-center">
                        Generated conversation about {material.title}
                    </p>

                    {/* Audio Player */}
                    <div className="w-full max-w-2xl bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                        {/* Progress Bar */}
                        <div className="mb-6">
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                            />
                            <div className="flex justify-between text-xs text-white/40 mt-2">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={handlePlayPause}
                                className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                            >
                                {isPlaying ? (
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-5 bg-black rounded-full" />
                                        <div className="w-1.5 h-5 bg-black rounded-full" />
                                    </div>
                                ) : (
                                    <Play size={28} fill="currentColor" className="ml-1" />
                                )}
                            </button>

                            <button
                                onClick={handleDownload}
                                className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                title="Download podcast"
                            >
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION - Current Subtitles/Transcript */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-h-[400px]">
                    <div className="w-full max-w-3xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentLineIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="text-center"
                            >
                                {/* Speaker Label */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-sm font-medium text-primary">{currentLine?.speaker || 'Host A'}</span>
                                </div>

                                {/* Current Text */}
                                <p className="text-3xl md:text-4xl font-light text-white leading-relaxed mb-12">
                                    {currentLine?.text || 'Starting podcast...'}
                                </p>

                                {/* Progress indicator */}
                                <div className="flex items-center justify-center gap-2 flex-wrap max-w-xl mx-auto">
                                    {material.podcast_script.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-1 rounded-full transition-all ${idx === currentLineIndex
                                                    ? 'w-8 bg-primary'
                                                    : idx < currentLineIndex
                                                        ? 'w-4 bg-primary/30'
                                                        : 'w-2 bg-white/10'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    // Show generation UI
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white mb-6 border border-white/10 shadow-2xl relative">
                <Headphones size={48} />
                {isGenerating && <div className="absolute inset-0 bg-white/5 rounded-3xl animate-pulse" />}
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Podcast Overview</h2>
            <p className="text-white/40 text-sm mb-8">
                Podcast has not been generated yet
            </p>

            <button
                onClick={handleGeneratePodcast}
                disabled={isGenerating}
                className="px-8 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles size={20} />
                        Generate Podcast
                    </>
                )}
            </button>
        </div>
    );
}
