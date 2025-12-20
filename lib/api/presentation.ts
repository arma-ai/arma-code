/**
 * Presentation API - функции для работы с презентациями
 */

import { apiClient } from './client';

export interface GeneratePresentationResponse {
  message: string;
}

/**
 * Генерирует презентацию для материала
 */
export async function generatePresentation(materialId: string): Promise<GeneratePresentationResponse> {
  return apiClient.post<GeneratePresentationResponse>(
    `/api/v1/materials/${materialId}/presentation/generate`
  );
}
