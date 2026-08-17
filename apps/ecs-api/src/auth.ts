import { createPublicKey } from "node:crypto";

import { jwtVerify } from "jose";

import type { AuthIdentity } from "./app.js";

export interface JwtValidatorConfig {
  publicKey: string;
  issuer: string;
  audience: string;
}

export function createJwtValidator(config: JwtValidatorConfig) {
  const verificationKey = createPublicKey(config.publicKey);

  return async (token: string): Promise<AuthIdentity | null> => {
    try {
      const { payload } = await jwtVerify(token, verificationKey, {
        algorithms: ["RS256"],
        issuer: config.issuer,
        audience: config.audience,
      });

      return typeof payload.sub === "string" &&
        payload.sub.length > 0 &&
        typeof payload.exp === "number" &&
        Number.isFinite(payload.exp)
        ? { subject: payload.sub }
        : null;
    } catch {
      return null;
    }
  };
}
