import Stripe from "stripe";
import Redis from "ioredis";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Usage-based billing metering service.
 * Tracks API calls per org and reports to Stripe Meters API.
 * See issue #61 for architecture.
 */
export class MeteringService {
  /**
   * Increment API usage counter for an org.
   * Called by the usage-tracker middleware on every request.
   */
  async trackApiCall(orgId: string): Promise<void> {
    const key = `usage:api_calls:${orgId}:${getCurrentPeriod()}`;
    await redis.incr(key);
    // Expire after 45 days to auto-cleanup
    await redis.expire(key, 45 * 24 * 3600);
  }

  /**
   * Get current usage for an org.
   */
  async getCurrentUsage(orgId: string): Promise<number> {
    const key = `usage:api_calls:${orgId}:${getCurrentPeriod()}`;
    const count = await redis.get(key);
    return parseInt(count || "0", 10);
  }

  /**
   * Report usage to Stripe Meters API.
   * Called by hourly cron job.
   */
  async reportToStripe(orgId: string): Promise<void> {
    const db = getDbClient();
    const org = await db.org.findUnique({ where: { id: orgId } });

    if (!org) {
      logger.warn({ orgId }, "Org not found for metering report");
      return;
    }

    const usage = await this.getCurrentUsage(orgId);

    try {
      await stripe.billing.meterEvents.create({
        event_name: "api_calls",
        payload: {
          value: usage.toString(),
          stripe_customer_id: (org as any).stripeCustomerId,
        },
      });

      logger.info({ orgId, usage }, "Reported usage to Stripe");
    } catch (err) {
      // BUG: If stripeCustomerId is undefined (free plan orgs),
      // this throws TypeError: Cannot read properties of undefined
      // See issue #51
      logger.error({ err, orgId }, "Failed to report usage to Stripe");
      throw err;
    }
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
