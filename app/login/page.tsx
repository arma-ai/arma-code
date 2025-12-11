'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { authApi, authStorage } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasCheckedRef = useRef(false); // Используем ref вместо state

  useEffect(() => {
    // Проверяем только один раз
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkUser = async () => {
      try {
        const token = authStorage.getToken();
        if (!token) return; // Нет токена - выходим

        // Проверяем что токен валидный
        try {
          await authApi.getCurrentUser();
          // Если запрос успешен, пользователь авторизован
          console.log('User already logged in, redirecting to dashboard');
          setIsRedirecting(true);

          // Небольшая задержка перед редиректом для показа loader
          setTimeout(() => {
            window.location.href = '/dashboard'; // Жесткий редирект
          }, 300);
        } catch (err) {
          // Токен невалидный, удаляем его
          authStorage.removeToken();
        }
      } catch (err) {
        console.error('Exception checking user:', err);
      }
    };

    checkUser();
  }, []); // Пустой массив зависимостей

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (isSignUp) {
        // Регистрация
        console.log('🔵 Starting signup...');

        if (!fullName.trim()) {
          setError('Введите ваше имя');
          setLoading(false);
          return;
        }

        await authApi.register({
          email: email.trim(),
          password: password,
          full_name: fullName.trim(),
        });

        console.log('✅ User registered and logged in successfully');

        // Токен уже сохранен в authApi.register()
        // Даем время для установки cookie и редиректим на dashboard
        setIsRedirecting(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Ждем 500ms
        window.location.href = '/dashboard';

      } else {
        // Вход
        console.log('🔵 Starting sign in...');

        const response = await authApi.login({
          email: email.trim(),
          password: password,
        });

        console.log('✅ User signed in successfully');
        console.log('Token:', response.access_token);

        // Токен уже сохранен в authApi.login()
        // Даем время для установки cookie и редиректим на dashboard
        setIsRedirecting(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Ждем 500ms
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);

      // Улучшенные сообщения об ошибках
      let errorMessage = error?.message || 'Неизвестная ошибка';

      if (errorMessage.includes('Email already registered')) {
        errorMessage = 'Пользователь с таким email уже существует. Используйте кнопку "Sign In" для входа.';
      } else if (errorMessage.includes('Incorrect email or password')) {
        errorMessage = 'Неверный email или пароль. Проверьте правильность введенных данных.';
      } else if (errorMessage.includes('Inactive user')) {
        errorMessage = 'Аккаунт неактивен. Обратитесь в поддержку.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  // Показываем loader если идет редирект
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 relative">
      {/* Back Button - Absolute Top Left */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/50 hover:bg-white hover:shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
            <Logo size="lg" />
          </Link>
          <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-gray-500">
            {isSignUp ? 'Start your learning journey today' : 'Sign in to continue to your dashboard'}
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 md:p-10 border border-gray-100">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none text-gray-900"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none text-gray-900"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password {isSignUp && '(min. 6 chars)'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none text-gray-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setPassword('');
              }}
              className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Powered by Python FastAPI + JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
