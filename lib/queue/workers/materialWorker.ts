import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, MaterialProcessingJob } from '../materialQueue';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Worker для обработки материалов
 * Запускается отдельным процессом через: npm run worker
 */

async function processMaterialJob(job: Job<MaterialProcessingJob>) {
  const { materialId, userId, type, options } = job.data;

  console.log(`[MaterialWorker] Processing material ${materialId} (type: ${type})`);

  try {
    // Обновляем прогресс
    await job.updateProgress(0);

    // Создаем Supabase клиент
    // ВАЖНО: В worker контексте нет cookies, поэтому используем service role key
    const supabase = await createSupabaseServerClient();

    // Проверяем материал
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', userId)
      .single();

    if (materialError || !material) {
      throw new Error('Material not found');
    }

    // Обновляем статус на processing
    await supabase
      .from('materials')
      .update({
        processing_status: 'processing',
        processing_progress: 0,
      })
      .eq('id', materialId);

    await job.updateProgress(5);

    // ====== ИЗВЛЕЧЕНИЕ ТЕКСТА ======
    console.log(`[MaterialWorker] Step 1: Extracting text from ${type}`);

    let fullText = '';

    if (type === 'pdf') {
      // PDF обработка
      const { extractAndNormalizeText } = await import('@/app/actions/processMaterial');
      fullText = await extractAndNormalizeText(materialId);
    } else if (type === 'youtube') {
      // YouTube обработка
      const { getYouTubeTranscript } = await import('@/app/actions/processMaterial');
      fullText = await getYouTubeTranscript(material.source);
    }

    if (!fullText || fullText.length < 100) {
      throw new Error('Failed to extract text or text too short');
    }

    // Сохраняем full_text
    await supabase.from('materials').update({ full_text: fullText }).eq('id', materialId);

    await job.updateProgress(20);

    // ====== ГЕНЕРАЦИЯ AI КОНТЕНТА ======
    console.log(`[MaterialWorker] Step 2: Generating AI content`);

    const { generateAIContent } = await import('@/app/actions/processMaterial');

    await generateAIContent(materialId, fullText, {
      skipSummary: options?.skipSummary,
      skipNotes: options?.skipNotes,
      skipFlashcards: options?.skipFlashcards,
      skipQuiz: options?.skipQuiz,
    });

    await job.updateProgress(60);

    // ====== СОЗДАНИЕ EMBEDDINGS ======
    if (!options?.skipEmbeddings) {
      console.log(`[MaterialWorker] Step 3: Creating embeddings`);

      const { createEmbeddings } = await import('@/app/actions/processMaterial');
      await createEmbeddings(materialId, fullText);
    }

    await job.updateProgress(90);

    // ====== ЗАВЕРШЕНИЕ ======
    await supabase
      .from('materials')
      .update({
        processing_status: 'completed',
        processing_progress: 100,
      })
      .eq('id', materialId);

    await job.updateProgress(100);

    console.log(`[MaterialWorker] Material ${materialId} processed successfully`);

    return { success: true, materialId };
  } catch (error) {
    console.error(`[MaterialWorker] Error processing material ${materialId}:`, error);

    // Обновляем статус на failed
    const supabase = await createSupabaseServerClient();
    await supabase
      .from('materials')
      .update({
        processing_status: 'failed',
      })
      .eq('id', materialId);

    throw error; // BullMQ автоматически повторит попытку
  }
}

/**
 * Создает и запускает worker
 */
export function createMaterialWorker() {
  const worker = new Worker<MaterialProcessingJob>(
    QUEUE_NAMES.MATERIAL_PROCESSING,
    processMaterialJob,
    {
      connection: createRedisConnection(),
      concurrency: 2, // Обрабатывать до 2 материалов одновременно
      limiter: {
        max: 10, // Максимум 10 jobs
        duration: 60000, // За 1 минуту
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[MaterialWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[MaterialWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[MaterialWorker] Worker error:', err);
  });

  return worker;
}

// Если запускается напрямую (npm run worker)
if (require.main === module) {
  console.log('[MaterialWorker] Starting worker...');
  const worker = createMaterialWorker();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[MaterialWorker] Shutting down...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[MaterialWorker] Shutting down...');
    await worker.close();
    process.exit(0);
  });
}
