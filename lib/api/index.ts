/**
 * Главный файл экспорта для API client
 */

export { apiClient, authStorage } from './client';
export { authApi } from './auth';
export { materialsApi } from './materials';
export { quizApi, quizAttemptsApi, quizHelpers } from './quiz';
export { flashcardsApi } from './flashcards';
export { tutorApi } from './tutor';

// Export types
export type * from './types';

// Lazy load для избежания circular dependency
import { authApi } from './auth';
import { materialsApi } from './materials';
import { quizApi, quizAttemptsApi } from './quiz';
import { flashcardsApi } from './flashcards';
import { tutorApi } from './tutor';

// Re-export для удобства
export const api = {
  get auth() { return authApi; },
  get materials() { return materialsApi; },
  get quiz() { return quizApi; },
  get quizAttempts() { return quizAttemptsApi; },
  get flashcards() { return flashcardsApi; },
  get tutor() { return tutorApi; },
};

export default api;
