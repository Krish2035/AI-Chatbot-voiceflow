import { Queue, Worker } from 'bullmq';
import { getRedisStatus, getRedisClient } from './redisService.js';
import dotenv from 'dotenv';

dotenv.config();

let taskQueue = null;
let taskWorker = null;
let isQueueActive = false;

const QUEUE_NAME = 'voiceflow-ai-tasks';

// In-memory queue handler for when Redis is unavailable
const runTaskInline = async (jobName, data) => {
  setImmediate(async () => {
    try {
      await processJob({ name: jobName, data });
    } catch (_) {}
  });
};

/**
 * Worker processor function
 */
const processJob = async (job) => {
  const { name } = job;
  // Background processing hooks (search indexing, auto titles, telemetry)
  return { success: true, processedAt: new Date().toISOString() };
};

/**
 * Initialize BullMQ only when Redis is available
 */
export const initQueue = () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  // Check if Redis is actively running before spawning BullMQ listeners
  const redisStat = getRedisStatus();
  if (!redisStat.connected) {
    isQueueActive = false;
    console.log('💡 BullMQ running in Async Inline mode (Redis connection pending).');
    return;
  }

  try {
    const connection = {
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 1000
    };

    taskQueue = new Queue(QUEUE_NAME, { connection });
    taskWorker = new Worker(QUEUE_NAME, processJob, { connection, concurrency: 5 });

    taskWorker.on('error', () => {
      isQueueActive = false;
    });

    isQueueActive = true;
    console.log('✅ BullMQ background queue & worker active');
  } catch (err) {
    isQueueActive = false;
  }
};

/**
 * Enqueue a task to BullMQ (or inline fallback)
 */
export const enqueueTask = async (name, data, opts = {}) => {
  const redisStat = getRedisStatus();
  if (isQueueActive && taskQueue && redisStat.connected) {
    try {
      await taskQueue.add(name, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 50,
        ...opts
      });
      return { queued: true, type: 'bullmq' };
    } catch (_) {
      await runTaskInline(name, data);
      return { queued: true, type: 'inline-fallback' };
    }
  }

  // Graceful asynchronous inline fallback
  await runTaskInline(name, data);
  return { queued: true, type: 'inline' };
};

export const getQueueStatus = () => ({
  active: isQueueActive,
  queueName: QUEUE_NAME,
  mode: isQueueActive && getRedisStatus().connected ? 'BullMQ (Redis Distributed Worker)' : 'Async Inline Queue'
});

export default {
  initQueue,
  enqueueTask,
  getQueueStatus
};
