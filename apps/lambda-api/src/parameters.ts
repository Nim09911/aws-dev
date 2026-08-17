import { createPublicKey } from "node:crypto";

import {
  GetParametersCommand,
  type GetParametersCommandOutput,
} from "@aws-sdk/client-ssm";
import { z } from "zod";

import type { JwtValidatorConfig } from "./auth.js";

export type ApiStage = "dev" | "stage";

interface ParametersClient {
  send(command: GetParametersCommand): Promise<GetParametersCommandOutput>;
}

interface ParameterProviderOptions {
  basePath: string;
  cacheTtlMs: number;
}

interface CacheEntry {
  expiresAt: number;
  value: JwtValidatorConfig;
}

const encodedPublicKey = z
  .string()
  .min(1)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
  .transform((value, context) => {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    try {
      if (
        !decoded.startsWith("-----BEGIN PUBLIC KEY-----") ||
        !decoded.trimEnd().endsWith("-----END PUBLIC KEY-----") ||
        createPublicKey(decoded).asymmetricKeyType !== "rsa"
      ) {
        context.addIssue({
          code: "custom",
          message: "Expected an RSA public key",
        });
        return z.NEVER;
      }
      return decoded;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Expected an RSA public key",
      });
      return z.NEVER;
    }
  });

const runtimeConfigSchema = z.object({
  publicKey: encodedPublicKey,
  issuer: z.string().trim().min(1),
  audience: z.string().trim().min(1),
});

export function createParameterConfigProvider(
  client: ParametersClient,
  options: ParameterProviderOptions,
  now: () => number = Date.now,
) {
  const cache = new Map<ApiStage, CacheEntry>();

  return {
    async get(stageValue: string): Promise<JwtValidatorConfig> {
      const stage = parseStage(stageValue);
      const cached = cache.get(stage);
      if (cached && now() < cached.expiresAt) {
        return cached.value;
      }

      const names = parameterNames(options.basePath, stage);
      const result = await client.send(
        new GetParametersCommand({
          Names: Object.values(names),
          WithDecryption: true,
        }),
      );
      const values = new Map(
        result.Parameters?.flatMap((parameter) =>
          parameter.Name && parameter.Value
            ? [[parameter.Name, parameter.Value] as const]
            : [],
        ),
      );
      const parsed = runtimeConfigSchema.safeParse({
        publicKey: values.get(names.publicKey),
        issuer: values.get(names.issuer),
        audience: values.get(names.audience),
      });
      if (!parsed.success || (result.InvalidParameters?.length ?? 0) > 0) {
        const fields = [
          ...new Set(
            parsed.success
              ? ["parameter-name"]
              : parsed.error.issues.map((issue) =>
                  String(issue.path[0] ?? "parameter"),
                ),
          ),
        ];
        throw new Error(`Invalid runtime parameters: ${fields.join(", ")}`);
      }

      const value = parsed.data;
      cache.set(stage, {
        value,
        expiresAt: now() + options.cacheTtlMs,
      });
      return value;
    },
  };
}

function parseStage(value: string): ApiStage {
  if (value !== "dev" && value !== "stage") {
    throw new Error(`Unsupported API stage: ${value}`);
  }
  return value;
}

function parameterNames(basePath: string, stage: ApiStage) {
  return {
    publicKey: `${basePath}/${stage}/jwt-public-key-base64`,
    issuer: `${basePath}/${stage}/jwt-issuer`,
    audience: `${basePath}/${stage}/jwt-audience`,
  };
}
