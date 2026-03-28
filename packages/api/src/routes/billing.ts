import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { BillingService } from "../services/billing";
import { logger } from "@acme/logger";

const router = Router();

const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  paymentMethodId: z.string(),
  couponCode: z.string().optional(),
});

router.post("/subscriptions", requireAuth, async (req, res, next) => {
  try {
    const body = CreateSubscriptionSchema.parse(req.body);
    const subscription = await BillingService.createSubscription({
      userId: req.user!.id,
      ...body,
    });
    res.status(201).json(subscription);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, "Failed to create subscription");
    next(err);
  }
});

router.get("/subscriptions/current", requireAuth, async (req, res, next) => {
  try {
    const subscription = await BillingService.getCurrentSubscription(req.user!.id);
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription" });
    }
    res.json(subscription);
  } catch (err) {
    next(err);
  }
});

router.post("/webhooks/stripe", async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    await BillingService.handleWebhook(req.body, sig);
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, "Stripe webhook processing failed");
    res.sendStatus(400);
  }
});

export default router;
