import { Request, Response, NextFunction } from "express";
import { MeteringService } from "../services/metering";
import { logger } from "@acme/logger";

const metering = new MeteringService();

/**
 * Middleware to track API usage per org for usage-based billing.
 * See issue #61 for metering architecture.
 */
export function usageTracker() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only track authenticated requests
    if (!req.user?.orgId) {
      return next();
    }

    // Track in background — don't block the request
    metering.trackApiCall(req.user.orgId).catch((err) => {
      logger.error({ err, orgId: req.user?.orgId }, "Failed to track API usage");
    });

    next();
  };
}
