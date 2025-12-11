import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Публичные пути (не требуют авторизации)
  const publicPaths = ['/', '/login'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

  // Если путь публичный, пропускаем
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Проверяем JWT токен для защищенных путей (dashboard)
  if (pathname.startsWith('/dashboard')) {
    // Проверяем наличие токена в cookies или localStorage
    // Примечание: localStorage недоступен в middleware, поэтому используем cookie
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      // Нет токена - редирект на логин
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

    // TODO: В будущем можно добавить валидацию JWT токена здесь
    // Но для простоты сейчас просто проверяем наличие токена
    // Валидация произойдет при первом API запросе
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
