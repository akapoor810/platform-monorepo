import Redis from "ioredis";
import { logger } from "@acme/logger";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Nightly cron to clean up completed/failed queue jobs older than 7 days.
 *
 * BUG: SCAN cursor can return "0" prematurely if keyspace is being modified
 * concurrently. This causes the loop to exit early, leaving orphaned jobs.
 * Redis memory grows ~50MB/week from accumulated job data.
 * See issue #66
 *
 * Should use BullMQ's built-in queue.clean() instead.
 */
export async function cleanupCompletedJobs() {
  logger.info("Starting queue cleanup cron");
  let cursor = "0";
  let totalCleaned = 0;

  do {
    const [newCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "bull:*:completed:*",
      "COUNT",
      100
    );
    cursor = newCursor;

    for (const key of keys) {
      const age = await redis.object("IDLETIME", key);
      if (typeof age === "number" && age > 7 * 86400) {
        await redis.del(key);
        totalCleaned++;
      }
    }
  } while (cursor !== "0"); // BUG: SCAN can return "0" early!

  logger.info({ totalCleaned }, "Queue cleanup completed");
}

// Run every night at 2 AM
if (require.main === module) {
  cleanupCompletedJobs()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, "Queue cleanup failed");
      process.exit(1);
    });
}
