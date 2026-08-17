import { generateKeyPairSync } from "node:crypto";

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { createJwtValidator } from "../src/auth.js";

describe("Lambda JWT validator", () => {
  it("validates signature, issuer, audience, expiry, and subject", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setIssuer("https://issuer.example.com")
      .setAudience("aws-course-api")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const validateToken = createJwtValidator({
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
      issuer: "https://issuer.example.com",
      audience: "aws-course-api",
    });

    await expect(validateToken(token)).resolves.toEqual({ subject: "user-1" });
    await expect(
      createJwtValidator({
        publicKey: publicKey.export({ type: "spki", format: "pem" }),
        issuer: "https://issuer.example.com",
        audience: "other-api",
      })(token),
    ).resolves.toBeNull();
  });

  it("rejects a token without an expiration claim", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setIssuer("https://issuer.example.com")
      .setAudience("aws-course-api")
      .setIssuedAt()
      .sign(privateKey);
    const validateToken = createJwtValidator({
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
      issuer: "https://issuer.example.com",
      audience: "aws-course-api",
    });

    await expect(validateToken(token)).resolves.toBeNull();
  });
});
