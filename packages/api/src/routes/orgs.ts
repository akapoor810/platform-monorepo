import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const db = getDbClient();
  const orgs = await db.org.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { users: true } } },
  });
  res.json(orgs);
});

router.get("/:orgId", requireAuth, async (req, res) => {
  const db = getDbClient();
  const org = await db.org.findUnique({
    where: { id: req.params.orgId },
    include: { users: true, ssoConfig: true },
  });
  if (!org || org.deletedAt) {
    return res.status(404).json({ error: "Organization not found" });
  }
  res.json(org);
});

// GET /orgs/:id/users — SLOW for large orgs
// Missing composite index on (orgId, createdAt) — see issue #48
router.get("/:orgId/users", requireAuth, async (req, res) => {
  const db = getDbClient();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  // This query is slow for large orgs (8s+ for 10k users)
  // because there's no composite index on (orgId, createdAt)
  const users = await db.user.findMany({
    where: { orgId: req.params.orgId, deactivatedAt: null },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.user.count({
    where: { orgId: req.params.orgId, deactivatedAt: null },
  });

  res.json({ users, total, page, limit });
});

// DELETE /orgs/:orgId — INCOMPLETE cleanup
// BUG: Only soft-deletes the org record, doesn't clean up:
// - Stripe subscriptions (customers keep getting charged!)
// - Pending queue jobs (worker errors flood logs)
// - API keys (deleted org's keys still authenticate)
// - SSO configuration
// See issue #71
router.delete("/:orgId", requireAuth, requireRole("admin"), async (req, res) => {
  const db = getDbClient();
  await db.org.update({
    where: { id: req.params.orgId },
    data: { deletedAt: new Date() },
  });
  // TODO: Cancel Stripe subscriptions
  // TODO: Remove pending queue jobs
  // TODO: Revoke API keys
  // TODO: Delete SSO config
  // TODO: Deactivate users
  // TODO: Send notification emails
  res.sendStatus(204);
});

export default router;
