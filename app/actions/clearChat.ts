'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function clearChatHistory(materialId: string) {
  // Отключаем кэширование для этой функции
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Проверяем, что материал принадлежит пользователю
  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('id')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (materialError || !material) {
    throw new Error('Material not found');
  }

  // Сначала проверяем, сколько сообщений есть
  const { count: beforeCount } = await supabase
    .from('tutor_messages')
    .select('*', { count: 'exact', head: true })
    .eq('material_id', materialId);

  // Удаляем все сообщения для этого материала
  const { error: deleteError, count } = await supabase
    .from('tutor_messages')
    .delete()
    .eq('material_id', materialId)
    .select();

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error(`Failed to clear chat history: ${deleteError.message}`);
  }

  // Проверяем, что удаление действительно произошло
  const { count: afterCount } = await supabase
    .from('tutor_messages')
    .select('*', { count: 'exact', head: true })
    .eq('material_id', materialId);

  console.log(`Cleared chat history: ${beforeCount} -> ${afterCount} messages`);

  // Принудительно обновляем кэш страницы и layout
  revalidatePath(`/dashboard/materials/${materialId}`, 'page');
  revalidatePath(`/dashboard/materials/${materialId}`, 'layout');
  // Также обновляем весь путь dashboard для надежности
  revalidatePath('/dashboard', 'layout');

  return { success: true, deletedCount: count || 0, beforeCount, afterCount };
}

