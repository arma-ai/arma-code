'use client';

import { useState, useEffect, useRef } from 'react';
import { Flashcard } from '@/app/actions/materials';
import { addXP } from '@/app/actions/progress';
import SelectableText from './SelectableText';

interface InteractiveFlashcardsProps {
  flashcards: Flashcard[];
  materialId: string;
}

export default function InteractiveFlashcards({ flashcards, materialId }: InteractiveFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [remainingCards, setRemainingCards] = useState<Flashcard[]>(flashcards);
  const [isCompleted, setIsCompleted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    // Вычисляем оставшиеся карточки
    const computedRemaining = flashcards.filter(card => !knownCards.has(card.id));

    // Обновляем список оставшихся карточек при изменении knownCards
    if (computedRemaining.length > 0) {
      // Перемешиваем массив
      const shuffled = [...computedRemaining].sort(() => Math.random() - 0.5);
      setRemainingCards(shuffled);
      // Если текущий индекс выходит за границы, сбрасываем на 0
      setCurrentIndex(prev => prev >= shuffled.length ? 0 : prev);
    } else {
      setRemainingCards([]);
    }
  }, [knownCards.size, flashcards.length]); // Используем size вместо всего объекта

  useEffect(() => {
    const computedRemaining = flashcards.filter(card => !knownCards.has(card.id));
    if (computedRemaining.length === 0 && flashcards.length > 0 && !isCompleted) {
      setIsCompleted(true);
      // Начисление XP за просмотр всех flashcards (3 XP)
      addXP(materialId, 3).then(() => {
        window.dispatchEvent(new Event('progress-updated'));
      }).catch(console.error);
    }
  }, [knownCards.size, flashcards.length, materialId, isCompleted]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnown = () => {
    if (remainingCards.length === 0) return;
    const currentCard = remainingCards[currentIndex];
    setKnownCards(new Set([...knownCards, currentCard.id]));
    setUnknownCards(new Set([...unknownCards].filter(id => id !== currentCard.id)));

    // Начисление XP за правильный ответ (3 XP)
    addXP(materialId, 3).then(() => {
      window.dispatchEvent(new Event('progress-updated'));
    }).catch(console.error);

    moveToNext();
  };

  const handleUnknown = () => {
    if (remainingCards.length === 0) return;
    const currentCard = remainingCards[currentIndex];
    setUnknownCards(new Set([...unknownCards, currentCard.id]));
    setKnownCards(new Set([...knownCards].filter(id => id !== currentCard.id)));
    moveToNext();
  };

  const moveToNext = () => {
    setIsFlipped(false);

    const computedRemaining = flashcards.filter(card => !knownCards.has(card.id));
    if (computedRemaining.length === 0) {
      // Все карточки выучены
      return;
    }

    if (currentIndex < remainingCards.length - 1) {
      // Есть еще карточки в текущем списке
      setCurrentIndex(currentIndex + 1);
    } else {
      // Дошли до конца, начинаем заново (список уже обновлен через useEffect)
      setCurrentIndex(0);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setRemainingCards(flashcards);
    setIsCompleted(false);
  };

  // Touch/Mouse handlers for swipe
  const handleStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    currentX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !cardRef.current) return;
    currentX.current = clientX;
    const deltaX = currentX.current - startX.current;
    cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.1}deg)`;
    cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 300}`;
  };

  const handleEnd = () => {
    if (!isDragging.current || !cardRef.current) return;
    const deltaX = currentX.current - startX.current;
    const threshold = 100;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right - знаю
        handleKnown();
      } else {
        // Swipe left - не знаю
        handleUnknown();
      }
    }

    // Reset card position
    cardRef.current.style.transform = '';
    cardRef.current.style.opacity = '';
    isDragging.current = false;
  };

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No flashcards available. Process the material with AI first.</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-black mb-2">All Cards Learned!</h3>
          <p className="text-lg text-gray-600">
            You&apos;ve mastered all {flashcards.length} flashcards!
          </p>
        </div>
        <button
          onClick={handleRestart}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold shadow-lg"
        >
          Study Again
        </button>
      </div>
    );
  }

  const currentCard = remainingCards[currentIndex];
  if (!currentCard) {
    return null;
  }

  const progress = ((flashcards.length - remainingCards.length) / flashcards.length) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {flashcards.length - remainingCards.length} / {flashcards.length} learned
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
          <div
            className="bg-black h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md mb-8" style={{ height: '400px' }}>
        <div
          ref={cardRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => isDragging.current && handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => isDragging.current && handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onClick={handleFlip}
        >
          <div
            className="w-full h-full rounded-lg shadow-xl p-8 bg-white border-2 border-black/10 relative"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front side */}
            <div
              className="absolute inset-0 rounded-lg p-8 flex flex-col justify-center items-center text-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
              }}
            >
              <div className="text-sm text-gray-500 mb-4">Question</div>
              <div className="w-full">
                <SelectableText materialId={materialId}>
                  {currentCard.question}
                </SelectableText>
              </div>
              <p className="text-sm text-gray-500 mt-4">Click or tap to flip</p>
            </div>
            {/* Back side */}
            <div
              className="absolute inset-0 rounded-lg p-8 flex flex-col justify-center items-center text-center bg-gray-50"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-sm text-gray-500 mb-4">Answer</div>
              <div className="w-full">
                <SelectableText materialId={materialId}>
                  {currentCard.answer}
                </SelectableText>
              </div>
              <p className="text-sm text-gray-500 mt-4">Click or tap to flip back</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={handleUnknown}
          disabled={!isFlipped}
          className="flex-1 bg-white border-2 border-black/20 text-black px-6 py-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 shadow-md"
        >
          <span>←</span>
          <span>Don&apos;t Know</span>
        </button>
        <button
          onClick={handleFlip}
          className="px-6 py-4 bg-gray-100 border border-black/20 text-black rounded-lg hover:bg-gray-200 transition-colors font-semibold shadow-md"
        >
          Flip
        </button>
        <button
          onClick={handleKnown}
          disabled={!isFlipped}
          className="flex-1 bg-black text-white px-6 py-4 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg"
        >
          <span>Know</span>
          <span>→</span>
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p className="font-medium mb-1">Swipe right (→) if you know it</p>
        <p className="font-medium mb-1">Swipe left (←) if you don&apos;t</p>
        <p className="mt-2 text-xs">Or use the buttons below</p>
      </div>
    </div>
  );
}
