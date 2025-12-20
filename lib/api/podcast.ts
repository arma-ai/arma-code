/**
 * Podcast API - функции для работы с подкастами
 */

import { apiClient } from './client';

export interface PodcastScript {
  speaker: string;
  text: string;
}

export interface GeneratePodcastScriptResponse {
  message: string;
}

export interface GeneratePodcastAudioResponse {
  message: string;
}

/**
 * Генерирует скрипт подкаста для материала
 */
export async function generatePodcastScript(materialId: string): Promise<GeneratePodcastScriptResponse> {
  return apiClient.post<GeneratePodcastScriptResponse>(
    `/api/v1/materials/${materialId}/podcast/generate-script`
  );
}

/**
 * Генерирует аудио для подкаста
 */
export async function generatePodcastAudio(materialId: string): Promise<GeneratePodcastAudioResponse> {
  return apiClient.post<GeneratePodcastAudioResponse>(
    `/api/v1/materials/${materialId}/podcast/generate-audio`
  );
}
