import { Worker } from 'bullmq';
import { NOTIFICATIONS_QUEUE, notificationsConnection } from '@gitjira/api/jobs/queue';
import { handleNotificationJob } from '@gitjira/api/jobs/notification-handler';
import { logger } from '@gitjira/api/logger';

// LEARN: the worker is a SEPARATE process from the API. It shares code
// (packages + the api's job handlers) but runs on its own, reading jobs from
// Redis. In production you scale workers independently of web servers — heavy
// background load doesn't slow the API, and vice versa.
const worker = new Worker(
  NOTIFICATIONS_QUEUE,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'processing notification job');
    return handleNotificationJob(job);
  },
  { connection: notificationsConnection, concurrency: 5 }
);

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'notification job done');
});
worker.on('failed', (job, err) => {
  // A job that exhausts its retries stays in the failed set (our dead-letter
  // queue) for inspection and manual replay.
  logger.error(
    { jobId: job?.id, attempts: job?.attemptsMade, err: err.message },
    'notification job failed'
  );
});

// LEARN: graceful shutdown — on SIGTERM, stop taking new jobs and let in-flight
// ones finish before exiting. Killing a worker mid-job (without this) is how
// jobs get lost or left half-done.
const shutdown = async () => {
  logger.info('worker shutting down');
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('gitjira notification worker started');
