import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { loadEcsConfig } from "../src/config.js";

const publicKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
}).publicKey.export({ type: "spki", format: "pem" });

describe("ECS startup configuration", () => {
  it("parses the port and decodes JWT configuration", () => {
    expect(
      loadEcsConfig({
        PORT: "4000",
        SERVICE_NAME: "ecs-api",
        SERVICE_VERSION: "0123456789abcdef0123456789abcdef01234567",
        APP_ENVIRONMENT: "dev",
        CORS_ALLOWED_ORIGINS: "https://learner.example,https://admin.example",
        JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString("base64"),
        JWT_ISSUER: "https://issuer.example.com",
        JWT_AUDIENCE: "aws-course-api",
      }),
    ).toEqual({
      port: 4000,
      service: {
        name: "ecs-api",
        version: "0123456789abcdef0123456789abcdef01234567",
        environment: "dev",
      },
      corsAllowedOrigins: ["https://learner.example", "https://admin.example"],
      jwt: {
        publicKey,
        issuer: "https://issuer.example.com",
        audience: "aws-course-api",
      },
    });
  });

  it("fails with field names but not secret values", () => {
    const secretValue = "do-not-print-this-key";

    expect(() =>
      loadEcsConfig({
        PORT: "70000",
        JWT_PUBLIC_KEY_BASE64: secretValue,
        JWT_ISSUER: "",
        JWT_AUDIENCE: "aws-course-api",
      }),
    ).toThrow(/Invalid ECS configuration: .*PORT.*JWT_/);

    try {
      loadEcsConfig({
        JWT_PUBLIC_KEY_BASE64: secretValue,
        JWT_ISSUER: "",
        JWT_AUDIENCE: "aws-course-api",
      });
    } catch (error) {
      expect(String(error)).not.toContain(secretValue);
    }
  });

  it("rejects a base64 value that is not a valid RSA public key", () => {
    const invalidKey =
      "-----BEGIN PUBLIC KEY-----\ntest-key\n-----END PUBLIC KEY-----";

    expect(() =>
      loadEcsConfig({
        SERVICE_NAME: "ecs-api",
        SERVICE_VERSION: "local",
        APP_ENVIRONMENT: "local",
        CORS_ALLOWED_ORIGINS: "https://learner.example",
        JWT_PUBLIC_KEY_BASE64: Buffer.from(invalidKey).toString("base64"),
        JWT_ISSUER: "https://issuer.example.com",
        JWT_AUDIENCE: "aws-course-api",
      }),
    ).toThrow("Invalid ECS configuration: JWT_PUBLIC_KEY_BASE64");
  });

  it("rejects an empty CORS allowlist and malformed startup metadata", () => {
    expect(() =>
      loadEcsConfig({
        SERVICE_NAME: "",
        SERVICE_VERSION: "latest",
        APP_ENVIRONMENT: "",
        CORS_ALLOWED_ORIGINS: "",
        JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKey).toString("base64"),
        JWT_ISSUER: "https://issuer.example.com",
        JWT_AUDIENCE: "aws-course-api",
      }),
    ).toThrow(
      /Invalid ECS configuration: .*SERVICE_NAME.*SERVICE_VERSION.*APP_ENVIRONMENT.*CORS_ALLOWED_ORIGINS/,
    );
  });
});
