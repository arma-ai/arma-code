import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ChevronLeft, ChevronRight, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

export interface Flashcard {
  id?: string;
  question: string;
  answer: string;
}

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onComplete: (viewedCount: number) => void;
  materialId?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  flashcards,
  onComplete,
  materialId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedCards, setViewedCards] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  const totalCards = flashcards.length;
  const progress = ((currentIndex + 1) / totalCards) * 100;

  // Mark current card as viewed when it comes into view
  useEffect(() => {
    setViewedCards((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);
      return newSet;
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setDirection(1);
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    } else {
      // All cards viewed - allow completion
      onComplete(viewedCards.size);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
      }, 150);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === ' ' || e.key === 'Enter') {
      handleFlip();
    }
  };

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-white/60">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Флешкарточки еще не сгенерированы</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-3xl mx-auto p-6" onKeyDown={handleKeyPress} tabIndex={0}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Флешкарточки</h2>
          <span className="text-sm text-white/60">
            {currentIndex + 1} из {totalCards}
          </span>
        </div>
        
        <Progress value={progress} className="h-2 bg-white/10" />
        
        <div className="flex items-center justify-between mt-2 text-xs text-white/40">
          <span>Просмотрено: {viewedCards.size} из {totalCards}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative h-[400px] perspective-1000 mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {/* Card Container */}
            <div
              className="relative w-full h-full cursor-pointer"
              onClick={handleFlip}
              style={{ perspective: '1000px' }}
            >
              <motion.div
                className="absolute inset-0 w-full h-full"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front of Card */}
                <div
                  className="absolute inset-0 w-full h-full backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="h-full bg-gradient-to-br from-[#121215] to-[#1a1a1f] rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-[#FF8A3D] uppercase tracking-wider">
                        Вопрос
                      </span>
                      <span className="text-xs text-white/40">
                        {currentIndex + 1} / {totalCards}
                      </span>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xl text-white text-center leading-relaxed">
                        {currentCard.question}
                      </p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/40">
                      <RotateCw className="w-4 h-4" />
                      <span>Нажмите чтобы увидеть ответ</span>
                    </div>
                  </div>
                </div>

                {/* Back of Card */}
                <div
                  className="absolute inset-0 w-full h-full backface-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="h-full bg-gradient-to-br from-[#FF8A3D]/10 to-[#F59E0B]/10 rounded-2xl border border-[#FF8A3D]/30 p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-[#FF8A3D] uppercase tracking-wider">
                        Ответ
                      </span>
                      <CheckCircle className="w-5 h-5 text-[#FF8A3D]" />
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xl text-white text-center leading-relaxed">
                        {currentCard.answer}
                      </p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/40">
                      <span>Нажмите чтобы вернуться к вопросу</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Button
          onClick={handleFlip}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 mr-2 ${isFlipped ? 'rotate-180' : ''}`} />
          {isFlipped ? 'Вопрос' : 'Ответ'}
        </Button>

        <Button
          onClick={handleNext}
          className={`flex-1 cursor-pointer ${
            currentIndex === totalCards - 1
              ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {currentIndex === totalCards - 1 ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Завершить
            </>
          ) : (
            <>
              Далее
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Keyboard Hints */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
          <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
          Навигация
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">Пробел</kbd>
          Перевернуть
        </span>
      </div>

      {/* Completion Message */}
      {viewedCards.size === totalCards && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-[#FF8A3D]/20 border border-[#FF8A3D]/30 rounded-xl text-center"
        >
          <p className="text-white font-medium">
            🎉 Отлично! Вы просмотрели все карточки
          </p>
          <p className="text-sm text-white/60 mt-1">
            Нажмите "Завершить" чтобы продолжить
          </p>
        </motion.div>
      )}
    </div>
  );
};
