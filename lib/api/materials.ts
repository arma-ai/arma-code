/**
 * API functions для работы с материалами
 */

import { apiClient } from './client';
import type {
  Material,
  MaterialDetailResponse,
  MaterialCreateRequest,
  MessageResponse,
  MaterialType,
} from './types';

const BASE_PATH = '/api/v1/materials';

export const materialsApi = {
  /**
   * Получить список материалов
   */
  getAll: (type?: MaterialType): Promise<Material[]> => {
    const query = type ? `?type=${type}` : '';
    return apiClient.get<Material[]>(`${BASE_PATH}${query}`);
  },

  /**
   * Получить один материал с деталями
   */
  getById: (id: string): Promise<MaterialDetailResponse> =>
    apiClient.get<MaterialDetailResponse>(`${BASE_PATH}/${id}`),

  /**
   * Создать новый материал
   */
  create: (data: MaterialCreateRequest): Promise<Material> =>
    apiClient.post<Material>(BASE_PATH, data),

  /**
   * Обновить материал
   */
  update: (id: string, data: Partial<MaterialCreateRequest>): Promise<Material> =>
    apiClient.put<Material>(`${BASE_PATH}/${id}`, data),

  /**
   * Удалить материал
   */
  delete: (id: string): Promise<MessageResponse> =>
    apiClient.delete<MessageResponse>(`${BASE_PATH}/${id}`),

  /**
   * Запустить обработку материала
   */
  process: (id: string): Promise<MessageResponse> =>
    apiClient.post<MessageResponse>(`${BASE_PATH}/${id}/process`, {}),

  /**
   * Загрузить PDF файл
   */
  uploadPDF: async (title: string, file: File): Promise<Material> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('material_type', 'pdf');
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${BASE_PATH}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload material');
    }

    return response.json();
  },

  /**
   * Создать материал из YouTube видео
   */
  createYouTube: async (title: string, youtubeUrl: string): Promise<Material> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('material_type', 'youtube');
    formData.append('source', youtubeUrl);

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${BASE_PATH}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create YouTube material');
    }

    return response.json();
  },

  /**
   * Регенерировать summary
   */
  regenerateSummary: (id: string): Promise<MessageResponse> =>
    apiClient.post<MessageResponse>(`${BASE_PATH}/${id}/regenerate/summary`, {}),

  /**
   * Регенерировать notes
   */
  regenerateNotes: (id: string): Promise<MessageResponse> =>
    apiClient.post<MessageResponse>(`${BASE_PATH}/${id}/regenerate/notes`, {}),

  /**
   * Регенерировать flashcards
   */
  regenerateFlashcards: (id: string, count: number = 15): Promise<MessageResponse> =>
    apiClient.post<MessageResponse>(`${BASE_PATH}/${id}/regenerate/flashcards?count=${count}`, {}),

  /**
   * Регенерировать quiz
   */
  regenerateQuiz: (id: string, count: number = 10): Promise<MessageResponse> =>
    apiClient.post<MessageResponse>(`${BASE_PATH}/${id}/regenerate/quiz?count=${count}`, {}),
};

export default materialsApi;
