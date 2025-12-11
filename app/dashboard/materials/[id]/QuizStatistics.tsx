'use client';

import { useEffect, useState } from 'react';
import { quizAttemptsApi } from '@/lib/api';
import type { QuizStatisticsResponse } from '@/lib/api/types';

interface QuizStatisticsProps {
  materialId: string;
}

export default function QuizStatistics({ materialId }: QuizStatisticsProps) {
  const [statistics, setStatistics] = useState<QuizStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await quizAttemptsApi.getStatistics(materialId);
      setStatistics(data);
      setError(null);
    } catch (err) {
      console.error('[QuizStatistics] Error loading statistics:', err);
      setError('Failed to load quiz statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();

    // Слушать событие завершения quiz для обновления статистики
    const handleQuizCompleted = () => {
      loadStatistics();
    };

    window.addEventListener('quiz-completed', handleQuizCompleted);

    return () => {
      window.removeEventListener('quiz-completed', handleQuizCompleted);
    };
  }, [materialId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">{error || 'No statistics available'}</p>
      </div>
    );
  }

  if (statistics.total_attempts === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Statistics</h3>
        <p className="text-gray-600">No quiz attempts yet. Take the quiz to see your statistics!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Statistics</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Attempts */}
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Attempts</p>
          <p className="text-3xl font-bold text-gray-900">{statistics.total_attempts}</p>
        </div>

        {/* Best Score */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Best Score</p>
          <p className="text-3xl font-bold text-green-700">{statistics.best_percentage}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {statistics.best_score} / {statistics.last_attempt?.total_questions || 0} correct
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Average Score</p>
          <p className="text-3xl font-bold text-blue-700">
            {Math.round(statistics.average_percentage)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ~{Math.round(statistics.average_score)} correct on average
          </p>
        </div>
      </div>

      {/* Last Attempt */}
      {statistics.last_attempt && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Last Attempt</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {statistics.last_attempt.percentage}%
                </p>
                <p className="text-sm text-gray-600">
                  {statistics.last_attempt.score} / {statistics.last_attempt.total_questions} correct
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(statistics.last_attempt.completed_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(statistics.last_attempt.completed_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Attempts History */}
      {statistics.attempts.length > 1 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Attempts</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {statistics.attempts.slice(0, 5).map((attempt, index) => (
              <div
                key={attempt.id}
                className="flex justify-between items-center bg-gray-50 rounded p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">#{statistics.attempts.length - index}</span>
                  <span className="text-gray-600">
                    {attempt.score} / {attempt.total_questions}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${
                    attempt.percentage >= 90 ? 'text-green-600' :
                    attempt.percentage >= 70 ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {attempt.percentage}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(attempt.completed_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
