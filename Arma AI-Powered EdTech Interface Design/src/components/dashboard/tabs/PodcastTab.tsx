import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Play, Pause, Download, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { materialsApi } from '../../../services/api';
import { useTranslation } from '../../../i18n/I18nContext';
import type { Material } from '../../../types/api';

export interface PodcastTabProps {
    material: Material;
    onRefetch: () => Promise<void> | void;
}

export function PodcastTab({ material, onRefetch }: PodcastTabProps) {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!material.podcast_audio_url) return;

        const audioUrl = material.podcast_audio_url.startsWith('http')
            ? material.podcast_audio_url
            : `http://localhost:8000${material.podcast_audio_url}`;

        const audio = new Audio(audioUrl);
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
        audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
        audio.addEventListener('ended', () => setIsPlaying(false));
        setAudioElement(audio);
        return () => { audio.pause(); audio.remove(); };
    }, [material.podcast_audio_url]);

    const handleGeneratePodcast = async () => {
        try {
            setIsGenerating(true);
            toast.info('Generating podcast script...');
            await materialsApi.generatePodcastScript(material.id);
            toast.success('Script generated! Now generating audio...');
            const audioResponse = await materialsApi.generatePodcastAudio(material.id, 'edge');
            toast.success(`Podcast generated using ${audioResponse.provider}!`);
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

    const seekToRatio = (ratio: number) => {
        if (!audioElement) return;
        const time = ratio * duration;
        audioElement.currentTime = time;
        setCurrentTime(time);
    };

    const getRatioFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        seekToRatio(getRatioFromEvent(e));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        seekToRatio(getRatioFromEvent(e));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        seekToRatio(getRatioFromEvent(e));
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleDownload = () => {
        if (!material.podcast_audio_url) return;
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

    if (material.podcast_audio_url && material.podcast_script) {
        const script = material.podcast_script;
        const currentLineIndex = script.length > 0 && duration > 0
            ? Math.min(Math.floor((currentTime / duration) * script.length), script.length - 1)
            : 0;
        const currentLine = script[currentLineIndex];
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        return (
            <div className="flex flex-col max-w-2xl mx-auto px-4 py-8 gap-8">

                {/* Subtitle display */}
                <div className="flex flex-col items-center justify-center text-center py-10">
                    <motion.div
                        animate={isPlaying
                            ? { y: [0, -5, 0], scale: [1, 1.08, 1] }
                            : { y: 0, scale: 1 }
                        }
                        transition={isPlaying
                            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.3 }
                        }
                        className="mb-6"
                    >
                        <Headphones size={32} className="text-primary/70" />
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentLineIndex}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            className="w-full"
                        >
                            {/* Speaker badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
                                <div className={`w-2 h-2 rounded-full bg-primary ${isPlaying ? 'animate-pulse' : ''}`} />
                                <span className="text-xs font-semibold text-primary tracking-wide">
                                    {currentLine?.speaker || 'Host A'}
                                </span>
                            </div>

                            {/* Current line text */}
                            <p className="text-xl md:text-2xl font-light text-white/90 leading-relaxed px-2 mt-2 mb-4">
                                {currentLine?.text || '...'}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Script progress dots */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-sm mx-auto mt-8">
                        {script.map((_, idx) => (
                            <div
                                key={idx}
                                className={`rounded-full transition-all duration-300 ${
                                    idx === currentLineIndex
                                        ? 'w-6 h-1.5 bg-primary'
                                        : idx < currentLineIndex
                                            ? 'w-3 h-1 bg-primary/30'
                                            : 'w-2 h-1 bg-white/10'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Player controls */}
                <div className="shrink-0 bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                    {/* Custom progress bar */}
                    <div
                        className="relative py-2 cursor-pointer"
                        onClick={handleProgressClick}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Track */}
                        <div
                            ref={progressBarRef}
                            className="relative rounded-full overflow-hidden"
                            style={{ height: '4px', background: 'rgba(255,255,255,0.1)' }}
                        >
                            {/* Fill */}
                            <div
                                style={{
                                    height: '100%',
                                    width: `${progress}%`,
                                    background: '#ff8a3d',
                                    borderRadius: '9999px',
                                    transition: 'width 0.1s linear',
                                }}
                            />
                        </div>
                        {/* Thumb */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md pointer-events-none"
                            style={{
                                left: `${progress}%`,
                                width: '12px',
                                height: '12px',
                                background: '#ff8a3d',
                            }}
                        />
                    </div>

                    {/* Time labels */}
                    <div className="flex justify-between text-xs text-white/30">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handleDownload}
                            className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                            title="Download"
                        >
                            <Download size={18} />
                        </button>

                        <button
                            onClick={handlePlayPause}
                            className="w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_24px_rgba(255,138,61,0.3)]"
                        >
                            {isPlaying
                                ? <Pause size={22} fill="currentColor" />
                                : <Play size={22} fill="currentColor" className="ml-0.5" />
                            }
                        </button>

                        {/* Spacer to balance layout */}
                        <div className="w-9" />
                    </div>
                </div>
            </div>
        );
    }

    // Empty state — generate
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                <Headphones size={36} className="text-primary" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Podcast Overview</h2>
            <p className="text-white/40 text-sm mb-8">Podcast has not been generated yet</p>

            <button
                onClick={handleGeneratePodcast}
                disabled={isGenerating}
                className="px-8 py-4 bg-primary text-black rounded-xl font-bold text-base hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        Generate Podcast
                    </>
                )}
            </button>
        </div>
    );
}
