import { Queue, Worker, Job } from "bullmq";
import { logger } from "@acme/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: { url: REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 5
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, {
    connection: { url: REDIS_URL },
    concurrency,
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, queueName, err }, "Job failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, queueName }, "Job completed");
  });

  return worker;
}
