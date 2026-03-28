import jwt from "jsonwebtoken";
import { SSO_CONFIG } from "./config";

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  orgId: string;
  iat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  return jwt.verify(token, SSO_CONFIG.publicKey, {
    algorithms: ["RS256"],
    issuer: SSO_CONFIG.issuer,
  }) as TokenPayload;
}

export async function createToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
  return jwt.sign(payload, SSO_CONFIG.privateKey, {
    algorithm: "RS256",
    expiresIn: "8h",
    issuer: SSO_CONFIG.issuer,
  });
}

export { SSO_CONFIG } from "./config";
