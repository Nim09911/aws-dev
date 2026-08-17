import { z } from "zod";

export interface LambdaConfig {
  serviceName: string;
  jobQueueUrl: string;
  jwtParameterBasePath: string;
  parameterCacheTtlMs: number;
}

const lambdaEnvironmentSchema = z.object({
  SERVICE_NAME: z.string().trim().min(1).max(64),
  JOB_QUEUE_URL: z.url(),
  JWT_PARAMETER_BASE_PATH: z
    .string()
    .regex(/^\/[A-Za-z0-9_.\-/]+[A-Za-z0-9_.-]$/),
  PARAMETER_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(5)
    .max(300)
    .default(30),
});

export function loadLambdaConfig(
  environment: Record<string, string | undefined>,
): LambdaConfig {
  const forbiddenFields = [
    "JWT_PUBLIC_KEY_BASE64",
    "JWT_ISSUER",
    "JWT_AUDIENCE",
  ].filter((field) => environment[field] !== undefined);
  if (forbiddenFields.length > 0) {
    throw new Error("Secret auth configuration must come from Parameter Store");
  }

  const result = lambdaEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new Error(`Invalid Lambda configuration: ${fields.join(", ")}`);
  }

  return {
    serviceName: result.data.SERVICE_NAME,
    jobQueueUrl: result.data.JOB_QUEUE_URL,
    jwtParameterBasePath: result.data.JWT_PARAMETER_BASE_PATH,
    parameterCacheTtlMs: result.data.PARAMETER_CACHE_TTL_SECONDS * 1_000,
  };
}
