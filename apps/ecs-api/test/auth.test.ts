import { generateKeyPairSync } from "node:crypto";

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { createJwtValidator } from "../src/auth.js";

const issuer = "https://issuer.example.com";
const audience = "aws-course-api";
const signingKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 });

async function token(
  options: {
    tokenIssuer?: string;
    tokenAudience?: string;
    expiresAt?: number;
    includeExpiration?: boolean;
    privateKey?: typeof signingKey.privateKey;
  } = {},
) {
  let builder = new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("user-1")
    .setIssuer(options.tokenIssuer ?? issuer)
    .setAudience(options.tokenAudience ?? audience)
    .setIssuedAt();

  if (options.includeExpiration !== false) {
    builder = builder.setExpirationTime(
      options.expiresAt ?? Math.floor(Date.now() / 1000) + 300,
    );
  }

  return builder.sign(options.privateKey ?? signingKey.privateKey);
}

describe("ECS JWT validator", () => {
  const validateToken = createJwtValidator({
    publicKey: signingKey.publicKey.export({
      type: "spki",
      format: "pem",
    }),
    issuer,
    audience,
  });

  it("returns the signed token subject", async () => {
    await expect(validateToken(await token())).resolves.toEqual({
      subject: "user-1",
    });
  });

  it.each([
    ["wrong issuer", () => token({ tokenIssuer: "https://other.example.com" })],
    ["wrong audience", () => token({ tokenAudience: "other-api" })],
    [
      "expired token",
      () => token({ expiresAt: Math.floor(Date.now() / 1000) - 60 }),
    ],
    ["token without expiration", () => token({ includeExpiration: false })],
    ["wrong signature", () => token({ privateKey: otherKey.privateKey })],
  ])("rejects a %s", async (_case, createToken) => {
    await expect(validateToken(await createToken())).resolves.toBeNull();
  });
});
