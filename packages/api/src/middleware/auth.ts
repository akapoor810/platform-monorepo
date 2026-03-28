import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@acme/auth";
import { logger } from "@acme/logger";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  try {
    const token = header.slice(7);
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn({ err }, "Token verification failed");
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
