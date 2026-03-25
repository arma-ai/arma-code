import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Card, CardContent } from '../ui/card';

export interface QuizQuestion {
  id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
}

interface QuizWithThresholdProps {
  questions: QuizQuestion[];
  onSubmit: (result: {
    score_percentage: number;
    questions_correct: number;
    questions_total: number;
    weak_areas: string[];
    time_spent_seconds: number;
  }) => void;
  passThreshold?: number; // Default 70%
  materialId?: string;
}

export const QuizWithThreshold: React.FC<QuizWithThresholdProps> = ({
  questions,
  onSubmit,
  passThreshold = 70,
  materialId,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleSelectAnswer = (option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: option,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Calculate results
    let correctCount = 0;
    const weakAreasMap = new Map<string, number>();

    questions.forEach((q, index) => {
      const selectedAnswer = selectedAnswers[index];
      if (selectedAnswer === q.correct_option) {
        correctCount++;
      } else {
        // Track weak areas by question topic (simplified - using first few words)
        const topic = q.question.split(' ').slice(0, 3).join(' ');
        weakAreasMap.set(topic, (weakAreasMap.get(topic) || 0) + 1);
      }
    });

    const scorePercentage = (correctCount / totalQuestions) * 100;
    const weakAreas = Array.from(weakAreasMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    onSubmit({
      score_percentage: Math.round(scorePercentage * 10) / 10,
      questions_correct: correctCount,
      questions_total: totalQuestions,
      weak_areas: weakAreas,
      time_spent_seconds: timeSpent,
    });

    setIsSubmitting(false);
    setShowResults(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOptionStyle = (option: string) => {
    const isSelected = selectedAnswers[currentQuestionIndex] === option;
    return `
      w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer
      ${isSelected
        ? 'border-[#FF8A3D] bg-[#FF8A3D]/20 text-white'
        : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
      }
    `;
  };

  // Results View
  if (showResults) {
    const correctCount = Object.entries(selectedAnswers).filter(
      ([index, answer]) => questions[parseInt(index)].correct_option === answer
    ).length;
    const scorePercentage = (correctCount / totalQuestions) * 100;
    const passed = scorePercentage >= passThreshold;

    return (
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          {passed ? (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#FF8A3D]/20 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-[#FF8A3D]" />
            </div>
          ) : (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-white/60" />
            </div>
          )}

          <h2 className="text-3xl font-bold text-white mb-2">
            {passed ? 'Поздравляем!' : 'Нужно повторить'}
          </h2>
          <p className="text-white/60">
            {passed
              ? `Вы набрали ${scorePercentage.toFixed(1)}% и успешно прошли тест!`
              : `Вы набрали ${scorePercentage.toFixed(1)}%. Нужно минимум ${passThreshold}%.`}
          </p>
        </motion.div>

        {/* Score Card */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{correctCount}</p>
                <p className="text-sm text-white/60 mt-1">Правильных</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{totalQuestions - correctCount}</p>
                <p className="text-sm text-white/60 mt-1">Ошибок</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#FF8A3D]">{formatTime(timeSpent)}</p>
                <p className="text-sm text-white/60 mt-1">Время</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pass/Fail Indicator */}
        <div className={`p-4 rounded-xl border-2 mb-6 ${
          passed
            ? 'bg-[#22C55E]/20 border-[#22C55E]/30'
            : 'bg-[#EF4444]/20 border-[#EF4444]/30'
        }`}>
          <div className="flex items-center gap-3">
            {passed ? (
              <CheckCircle className="w-6 h-6 text-[#22C55E]" />
            ) : (
              <XCircle className="w-6 h-6 text-[#EF4444]" />
            )}
            <div>
              <p className={`font-semibold ${passed ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {passed ? `Порог пройден (≥${passThreshold}%)` : `Ниже порога (${passThreshold}%)`}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {passed
                  ? 'Материал освоен! Переходите к следующему этапу.'
                  : 'Рекомендуем изучить презентацию и попробовать снова.'}
              </p>
            </div>
          </div>
        </div>

        {/* Weak Areas */}
        {!passed && questions.some((q, i) => selectedAnswers[i] !== q.correct_option) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Области для повторения:</h3>
            <div className="space-y-2">
              {questions.map((q, index) => {
                const isWrong = selectedAnswers[index] !== q.correct_option;
                if (!isWrong) return null;

                return (
                  <div
                    key={index}
                    className="p-3 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-white">{q.question}</p>
                        <p className="text-xs text-[#22C55E] mt-1">
                          ✓ Правильный ответ: {q.correct_option}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz View
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Проверка знаний</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Clock className="w-4 h-4" />
              {formatTime(timeSpent)}
            </div>
            <span className="text-sm text-white/40">
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
          </div>
        </div>

        <Progress value={progress} className="h-2 bg-white/10" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-6">
              <div className="mb-6">
                <span className="text-xs font-medium text-[#FF8A3D] uppercase tracking-wider">
                  Вопрос {currentQuestionIndex + 1}
                </span>
                <p className="text-lg text-white mt-2 leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  currentQuestion.option_a,
                  currentQuestion.option_b,
                  currentQuestion.option_c,
                  currentQuestion.option_d,
                ].map((option, index) => {
                  const optionLabel = ['A', 'B', 'C', 'D'][index];
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(option)}
                      className={getOptionStyle(option)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedAnswers[currentQuestionIndex] === option
                            ? 'bg-[#FF8A3D] text-white'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {optionLabel}
                        </span>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Назад
        </Button>

        <Button
          onClick={handleNext}
          disabled={!selectedAnswers[currentQuestionIndex] || isSubmitting}
          className={`flex-1 cursor-pointer ${
            currentQuestionIndex === totalQuestions - 1
              ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            'Отправка...'
          ) : currentQuestionIndex === totalQuestions - 1 ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Завершить тест
            </>
          ) : (
            'Далее'
          )}
        </Button>
      </div>

      {/* Progress Summary */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/60">
        <span>
          Ответов: <span className="text-white">{answeredCount} из {totalQuestions}</span>
        </span>
        <span>
          Осталось: <span className="text-white">{totalQuestions - answeredCount}</span>
        </span>
      </div>

      {/* Keyboard Hints */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">1-4</kbd>
          Выбрать ответ
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd>
          Далее
        </span>
      </div>
    </div>
  );
};
