'use server';

import { createClient } from '@/lib/supabase/server';
import { addMaterialToQueue, getMaterialJobStatus } from '@/lib/queue/materialQueue';

/**
 * Добавляет материал в очередь на обработку
 * Используется вместо прямого вызова processMaterial для асинхронной обработки
 */
export async function queueMaterialProcessing(materialId: string) {
  try {
    const supabase = await createClient();

    // Проверка авторизации
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Получение материала
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (materialError || !material) {
      return { success: false, error: 'Material not found' };
    }

    // Обновляем статус на pending
    await supabase
      .from('materials')
      .update({
        processing_status: 'pending',
        processing_progress: 0,
      })
      .eq('id', materialId);

    // Добавляем в очередь
    const job = await addMaterialToQueue({
      materialId,
      userId: user.id,
      type: material.type,
    });

    console.log(`[queueMaterial] Material ${materialId} added to queue with job ID: ${job.id}`);

    return {
      success: true,
      jobId: job.id,
      materialId,
    };
  } catch (error) {
    console.error('[queueMaterial] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Получает статус обработки материала из очереди
 */
export async function getProcessingStatus(materialId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Проверяем доступ к материалу
    const { data: material } = await supabase
      .from('materials')
      .select('processing_status, processing_progress')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (!material) {
      return null;
    }

    // Получаем статус из очереди
    const jobStatus = await getMaterialJobStatus(materialId);

    return {
      materialStatus: material.processing_status,
      progress: material.processing_progress,
      jobStatus,
    };
  } catch (error) {
    console.error('[getProcessingStatus] Error:', error);
    return null;
  }
}
