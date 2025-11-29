import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();

  // Проверяем, что пользователь авторизован
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', requestUrl.origin));
  }

  // Редиректим на dashboard
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}

