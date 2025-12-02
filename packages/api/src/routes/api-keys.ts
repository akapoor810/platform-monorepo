import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";
import crypto from "crypto";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const db = getDbClient();
  const { name, scopes, expiresIn } = req.body;

  const key = `acme_${crypto.randomBytes(24).toString("hex")}`;
  const apiKey = await db.apiKey.create({
    data: {
      key,
      name,
      scopes: scopes || ["read"],
      orgId: req.user!.orgId!,
      userId: req.user!.id,
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null,
    },
  });

  // Only return the full key on creation
  res.status(201).json({
    id: apiKey.id,
    key, // Only shown once!
    name: apiKey.name,
    scopes: apiKey.scopes,
    createdAt: apiKey.createdAt,
  });
});

router.get("/", requireAuth, async (req, res) => {
  const db = getDbClient();
  const keys = await db.apiKey.findMany({
    where: { orgId: req.user!.orgId!, revokedAt: null },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
      expiresAt: true,
      // Never return the actual key in list view
      key: false,
    },
  });
  res.json(keys);
});

router.delete("/:keyId", requireAuth, requireRole("admin"), async (req, res) => {
  const db = getDbClient();
  await db.apiKey.update({
    where: { id: req.params.keyId },
    data: { revokedAt: new Date() },
  });
  res.sendStatus(204);
});

export default router;
