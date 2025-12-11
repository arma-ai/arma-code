/**
 * API functions для работы с flashcards
 */

import { apiClient } from './client';
import type { Flashcard, FlashcardListResponse, MessageResponse } from './types';

const BASE_PATH = '/api/v1';

export const flashcardsApi = {
  /**
   * Получить все flashcards для материала
   */
  getAll: (materialId: string): Promise<FlashcardListResponse> =>
    apiClient.get<FlashcardListResponse>(`${BASE_PATH}/materials/${materialId}/flashcards`),

  /**
   * Создать новую flashcard
   */
  create: (data: {
    material_id: string;
    question: string;
    answer: string;
  }): Promise<Flashcard> =>
    apiClient.post<Flashcard>(`${BASE_PATH}/flashcards`, data),

  /**
   * Получить одну flashcard
   */
  getById: (id: string): Promise<Flashcard> =>
    apiClient.get<Flashcard>(`${BASE_PATH}/flashcards/${id}`),

  /**
   * Обновить flashcard
   */
  update: (id: string, data: { question?: string; answer?: string }): Promise<Flashcard> =>
    apiClient.put<Flashcard>(`${BASE_PATH}/flashcards/${id}`, data),

  /**
   * Удалить flashcard
   */
  delete: (id: string): Promise<MessageResponse> =>
    apiClient.delete<MessageResponse>(`${BASE_PATH}/flashcards/${id}`),
};

export default flashcardsApi;
