import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Логируем все параметры для отладки
  console.log('🔵 Callback received:');
  console.log('  Full URL:', requestUrl.toString());
  console.log('  Pathname:', requestUrl.pathname);
  console.log('  Search:', requestUrl.search);
  console.log('  Hash:', requestUrl.hash);
  console.log('  Code:', code ? '✓ PRESENT' : '✗ MISSING');
  console.log('  Token:', token ? '✓ PRESENT' : '✗ MISSING');
  console.log('  Type:', type || 'N/A');
  console.log('  Error:', error);
  console.log('  All params:', Object.fromEntries(requestUrl.searchParams));

  // Если есть ошибка от OAuth провайдера
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  // Обработка токенов Magic Link и Email confirmation
  // Supabase может отправлять токены в разных форматах
  // Проверяем все возможные параметры
  const tokenHash = requestUrl.searchParams.get('token_hash') || 
                    requestUrl.searchParams.get('token') || 
                    token;
  const tokenType = requestUrl.searchParams.get('type') || type;
  
  // Также проверяем hash для токенов
  const hash = requestUrl.hash;
  if (hash && !tokenHash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const hashToken = hashParams.get('token_hash') || hashParams.get('token') || hashParams.get('access_token');
    const hashType = hashParams.get('type');
    if (hashToken && hashType) {
      console.log('📧 Found token in hash');
      console.log('  Token type:', hashType);
      console.log('  Token (first 20 chars):', hashToken.substring(0, 20) + '...');
      // Используем токен из hash
      const supabase = await createClient();
      try {
        // Определяем тип токена
        const otpType = hashType === 'recovery' ? 'recovery' : 
                       (hashType === 'magiclink' ? 'email' : 
                       (hashType === 'email' ? 'email' : 'email'));
        
        console.log('  OTP Type:', otpType);
        
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: hashToken,
          type: otpType,
        });

        if (!verifyError && data?.user) {
          console.log('✅ Email token verified successfully from hash');
          console.log('  User ID:', data.user.id);
          console.log('  User email:', data.user.email);
          
          // Для recovery токенов перенаправляем на страницу смены пароля
          if (hashType === 'recovery') {
            console.log('  Redirecting to password reset page');
            return NextResponse.redirect(
              new URL(`/login?type=recovery&token=${encodeURIComponent(hashToken)}`, requestUrl.origin)
            );
          }
          
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
            const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: data.user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
            });

            if (profileError) {
              console.error('Error creating profile:', profileError);
            } else {
              console.log('✅ Profile created');
            }
          } else {
            console.log('✅ Profile already exists');
          }

          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        } else if (verifyError) {
          console.error('❌ Error verifying token from hash:', verifyError);
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin)
          );
        } else {
          console.error('❌ No user in verifyOtp response from hash');
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent('Token verification failed - no user returned')}`, requestUrl.origin)
          );
        }
      } catch (error: any) {
        console.error('❌ Unexpected error verifying token from hash:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message || 'token_verification_failed')}`, requestUrl.origin)
        );
      }
    }
  }

  // Флаг для отслеживания, были ли обработаны токены
  // Если токены найдены в hash, но не обработаны, все равно считаем, что они были обработаны
  let tokensProcessed = false;
  
  // Если токены найдены в hash, но не обработаны (например, нет hashType), 
  // все равно считаем, что это не OAuth callback
  if (hash && !tokenHash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const hashToken = hashParams.get('token_hash') || hashParams.get('token') || hashParams.get('access_token');
    if (hashToken) {
      tokensProcessed = true;
      console.log('📧 Token found in hash but not processed (missing type?)');
    }
  }

  if (tokenHash && tokenType) {
    tokensProcessed = true;
    console.log('📧 Processing email token (Magic Link, Email Confirmation, or Recovery)');
    console.log('  Token hash:', tokenHash.substring(0, 20) + '...');
    console.log('  Type:', tokenType);
    
    try {
      const supabase = await createClient();
      
      // Для Recovery токенов используем 'recovery', для остальных - 'email'
      const otpType = tokenType === 'recovery' ? 'recovery' : 
                     (tokenType === 'magiclink' ? 'email' : 
                     (tokenType === 'email' ? 'email' : 'email'));
      
      console.log('  OTP Type:', otpType);
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });

      if (verifyError) {
        console.error('❌ Error verifying token:', verifyError);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin)
        );
      }

      if (data?.user) {
        console.log('✅ Email token verified successfully');
        console.log('  User ID:', data.user.id);
        console.log('  User email:', data.user.email);
        
        // Для recovery токенов перенаправляем на страницу смены пароля
        if (tokenType === 'recovery') {
          console.log('  Redirecting to password reset page');
          // Сохраняем токен в URL для страницы смены пароля
          return NextResponse.redirect(
            new URL(`/login?type=recovery&token=${encodeURIComponent(tokenHash)}`, requestUrl.origin)
          );
        }
        
        // Создаём или обновляем профиль
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          } else {
            console.log('✅ Profile created');
          }
        } else {
          console.log('✅ Profile already exists');
        }

        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
      } else {
        console.error('❌ No user in verifyOtp response');
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent('Token verification failed - no user returned')}`, requestUrl.origin)
        );
      }
    } catch (error: any) {
      console.error('❌ Unexpected error verifying token:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message || 'token_verification_failed')}`, requestUrl.origin)
      );
    }
  }

  // Если токены были обработаны, не проверяем код
  if (tokensProcessed) {
    console.log('✅ Tokens were processed, skipping code check');
    return NextResponse.redirect(new URL('/login?error=token_processing_completed', requestUrl.origin));
  }

  if (!code) {
    console.error('❌ No code in callback URL');
    console.error('Full URL:', requestUrl.toString());
    console.error('All search params:', Object.fromEntries(requestUrl.searchParams));
    
    // Логируем все cookies для отладки
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('🍪 All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + '...' })));
    
    // Попробуем проверить, может быть сессия уже установлена через cookies
    const supabase = await createClient();
    
    // Сначала пробуем getSession
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    
    console.log('📋 Session check:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
    });
    
    if (session?.user) {
      console.log('✅ User found in session (no code needed)');
      // Пользователь уже авторизован через cookies
      // Создаём или обновляем профиль
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }
      
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    }
    
    // Если нет сессии, пробуем getUser
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    console.log('👤 User check:', {
      hasUser: !!user,
      userError: userError?.message,
      userId: user?.id,
    });
    
    if (user && !userError) {
      console.log('✅ User found via getUser (no code needed)');
      // Пользователь уже авторизован через cookies
      // Создаём или обновляем профиль
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }
      
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    }
    
    // Возможно, Supabase перенаправил на другой URL - проверяем hash
    const hash = requestUrl.hash;
    if (hash) {
      console.log('Found hash in URL:', hash);
      // Парсим hash для получения кода (если Supabase использует hash вместо query)
      const hashParams = new URLSearchParams(hash.substring(1));
      const hashCode = hashParams.get('code');
      if (hashCode) {
        console.log('Found code in hash, using it');
        // Используем код из hash
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(hashCode);
        if (!exchangeError && sessionData?.session) {
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }
      }
    }
    
    // Если нет сессии и нет пользователя, значит токен истек или был использован
    console.error('❌ No code, no token, and no user session found');
    console.error('  This might mean:');
    console.error('  1. The link was already used (tokens can only be used once)');
    console.error('  2. The link expired');
    console.error('  3. The link format is incorrect');
    console.error('  Session error:', sessionError?.message);
    console.error('  User error:', userError?.message);
    
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Ссылка уже использована или истекла. Попробуйте запросить новую ссылку.'), requestUrl.origin)
    );
  }

  try {
    const supabase = await createClient();
    
    // Обмениваем код на сессию
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (!sessionData?.session) {
      console.error('No session after exchange');
      return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin));
    }

    // Получаем пользователя
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin));
    }

    // Создаём или обновляем профиль
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        created_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Не прерываем процесс, профиль можно создать позже
      }
    }

    // Редирект на dashboard
    const response = NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    return response;
  } catch (error: any) {
    console.error('Unexpected error in callback:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message || 'unknown')}`, requestUrl.origin)
    );
  }
}

