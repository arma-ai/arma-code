/**
 * API Client для взаимодействия с Python FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
}

/**
 * Базовый fetch wrapper с обработкой ошибок и автоматическим добавлением токена
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Получить токен из localStorage (или из cookies)
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'An error occurred',
    }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Если response пустой (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * API Client
 */
export const apiClient = {
  // GET request
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  // POST request
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PUT request
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // DELETE request
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  // PATCH request
  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

/**
 * Вспомогательные функции для работы с токеном
 */
export const authStorage = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      // Сохраняем в localStorage
      localStorage.setItem('access_token', token);

      // Также сохраняем в cookie для middleware
      // Cookie будет доступен на сервере
      // ВАЖНО: используем Secure только на production, иначе cookie не установится на localhost
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = [
        `access_token=${token}`,
        'path=/',
        `max-age=${60 * 60 * 24 * 7}`, // 7 дней
        'SameSite=Lax',
        isProduction ? 'Secure' : ''
      ].filter(Boolean).join('; ');

      document.cookie = cookieOptions;

      // Проверяем что cookie установлена
      console.log('Cookie set:', document.cookie.includes('access_token'));
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      // Удаляем из localStorage
      localStorage.removeItem('access_token');

      // Удаляем cookie
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },
};

export default apiClient;
