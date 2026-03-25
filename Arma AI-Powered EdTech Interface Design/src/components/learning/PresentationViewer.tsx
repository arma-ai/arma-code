import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

export interface PresentationSlide {
  title: string;
  content: string;
  bullet_points?: string[];
  image_description?: string;
}

interface PresentationViewerProps {
  slides: PresentationSlide[];
  onComplete: () => void;
  isLoading?: boolean;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  slides,
  onComplete,
  isLoading = false,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewedSlides, setViewedSlides] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mark current slide as viewed
  useEffect(() => {
    setViewedSlides((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentSlideIndex);
      return newSet;
    });
  }, [currentSlideIndex]);

  const totalSlides = slides.length;
  const progress = ((currentSlideIndex + 1) / totalSlides) * 100;

  const handleNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      // All slides viewed
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-white/60">
          <div className="w-8 h-8 border-2 border-[#FF8A3D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Генерация презентации...</p>
        </div>
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-white/60">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Презентация еще не сгенерирована</p>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div
      className={`max-w-5xl mx-auto p-6 ${isFullscreen ? 'h-screen max-w-none' : ''}`}
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Презентация</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">
              {currentSlideIndex + 1} / {totalSlides}
            </span>
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Progress value={progress} className="h-2 bg-white/10" />

        <div className="flex items-center justify-between mt-2 text-xs text-white/40">
          <span>Просмотрено: {viewedSlides.size} из {totalSlides}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Slide Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative bg-gradient-to-br from-[#121215] to-[#1a1a1f] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Slide Header */}
            <div className="bg-[#FF8A3D]/10 border-b border-white/10 px-8 py-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-[#FF8A3D] uppercase tracking-wider">
                  Слайд {currentSlideIndex + 1}
                </span>
                {viewedSlides.has(currentSlideIndex) && (
                  <span className="text-xs text-[#22C55E]">✓ Просмотрено</span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white">{currentSlide.title}</h3>
            </div>

            {/* Slide Body */}
            <div className="p-8">
              <div className="mb-6">
                <p className="text-lg text-white/90 leading-relaxed">
                  {currentSlide.content}
                </p>
              </div>

              {/* Bullet Points */}
              {currentSlide.bullet_points && currentSlide.bullet_points.length > 0 && (
                <div className="space-y-3 mb-6">
                  {currentSlide.bullet_points.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#FF8A3D] flex-shrink-0 mt-2" />
                      <p className="text-white/80">{point}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Image Description Placeholder */}
              {currentSlide.image_description && (
                <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                        Визуализация
                      </p>
                      <p className="text-sm text-white/60 italic">
                        {currentSlide.image_description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slide Navigation Overlay */}
            <div className="absolute inset-y-0 left-0 flex items-center px-2">
              <Button
                onClick={handlePrev}
                disabled={currentSlideIndex === 0}
                variant="ghost"
                size="icon"
                className="h-12 w-12 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center px-2">
              <Button
                onClick={handleNext}
                variant="ghost"
                size="icon"
                className="h-12 w-12 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <Button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Button
          onClick={handleNext}
          className={`flex-1 cursor-pointer ${
            currentSlideIndex === totalSlides - 1
              ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {currentSlideIndex === totalSlides - 1 ? (
            <>
              Завершить
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Далее
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Slide Thumbnails */}
      <div className="mt-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 transition-all ${
                index === currentSlideIndex
                  ? 'border-[#FF8A3D] bg-[#FF8A3D]/20'
                  : viewedSlides.has(index)
                  ? 'border-white/20 bg-white/5 hover:border-white/40'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <span className="text-xs text-white/60">{index + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Completion Message */}
      {viewedSlides.size === totalSlides && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-[#FF8A3D]/20 border border-[#FF8A3D]/30 rounded-xl text-center"
        >
          <p className="text-white font-medium">
            🎉 Отлично! Вы просмотрели все слайды
          </p>
          <p className="text-sm text-white/60 mt-1">
            Нажмите "Завершить" чтобы продолжить
          </p>
        </motion.div>
      )}

      {/* Keyboard Hints */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
          <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
          Навигация
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">F</kbd>
          Полный экран
        </span>
      </div>
    </div>
  );
};
