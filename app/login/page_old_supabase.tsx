'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем ошибку в URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    // Проверяем, авторизован ли пользователь
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error checking user:', userError);
          return;
        }

        if (user) {
          console.log('User already logged in, redirecting to dashboard');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Exception checking user:', err);
      }
    };

    checkUser();
  }, [router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      if (isSignUp) {
        // Регистрация
        console.log('🔵 Starting signup...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        console.log('📦 Signup response:', {
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          userEmail: data?.user?.email,
          error: error?.message
        });

        if (error) {
          console.error('❌ Signup error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Если email confirmations отключены, пользователь сразу авторизован
          if (data.session) {
            console.log('✅ User registered and logged in immediately (email confirmations disabled)');
            // Создаём профиль, если его еще нет
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                full_name: data.user.email?.split('@')[0] || 'User',
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (profileError && profileError.code !== '23505') { // Ignore duplicate key error
              console.error('Error creating profile:', profileError);
            }

            // Даем время для установки cookies перед редиректом
            console.log('🔄 Waiting for session to be established...');

            // Проверяем, что сессия установлена на клиенте
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              console.log('✅ Session confirmed on client');
              console.log('  Session expires at:', checkSession.expires_at);

              // Используем серверный route для установки сессии и редиректа
              // Это гарантирует, что cookies будут правильно установлены на сервере
              console.log('🔄 Redirecting through server route...');
              window.location.href = '/auth/set-session';
            } else {
              console.log('⚠️ Session not found on client');
              // Если сессии нет, ждем еще немного и пробуем снова
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                console.log('✅ Session found after retry');
                window.location.href = '/auth/set-session';
              } else {
                console.error('❌ Session still not found after retry');
                setError('Ошибка установки сессии. Попробуйте войти снова.');
                setLoading(false);
              }
            }

            return; // Выходим из функции, чтобы не сбрасывать loading
          } else {
            // Если email confirmations включены, нужно подтвердить email
            console.log('⚠️ Email confirmations enabled - user needs to confirm email');
            console.log('⚠️ User email:', data.user.email);
            console.log('⚠️ User confirmed:', data.user.email_confirmed_at);
            setError('Проверьте email для подтверждения регистрации! Письмо должно прийти на ' + data.user.email);
            setLoading(false);
          }
        } else {
          console.error('❌ No user in signup response');
          setError('Ошибка регистрации. Попробуйте снова.');
          setLoading(false);
        }
      } else {
        // Вход
        console.log('🔵 Starting sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log('📦 Sign in response:', {
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          userEmail: data?.user?.email,
          error: error?.message
        });

        if (error) {
          console.error('❌ Sign in error:', error);

          // Улучшенные сообщения об ошибках
          let errorMessage = error.message;
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Неверный email или пароль. Проверьте правильность введенных данных.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Email не подтвержден. Проверьте почту и перейдите по ссылке подтверждения.';
          } else if (error.message.includes('User already registered')) {
            errorMessage = 'Пользователь уже зарегистрирован. Используйте кнопку "Sign In" для входа.';
          }

          setError(errorMessage);
          setLoading(false);
          return;
        }

        if (data.user) {
          console.log('✅ User signed in successfully');
          console.log('🔄 Waiting for session to be established...');

          // Проверяем, что сессия установлена на клиенте
          const { data: { session: checkSession } } = await supabase.auth.getSession();
          if (checkSession) {
            console.log('✅ Session confirmed on client');
            console.log('  Session expires at:', checkSession.expires_at);

            // Используем серверный route для установки сессии и редиректа
            // Это гарантирует, что cookies будут правильно установлены на сервере
            console.log('🔄 Redirecting through server route...');
            window.location.href = '/auth/set-session';
          } else {
            console.log('⚠️ Session not found on client');
            // Если сессии нет, ждем еще немного и пробуем снова
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              console.log('✅ Session found after retry');
              window.location.href = '/auth/set-session';
            } else {
              console.error('❌ Session still not found after retry');
              setError('Ошибка установки сессии. Попробуйте войти снова.');
              setLoading(false);
            }
          }

          return; // Выходим из функции, чтобы не сбрасывать loading
        } else {
          console.error('❌ No user in sign in response');
          setError('Ошибка входа. Попробуйте снова.');
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      setError(error?.message || 'Неизвестная ошибка');
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      if (!email) {
        setError('Введите email');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      alert('Проверьте email - мы отправили вам ссылку для входа!');
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Exception:', error);
      setError(error?.message || 'Неизвестная ошибка');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      if (!email) {
        setError('Введите email для сброса пароля');
        setLoading(false);
        return;
      }

      console.log('🔵 Resetting password for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        console.error('❌ Reset password error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      alert('Проверьте email - мы отправили вам ссылку для сброса пароля!');
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Exception:', error);
      setError(error?.message || 'Неизвестная ошибка');
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError('Не получен URL для редиректа');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      setError(error?.message || 'Неизвестная ошибка');
      setLoading(false);
    }
  };

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

          <form onSubmit={handleEmailAuth} className="space-y-5">
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none"
                placeholder="name@example.com"
              />
            </div>

            {!isSignUp && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm text-gray-500 hover:text-black transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password (min. 6 chars)
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">or continue with</span>
            </div>
          </div>

          <button
            onClick={handleSignInWithGoogle}
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 py-3.5 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span>Loading...</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </>
            )}
          </button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
