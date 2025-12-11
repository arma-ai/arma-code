/**
 * API functions для AI Tutor Chat
 */

import { apiClient } from './client';
import type {
  TutorMessageRequest,
  TutorMessageResponse,
  TutorChatHistoryResponse,
  MessageResponse,
} from './types';

const BASE_PATH = '/api/v1/materials';

export const tutorApi = {
  /**
   * Отправить сообщение тьютору
   */
  sendMessage: (
    materialId: string,
    data: TutorMessageRequest
  ): Promise<TutorMessageResponse> =>
    apiClient.post<TutorMessageResponse>(
      `${BASE_PATH}/${materialId}/tutor`,
      data
    ),

  /**
   * Получить историю чата для материала
   */
  getHistory: (
    materialId: string,
    limit: number = 50
  ): Promise<TutorChatHistoryResponse> =>
    apiClient.get<TutorChatHistoryResponse>(
      `${BASE_PATH}/${materialId}/tutor/history?limit=${limit}`
    ),

  /**
   * Очистить историю чата (если backend поддерживает)
   */
  clearHistory: (materialId: string): Promise<MessageResponse> =>
    apiClient.delete<MessageResponse>(
      `${BASE_PATH}/${materialId}/tutor/history`
    ),
};

export default tutorApi;
