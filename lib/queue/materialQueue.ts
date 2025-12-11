import { Queue, QueueOptions } from 'bullmq';
import { getRedisClient } from './redis';

/**
 * Типы для Material Processing Queue
 */
export interface MaterialProcessingJob {
  materialId: string;
  userId: string;
  type: 'pdf' | 'youtube';
  options?: {
    skipSummary?: boolean;
    skipNotes?: boolean;
    skipFlashcards?: boolean;
    skipQuiz?: boolean;
    skipEmbeddings?: boolean;
  };
}

export interface PodcastGenerationJob {
  materialId: string;
  userId: string;
}

export interface PresentationGenerationJob {
  materialId: string;
  userId: string;
}

/**
 * Названия очередей
 */
export const QUEUE_NAMES = {
  MATERIAL_PROCESSING: 'material-processing',
  PODCAST_GENERATION: 'podcast-generation',
  PRESENTATION_GENERATION: 'presentation-generation',
} as const;

/**
 * Конфигурация очередей
 */
const queueOptions: QueueOptions = {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3, // Количество попыток при ошибке
    backoff: {
      type: 'exponential', // Экспоненциальная задержка между попытками
      delay: 5000, // Начальная задержка 5 сек
    },
    removeOnComplete: {
      age: 24 * 3600, // Удалять завершенные jobs через 24 часа
      count: 1000, // Хранить максимум 1000 завершенных jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Удалять неудачные jobs через 7 дней
    },
  },
};

/**
 * Очередь для обработки материалов (PDF/YouTube)
 */
export const materialQueue = new Queue<MaterialProcessingJob>(
  QUEUE_NAMES.MATERIAL_PROCESSING,
  queueOptions
);

/**
 * Очередь для генерации подкастов
 */
export const podcastQueue = new Queue<PodcastGenerationJob>(
  QUEUE_NAMES.PODCAST_GENERATION,
  {
    ...queueOptions,
    defaultJobOptions: {
      ...queueOptions.defaultJobOptions,
      attempts: 2, // Меньше попыток для подкастов (они дорогие)
    },
  }
);

/**
 * Очередь для генерации презентаций
 */
export const presentationQueue = new Queue<PresentationGenerationJob>(
  QUEUE_NAMES.PRESENTATION_GENERATION,
  {
    ...queueOptions,
    defaultJobOptions: {
      ...queueOptions.defaultJobOptions,
      attempts: 2,
    },
  }
);

/**
 * Вспомогательные функции для работы с очередями
 */

/**
 * Добавляет материал в очередь на обработку
 */
export async function addMaterialToQueue(job: MaterialProcessingJob) {
  return materialQueue.add('process-material', job, {
    jobId: `material-${job.materialId}`, // Уникальный ID предотвращает дубликаты
  });
}

/**
 * Добавляет задачу генерации подкаста
 */
export async function addPodcastToQueue(job: PodcastGenerationJob) {
  return podcastQueue.add('generate-podcast', job, {
    jobId: `podcast-${job.materialId}`,
  });
}

/**
 * Добавляет задачу генерации презентации
 */
export async function addPresentationToQueue(job: PresentationGenerationJob) {
  return presentationQueue.add('generate-presentation', job, {
    jobId: `presentation-${job.materialId}`,
  });
}

/**
 * Получает статус обработки материала
 */
export async function getMaterialJobStatus(materialId: string) {
  const job = await materialQueue.getJob(`material-${materialId}`);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Удаляет job из очереди (например, при удалении материала)
 */
export async function removeMaterialJob(materialId: string) {
  const job = await materialQueue.getJob(`material-${materialId}`);
  if (job) {
    await job.remove();
  }
}

/**
 * Очищает очередь (для тестирования)
 */
export async function clearQueue(queueName: keyof typeof QUEUE_NAMES) {
  const queue = getQueueByName(queueName);
  await queue.drain();
  await queue.clean(0, 1000, 'completed');
  await queue.clean(0, 1000, 'failed');
}

function getQueueByName(queueName: keyof typeof QUEUE_NAMES) {
  switch (queueName) {
    case 'MATERIAL_PROCESSING':
      return materialQueue;
    case 'PODCAST_GENERATION':
      return podcastQueue;
    case 'PRESENTATION_GENERATION':
      return presentationQueue;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }
}
