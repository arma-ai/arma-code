/**
 * API functions для работы с Quiz endpoints
 */

import { apiClient } from './client';
import type {
  QuizListResponse,
  QuizQuestion,
  QuizAnswerRequest,
  QuizAnswerResponse,
  QuizAttemptRequest,
  QuizAttemptResponse,
  QuizAttemptSaveRequest,
  QuizAttemptHistoryResponse,
  QuizStatisticsResponse,
  MessageResponse,
  QuizQuestionWithAnswer,
} from './types';

const BASE_PATH = '/api/v1';

/**
 * Quiz Questions API
 */
export const quizApi = {
  /**
   * Получить все вопросы для материала
   */
  getQuestions: (materialId: string): Promise<QuizListResponse> =>
    apiClient.get<QuizListResponse>(`${BASE_PATH}/materials/${materialId}/quiz`),

  /**
   * Создать новый вопрос
   */
  createQuestion: (data: {
    material_id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'a' | 'b' | 'c' | 'd';
  }): Promise<QuizQuestion> =>
    apiClient.post<QuizQuestion>(`${BASE_PATH}/quiz`, data),

  /**
   * Получить один вопрос (без правильного ответа)
   */
  getQuestion: (questionId: string): Promise<QuizQuestion> =>
    apiClient.get<QuizQuestion>(`${BASE_PATH}/quiz/${questionId}`),

  /**
   * Проверить одиночный ответ
   */
  checkAnswer: (data: QuizAnswerRequest): Promise<QuizAnswerResponse> =>
    apiClient.post<QuizAnswerResponse>(`${BASE_PATH}/quiz/check`, data),

  /**
   * Отправить полную попытку quiz (все ответы)
   */
  submitAttempt: (data: QuizAttemptRequest): Promise<QuizAttemptResponse> =>
    apiClient.post<QuizAttemptResponse>(`${BASE_PATH}/quiz/attempt`, data),

  /**
   * Удалить вопрос
   */
  deleteQuestion: (questionId: string): Promise<MessageResponse> =>
    apiClient.delete<MessageResponse>(`${BASE_PATH}/quiz/${questionId}`),
};

/**
 * Quiz Attempts API (новые endpoints для scoring system)
 */
export const quizAttemptsApi = {
  /**
   * Сохранить результат quiz попытки в БД
   */
  saveAttempt: (data: QuizAttemptSaveRequest): Promise<QuizAttemptHistoryResponse> =>
    apiClient.post<QuizAttemptHistoryResponse>(`${BASE_PATH}/quiz/attempts/save`, data),

  /**
   * Получить историю попыток для материала
   */
  getHistory: (materialId: string, limit: number = 100): Promise<QuizAttemptHistoryResponse[]> =>
    apiClient.get<QuizAttemptHistoryResponse[]>(
      `${BASE_PATH}/materials/${materialId}/quiz/attempts?limit=${limit}`
    ),

  /**
   * Получить статистику по quiz для материала
   */
  getStatistics: (materialId: string): Promise<QuizStatisticsResponse> =>
    apiClient.get<QuizStatisticsResponse>(`${BASE_PATH}/materials/${materialId}/quiz/statistics`),

  /**
   * Удалить попытку
   */
  deleteAttempt: (attemptId: string): Promise<MessageResponse> =>
    apiClient.delete<MessageResponse>(`${BASE_PATH}/quiz/attempts/${attemptId}`),
};

/**
 * Вспомогательные функции
 */
export const quizHelpers = {
  /**
   * Подсчет score из ответов
   */
  calculateScore: (answers: QuizAnswerResponse[]): {
    score: number;
    total: number;
    percentage: number;
  } => {
    const total = answers.length;
    const score = answers.filter((a) => a.is_correct).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    return { score, total, percentage };
  },

  /**
   * Проверка, прошел ли quiz (>= 70%)
   */
  isPassed: (percentage: number, passingScore: number = 70): boolean => {
    return percentage >= passingScore;
  },

  /**
   * Получение grade буквы
   */
  getGrade: (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  },
};

export default quizApi;
