import { Queue, Worker, Job } from "bullmq";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";
import crypto from "crypto";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// BUG: attempts set to 25 without adjusting backoff delay
// This causes a thundering herd when customer endpoints go down
// See issue #69
const webhookQueue = new Queue("webhook-delivery", {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 25, // Way too many retries!
    backoff: {
      type: "exponential",
      delay: 1000, // Starts at 1s — too aggressive
    },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  orgId: string;
  webhookUrl: string;
  secret: string;
}

export async function enqueueWebhook(payload: WebhookPayload) {
  const signature = crypto
    .createHmac("sha256", payload.secret)
    .update(JSON.stringify(payload.data))
    .digest("hex");

  await webhookQueue.add("deliver", {
    ...payload,
    signature,
    enqueuedAt: new Date().toISOString(),
  });

  logger.info(
    { event: payload.event, orgId: payload.orgId },
    "Webhook enqueued for delivery"
  );
}

export function startWebhookWorker() {
  const worker = new Worker(
    "webhook-delivery",
    async (job: Job) => {
      const { webhookUrl, data, signature, event, orgId } = job.data;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acme-Signature": `sha256=${signature}`,
          "X-Acme-Event": event,
          "X-Acme-Delivery": job.id!,
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook delivery failed: ${response.status} ${response.statusText}`
        );
      }

      logger.info(
        { event, orgId, status: response.status, attempt: job.attemptsMade + 1 },
        "Webhook delivered"
      );
    },
    {
      connection: { url: REDIS_URL },
      concurrency: 10,
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err, attempt: job?.attemptsMade },
      "Webhook delivery failed"
    );
  });

  return worker;
}
