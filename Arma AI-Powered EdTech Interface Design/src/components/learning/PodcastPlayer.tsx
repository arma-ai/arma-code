import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Headphones, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';

interface PodcastPlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  onComplete: () => void;
  onProgress?: (progressSeconds: number) => void;
  initialProgress?: number; // seconds
  playbackSpeed?: number;
  voiceType?: string;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  audioUrl,
  durationSeconds = 0,
  onComplete,
  onProgress,
  initialProgress = 0,
  playbackSpeed = 1.0,
  voiceType,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [duration, setDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(playbackSpeed);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = volume;
      
      if (initialProgress > 0) {
        audioRef.current.currentTime = initialProgress;
      }
    }
  }, [speed, volume, initialProgress]);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setCurrentTime(current);
      
      // Report progress every 5 seconds
      if (Math.floor(current) % 5 === 0 && onProgress) {
        onProgress(current);
      }
      
      // Check completion (95% of duration)
      if (duration > 0 && current >= duration * 0.95) {
        setIsCompleted(true);
        setIsPlaying(false);
        onComplete();
      }
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle audio ended
  const handleEnded = () => {
    setIsPlaying(false);
    setIsCompleted(true);
    onComplete();
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(speed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error:', e)}
      />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#F59E0B] flex items-center justify-center">
          <Headphones className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Аудио версия материала</h2>
        <p className="text-sm text-white/60">
          {voiceType ? `Голос: ${voiceType}` : 'AI сгенерированный подкаст'}
        </p>
      </div>

      {/* Player Card */}
      <div className="bg-gradient-to-br from-[#121215] to-[#1a1a1f] rounded-2xl border border-white/10 p-8 shadow-2xl mb-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="mb-2"
          />
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            onClick={() => handleSkip(-15)}
            variant="ghost"
            size="icon"
            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>

          <Button
            onClick={() => handleSkip(30)}
            variant="ghost"
            size="icon"
            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center justify-between">
          {/* Volume */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-white/60" />
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>

          {/* Speed Control */}
          <Button
            onClick={handleSpeedChange}
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer min-w-[80px]"
          >
            {speed}x
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white cursor-pointer"
            onClick={() => {
              const a = document.createElement('a');
              a.href = audioUrl;
              a.download = 'podcast.mp3';
              a.click();
            }}
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Completion Status */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-xl text-center"
        >
          <p className="text-white font-medium">
            ✓ Подкаст прослушан до конца
          </p>
          <p className="text-sm text-white/60 mt-1">
            Вы готовы к следующей проверке знаний
          </p>
        </motion.div>
      )}

      {/* Speed Tips */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
        <span>Скорость воспроизведения:</span>
        <div className="flex gap-1">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s);
                if (audioRef.current) {
                  audioRef.current.playbackRate = s;
                }
              }}
              className={`px-2 py-1 rounded ${
                speed === s
                  ? 'bg-[#FF8A3D] text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">Пробел</kbd>
          Play/Pause
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
          <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
          Перемотка
        </span>
      </div>
    </div>
  );
};
