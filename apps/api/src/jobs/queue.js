import { Queue } from 'bullmq';

// LEARN: a Queue is the api's handle to drop jobs into Redis. The worker (a
// separate process) reads from the same queue. This split — enqueue here,
// process there — is the whole point: the request path stays fast, and slow or
// failure-prone work happens off to the side where it can be retried.
const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

// Lazily created so tests / no-Redis environments don't force a connection.
let notificationsQueue = null;
export function getNotificationsQueue() {
  if (!notificationsQueue) {
    notificationsQueue = new Queue('notifications', {
      connection,
      defaultJobOptions: {
        // LEARN: retries with EXPONENTIAL backoff. A transient failure (DB
        // blip) shouldn't fail permanently; but retrying instantly hammers a
        // struggling dependency. Back off: 1s, 2s, 4s. After 5 tries the job is
        // "failed" and BullMQ keeps it (our dead-letter — inspectable, replayable).
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: false, // keep failed jobs = the dead-letter queue
      },
    });
  }
  return notificationsQueue;
}

export const NOTIFICATIONS_QUEUE = 'notifications';
export const notificationsConnection = connection;

// Enqueue a notification fan-out job. Called from the activity seam.
export async function enqueueNotification(job) {
  if (process.env.DISABLE_QUEUE === '1') return; // tests can opt out
  await getNotificationsQueue().add('fan-out', job);
}
