import { Redis } from 'ioredis';

/**
 * Redis клиент для BullMQ
 * Используется для подключения к Redis серверу
 */

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Требуется для BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
  }

  return redisClient;
}

/**
 * Создает новое подключение Redis для worker
 * Worker требует отдельное подключение
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

/**
 * Закрывает Redis подключение (для graceful shutdown)
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
