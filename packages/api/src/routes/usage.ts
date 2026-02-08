import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDbClient } from "@acme/db";

const router = Router();

/**
 * Usage API endpoints for usage-based billing.
 * See issue #61 for metering architecture.
 */
router.get("/current", requireAuth, async (req, res) => {
  const db = getDbClient();
  const orgId = req.user!.orgId!;
  const currentPeriod = getCurrentPeriod();

  const records = await db.usageRecord.findMany({
    where: { orgId, period: currentPeriod },
  });

  // TODO: Get limits from Stripe subscription metadata
  const limits: Record<string, number> = {
    api_calls: 10_000,
    storage_bytes: 5_368_709_120, // 5 GB
    seats: 10,
  };

  const usage = ["api_calls", "storage_bytes", "seats"].map((metric) => ({
    metric,
    current: records.find((r) => r.metric === metric)?.value || 0,
    limit: limits[metric] || 0,
    period: currentPeriod,
  }));

  res.json({ usage });
});

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default router;
