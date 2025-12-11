'use client';

import { useState } from 'react';
import { quizAttemptsApi } from '@/lib/api';
import type { QuizQuestion, QuizAttemptAnswerDetail } from '@/lib/api/types';

interface InteractiveQuizProps {
  quiz: QuizQuestion[];
  materialId: string;
  correctAnswers?: { [key: string]: 'a' | 'b' | 'c' | 'd' }; // Map question_id -> correct_option
}

export default function InteractiveQuiz({ quiz, materialId, correctAnswers }: InteractiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selected: 'a' | 'b' | 'c' | 'd'; correct: boolean }>>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = quiz[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.length - 1;

  const handleAnswerSelect = (option: 'a' | 'b' | 'c' | 'd') => {
    if (selectedAnswer !== null || showResult) return; // Уже ответили

    setSelectedAnswer(option);
    setShowResult(true);

    const correctOption = correctAnswers?.[currentQuestion.id];
    const isCorrect = option === correctOption;
    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      selected: option,
      correct: isCorrect,
    }];
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Завершение quiz
      const correctOption = correctAnswers?.[currentQuestion.id];
      const isLastCorrect = selectedAnswer === correctOption;
      const correctCount = answers.filter(a => a.correct).length + (isLastCorrect ? 1 : 0);
      setScore(correctCount);
      setQuizCompleted(true);

      // Формирование массива всех ответов для сохранения
      const allAnswers: QuizAttemptAnswerDetail[] = [
        ...answers.map(a => ({
          question_id: a.questionId,
          selected: a.selected,
          correct: a.correct,
          correct_option: correctAnswers?.[a.questionId] || 'a',
        })),
        // Добавляем последний ответ
        {
          question_id: currentQuestion.id,
          selected: selectedAnswer!,
          correct: isLastCorrect,
          correct_option: correctOption || 'a',
        },
      ];

      const totalQuestions = quiz.length;
      const percentage = Math.round((correctCount / totalQuestions) * 100);

      // Сохранение результата quiz в БД через API
      try {
        await quizAttemptsApi.saveAttempt({
          material_id: materialId,
          score: correctCount,
          total_questions: totalQuestions,
          percentage,
          answers: allAnswers,
        });

        // Триггер обновления статистики
        window.dispatchEvent(new Event('quiz-completed'));
      } catch (error) {
        console.error('[InteractiveQuiz] Failed to save quiz attempt:', error);
      }
    } else {
      // Переход к следующему вопросу
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers([]);
    setQuizCompleted(false);
    setScore(0);
  };

  if (quizCompleted) {
    const percentage = Math.round((score / quiz.length) * 100);
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-black mb-2">Quiz Completed!</h3>
          <p className="text-lg text-gray-600">
            You scored {score} out of {quiz.length} questions
          </p>
          <div className="mt-4">
            <div className="text-4xl font-bold text-black">{percentage}%</div>
          </div>
        </div>
        <div className="space-y-2 mb-6">
          {quiz.map((q, index) => {
            const answer = answers.find(a => a.questionId === q.id);
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg text-left border-2 shadow-md ${
                  answer?.correct ? 'bg-white border-black' : 'bg-gray-50 border-black/30'
                }`}
              >
                <div className="font-semibold text-black mb-1">
                  {index + 1}. {q.question}
                </div>
                <div className="text-sm text-gray-600">
                  Your answer: <span className="font-medium text-black">{answer?.selected.toUpperCase()}</span>
                  {!answer?.correct && (
                    <span className="ml-2">
                      (Correct: <span className="font-medium text-black">{correctAnswers?.[q.id].toUpperCase()}</span>)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleRestart}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold shadow-lg"
        >
          Restart Quiz
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {quiz.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentQuestionIndex + 1) / quiz.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
          <div
            className="bg-black h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          {currentQuestion.question}
        </h3>

        {/* Answer options */}
        <div className="space-y-3">
          {(['a', 'b', 'c', 'd'] as const).map((option) => {
            const optionText = currentQuestion[`option_${option}` as keyof QuizQuestion] as string;
            const isSelected = selectedAnswer === option;
            const correctOption = correctAnswers?.[currentQuestion.id];
            const isCorrect = option === correctOption;
            const showCorrect = showResult && isCorrect;
            const showIncorrect = showResult && isSelected && !isCorrect;

            return (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all shadow-md ${
                  showCorrect
                    ? 'border-black bg-white'
                    : showIncorrect
                    ? 'border-black/30 bg-gray-50'
                    : isSelected
                    ? 'border-black bg-gray-100'
                    : 'border-black/20 bg-white hover:border-black/40 hover:bg-gray-50'
                } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center">
                  <span className={`font-semibold mr-3 ${
                    showCorrect
                      ? 'text-black'
                      : showIncorrect
                      ? 'text-gray-600'
                      : 'text-black'
                  }`}>
                    {option.toUpperCase()}.
                  </span>
                  <span className={`flex-1 ${
                    showCorrect
                      ? 'text-black font-semibold'
                      : showIncorrect
                      ? 'text-gray-700'
                      : 'text-black'
                  }`}>
                    {optionText}
                  </span>
                  {showCorrect && (
                    <span className="ml-2 text-black text-xl font-bold">✓</span>
                  )}
                  {showIncorrect && (
                    <span className="ml-2 text-gray-600 text-xl">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result message */}
      {showResult && (
        <div className={`mb-6 p-4 rounded-lg border-2 shadow-md ${
          selectedAnswer === correctAnswers?.[currentQuestion.id]
            ? 'bg-white border-black'
            : 'bg-gray-50 border-black/30'
        }`}>
          <p className={`font-semibold ${
            selectedAnswer === correctAnswers?.[currentQuestion.id]
              ? 'text-black'
              : 'text-gray-700'
          }`}>
            {selectedAnswer === correctAnswers?.[currentQuestion.id]
              ? '✓ Correct!'
              : `✗ Incorrect. The correct answer is ${correctAnswers?.[currentQuestion.id].toUpperCase()}.`}
          </p>
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold shadow-lg"
          >
            {isLastQuestion ? 'Finish Quiz' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}

