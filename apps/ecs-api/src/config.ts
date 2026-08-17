import { createPublicKey } from "node:crypto";

import { z } from "zod";

import type { JwtValidatorConfig } from "./auth.js";

export interface EcsConfig {
  port: number;
  service: {
    name: string;
    version: string;
    environment: string;
  };
  corsAllowedOrigins: string[];
  jwt: JwtValidatorConfig;
}

const base64PublicKey = z
  .string()
  .min(1)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
  .refine((value) => {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    try {
      return (
        decoded.startsWith("-----BEGIN PUBLIC KEY-----") &&
        decoded.trimEnd().endsWith("-----END PUBLIC KEY-----") &&
        createPublicKey(decoded).asymmetricKeyType === "rsa"
      );
    } catch {
      return false;
    }
  });

const ecsEnvironmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  SERVICE_NAME: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]{1,62}$/),
  SERVICE_VERSION: z.string().regex(/^(?:local|[0-9a-f]{40})$/),
  APP_ENVIRONMENT: z.enum(["local", "dev", "stage", "prod"]),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(
      z
        .array(z.url())
        .min(1)
        .refine((origins) =>
          origins.every((origin) => {
            const parsed = new URL(origin);
            return parsed.protocol === "https:" && parsed.origin === origin;
          }),
        ),
    ),
  JWT_PUBLIC_KEY_BASE64: base64PublicKey,
  JWT_ISSUER: z.string().trim().min(1),
  JWT_AUDIENCE: z.string().trim().min(1),
});

export function loadEcsConfig(
  environment: Record<string, string | undefined>,
): EcsConfig {
  const result = ecsEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new Error(`Invalid ECS configuration: ${fields.join(", ")}`);
  }

  return {
    port: result.data.PORT,
    service: {
      name: result.data.SERVICE_NAME,
      version: result.data.SERVICE_VERSION,
      environment: result.data.APP_ENVIRONMENT,
    },
    corsAllowedOrigins: result.data.CORS_ALLOWED_ORIGINS,
    jwt: {
      publicKey: Buffer.from(
        result.data.JWT_PUBLIC_KEY_BASE64,
        "base64",
      ).toString("utf8"),
      issuer: result.data.JWT_ISSUER,
      audience: result.data.JWT_AUDIENCE,
    },
  };
}
