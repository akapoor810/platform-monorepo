import { getDbClient } from "@acme/db";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member" | "viewer";
  orgId: string;
  stripeCustomerId?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const db = getDbClient();
    return db.user.findUnique({ where: { id } });
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = getDbClient();
    return db.user.findUnique({ where: { email } });
  }

  static async findByOrg(orgId: string, opts?: { role?: string; limit?: number }) {
    const db = getDbClient();
    return db.user.findMany({
      where: { orgId, ...(opts?.role ? { role: opts.role } : {}) },
      take: opts?.limit ?? 100,
      orderBy: { createdAt: "desc" },
    });
  }
}
