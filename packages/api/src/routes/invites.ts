import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { InviteService } from "../services/invite";
import { logger } from "@acme/logger";

const router = Router();
const inviteService = new InviteService();

router.post("/:orgId/invites", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const invite = await inviteService.createInvite({
      email: req.body.email,
      orgId: req.params.orgId,
      role: req.body.role || "member",
      invitedBy: req.user!.id,
    });
    res.status(201).json(invite);
  } catch (err) {
    logger.error({ err, orgId: req.params.orgId }, "Failed to create invite");
    res.status(500).json({ error: "Failed to create invite" });
  }
});

export default router;
