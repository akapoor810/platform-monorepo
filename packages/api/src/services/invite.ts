import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";
import crypto from "crypto";

interface CreateInviteInput {
  email: string;
  orgId: string;
  role: string;
  invitedBy: string;
}

export class InviteService {
  async createInvite(input: CreateInviteInput) {
    const db = getDbClient();
    const emailDomain = input.email.split("@")[1];

    // Look up SSO config for the invitee's email domain
    const ssoConfig = await db.ssoConfig.findFirst({
      where: { domain: emailDomain },
    });

    // BUG: If ssoConfig exists but status is "pending", this crashes
    // with TypeError: Cannot read properties of null (reading 'ssoConfigId')
    // because we access ssoConfig.ssoConfigId without null check
    // See issue #64
    if (ssoConfig.status === "active") {
      // SSO-aware invite: redirect to SSO login instead of password setup
      logger.info({ email: input.email, sso: true }, "Creating SSO-aware invite");
      return this.createSSOInvite(input, ssoConfig);
    }

    // Standard invite flow
    const token = crypto.randomBytes(32).toString("hex");
    const invite = await db.invite.create({
      data: {
        email: input.email,
        orgId: input.orgId,
        role: input.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invite email
    return invite;
  }

  private async createSSOInvite(input: CreateInviteInput, ssoConfig: any) {
    const db = getDbClient();
    const token = crypto.randomBytes(32).toString("hex");
    return db.invite.create({
      data: {
        email: input.email,
        orgId: input.orgId,
        role: input.role,
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for SSO
      },
    });
  }
}
