import { describe, expect, it } from "vitest";

import { loadLambdaConfig } from "../src/config.js";

describe("Lambda startup configuration", () => {
  it("keeps only ordinary names, URLs, and a bounded cache TTL in the environment", () => {
    expect(
      loadLambdaConfig({
        SERVICE_NAME: "lambda-api",
        JOB_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/123456789012/jobs",
        JWT_PARAMETER_BASE_PATH: "/aws-developer-course/lambda",
        PARAMETER_CACHE_TTL_SECONDS: "30",
      }),
    ).toEqual({
      serviceName: "lambda-api",
      jobQueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/jobs",
      jwtParameterBasePath: "/aws-developer-course/lambda",
      parameterCacheTtlMs: 30_000,
    });
  });

  it("fails without echoing invalid configuration values", () => {
    const invalidValue = "do-not-print-this-value";

    expect(() =>
      loadLambdaConfig({
        SERVICE_NAME: "",
        JOB_QUEUE_URL: "not-a-url",
        JWT_PARAMETER_BASE_PATH: invalidValue,
        PARAMETER_CACHE_TTL_SECONDS: "9999",
      }),
    ).toThrow(
      /Invalid Lambda configuration: .*SERVICE_NAME.*JOB_QUEUE_URL.*JWT_PARAMETER_BASE_PATH.*PARAMETER_CACHE_TTL_SECONDS/,
    );

    try {
      loadLambdaConfig({
        SERVICE_NAME: "",
        JOB_QUEUE_URL: "not-a-url",
        JWT_PARAMETER_BASE_PATH: invalidValue,
      });
    } catch (error) {
      expect(String(error)).not.toContain(invalidValue);
    }
  });

  it("rejects secret material in ordinary environment variables", () => {
    expect(() =>
      loadLambdaConfig({
        SERVICE_NAME: "lambda-api",
        JOB_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/123/jobs",
        JWT_PARAMETER_BASE_PATH: "/aws-developer-course/lambda",
        JWT_PUBLIC_KEY_BASE64: "must-not-be-here",
      }),
    ).toThrow("Secret auth configuration must come from Parameter Store");
  });
});
