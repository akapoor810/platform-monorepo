import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { parseSAMLResponse } from "@acme/auth/saml";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = getDbClient();

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // TODO: Check SSO enforcement before allowing password login
    // See issue #67 — need to block password login when SSO is enforced
    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sso/callback", async (req, res) => {
  try {
    const { SAMLResponse } = req.body;
    const decoded = Buffer.from(SAMLResponse, "base64").toString("utf-8");
    const attributes = parseSAMLResponse(decoded);

    const db = getDbClient();
    let user = await db.user.findUnique({ where: { email: attributes.email } });

    if (!user) {
      // Auto-provision user from SSO
      const domain = attributes.email.split("@")[1];
      const ssoConfig = await db.ssoConfig.findFirst({ where: { domain } });
      if (!ssoConfig) {
        return res.status(403).json({ error: "SSO not configured for this domain" });
      }

      user = await db.user.create({
        data: {
          email: attributes.email,
          name: `${attributes.firstName || ""} ${attributes.lastName || ""}`.trim(),
          orgId: ssoConfig.orgId,
          role: attributes.role || "member",
        },
      });
    }

    const token = generateToken(user);
    res.redirect(`/auth/callback?token=${token}`);
  } catch (err) {
    logger.error({ err }, "SSO callback failed");
    res.status(500).json({ error: "SSO authentication failed" });
  }
});

router.post("/refresh", requireAuth, async (req, res) => {
  // Race condition: if two parallel requests both try to refresh,
  // the second one will fail with 401 because the first already
  // invalidated the old token. See issue #44
  try {
    const newToken = generateToken(req.user!);
    res.json({ token: newToken });
  } catch (err) {
    logger.error({ err }, "Token refresh failed");
    res.status(401).json({ error: "Token refresh failed" });
  }
});

function generateToken(user: any): string {
  // Simplified — real impl uses jose/jwt
  return Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    iat: Date.now(),
    exp: Date.now() + 3600000,
  })).toString("base64");
}

async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(plain, hashed);
}

export default router;
