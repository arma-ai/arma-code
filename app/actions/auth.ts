'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function signOut() {
  // Удаляем токен из cookies
  const cookieStore = await cookies();
  cookieStore.delete('access_token');

  redirect('/login');
}

