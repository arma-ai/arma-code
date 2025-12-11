/**
 * API functions для аутентификации
 */

import { apiClient, authStorage } from './client';
import type { LoginRequest, RegisterRequest, TokenResponse, User } from './types';

const BASE_PATH = '/api/v1/auth';

export const authApi = {
  /**
   * Регистрация нового пользователя
   */
  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(`${BASE_PATH}/register`, data);

    // Сохранить токен
    authStorage.setToken(response.access_token);

    return response;
  },

  /**
   * Вход пользователя
   */
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(`${BASE_PATH}/login`, data);

    // Сохранить токен
    authStorage.setToken(response.access_token);

    return response;
  },

  /**
   * Получить текущего пользователя
   */
  getCurrentUser: (): Promise<User> =>
    apiClient.get<User>(`${BASE_PATH}/me`),

  /**
   * Выход
   */
  logout: () => {
    authStorage.removeToken();
  },
};

export default authApi;
