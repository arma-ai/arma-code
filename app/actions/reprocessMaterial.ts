'use server';

import { createClient } from '@/lib/supabase/server';
import { processMaterial } from './processMaterial';
import { revalidatePath } from 'next/cache';

export async function reprocessMaterial(materialId: string) {
    const supabase = await createClient();

    // Проверка авторизации
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Получение материала для проверки прав
    const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .eq('user_id', user.id)
        .single();

    if (materialError || !material) {
        throw new Error('Material not found');
    }

    console.log(`[reprocessMaterial] Starting reprocessing for material ${materialId}`);

    // 1. Очистка связанных данных
    // Удаляем summary
    await supabase.from('material_summaries').delete().eq('material_id', materialId);

    // Удаляем notes
    await supabase.from('material_notes').delete().eq('material_id', materialId);

    // Удаляем flashcards
    await supabase.from('flashcards').delete().eq('material_id', materialId);

    // Удаляем quizzes
    await supabase.from('quizzes').delete().eq('material_id', materialId);

    // Удаляем embeddings
    await supabase.from('material_embeddings').delete().eq('material_id', materialId);

    // Удаляем сообщения чата
    await supabase.from('tutor_messages').delete().eq('material_id', materialId);

    // 2. Сброс статуса материала и очистка текста
    // Важно: мы очищаем full_text, чтобы processMaterial начал с нуля
    const { error: updateError } = await supabase
        .from('materials')
        .update({
            processing_progress: 0,
            processing_status: 'pending',
            full_text: null // Очищаем текст, чтобы заставить систему получить его заново
        })
        .eq('id', materialId);

    if (updateError) {
        console.error('[reprocessMaterial] Failed to reset material status:', updateError);
        throw new Error('Failed to reset material status');
    }

    // 3. Запуск обработки
    // Запускаем асинхронно, не ждем завершения
    processMaterial(materialId).catch(err => {
        console.error('[reprocessMaterial] Background processing failed:', err);
    });

    revalidatePath(`/dashboard/materials/${materialId}`);

    return { success: true };
}
