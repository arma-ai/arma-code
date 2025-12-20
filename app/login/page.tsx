'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { authApi, authStorage } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasCheckedRef = useRef(false);

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.015),transparent_50%)] pointer-events-none" />

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-10"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-all bg-gray-50/80 backdrop-blur-sm px-4 py-2.5 rounded-full border border-gray-200/50 hover:border-gray-300 hover:shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </motion.div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <Link href="/" className="inline-block mb-8 hover:opacity-80 transition-opacity">
            <Logo size="lg" />
          </Link>
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-[#1D1D1F] mb-3 tracking-tight">
                {isSignUp ? 'Create account' : 'Welcome back'}
              </h1>
              <p className="text-gray-500 text-lg">
                {isSignUp ? 'Start your learning journey today' : 'Sign in to continue learning'}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8 md:p-10 border border-gray-100"
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label htmlFor="fullName" className="block text-sm font-semibold text-[#1D1D1F] mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-black transition-all outline-none text-[#1D1D1F] placeholder:text-gray-400"
                    placeholder="John Doe"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#1D1D1F] mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-black transition-all outline-none text-[#1D1D1F] placeholder:text-gray-400"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#1D1D1F] mb-2">
                Password {isSignUp && <span className="text-gray-400 font-normal">(min. 6 chars)</span>}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-black transition-all outline-none text-[#1D1D1F] placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setPassword('');
                setFullName('');
              }}
              className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Secured with FastAPI + JWT Authentication
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
