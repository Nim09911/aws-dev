import { generateKeyPairSync } from "node:crypto";

import { GetParametersCommand } from "@aws-sdk/client-ssm";
import { describe, expect, it, vi } from "vitest";

import { createParameterConfigProvider } from "../src/parameters.js";

const publicKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
}).publicKey.export({ type: "spki", format: "pem" });
const encodedPublicKey = Buffer.from(publicKey).toString("base64");

function response(basePath: string, stage: "dev" | "stage") {
  return {
    Parameters: [
      {
        Name: `${basePath}/${stage}/jwt-public-key-base64`,
        Value: encodedPublicKey,
      },
      {
        Name: `${basePath}/${stage}/jwt-issuer`,
        Value: `https://${stage}.issuer.example.com`,
      },
      {
        Name: `${basePath}/${stage}/jwt-audience`,
        Value: `${stage}-audience`,
      },
    ],
  };
}

describe("Parameter Store runtime configuration", () => {
  it("retrieves and validates one stage with decryption", async () => {
    const send = vi
      .fn()
      .mockResolvedValue(response("/aws-developer-course/lambda", "dev"));
    const provider = createParameterConfigProvider(
      { send },
      {
        basePath: "/aws-developer-course/lambda",
        cacheTtlMs: 30_000,
      },
    );

    await expect(provider.get("dev")).resolves.toEqual({
      publicKey,
      issuer: "https://dev.issuer.example.com",
      audience: "dev-audience",
    });
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(GetParametersCommand);
    expect(command.input).toEqual({
      Names: [
        "/aws-developer-course/lambda/dev/jwt-public-key-base64",
        "/aws-developer-course/lambda/dev/jwt-issuer",
        "/aws-developer-course/lambda/dev/jwt-audience",
      ],
      WithDecryption: true,
    });
  });

  it("reuses a warm cache only until the bounded TTL expires", async () => {
    let now = 1_000;
    const send = vi
      .fn()
      .mockResolvedValueOnce(response("/course/lambda", "dev"))
      .mockResolvedValueOnce({
        ...response("/course/lambda", "dev"),
        Parameters: response("/course/lambda", "dev").Parameters.map(
          (parameter) =>
            parameter.Name?.endsWith("/jwt-audience")
              ? { ...parameter, Value: "rotated-audience" }
              : parameter,
        ),
      });
    const provider = createParameterConfigProvider(
      { send },
      { basePath: "/course/lambda", cacheTtlMs: 5_000 },
      () => now,
    );

    expect((await provider.get("dev")).audience).toBe("dev-audience");
    now = 5_999;
    expect((await provider.get("dev")).audience).toBe("dev-audience");
    expect(send).toHaveBeenCalledTimes(1);

    now = 6_000;
    expect((await provider.get("dev")).audience).toBe("rotated-audience");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps dev and stage caches separate", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(response("/course/lambda", "dev"))
      .mockResolvedValueOnce(response("/course/lambda", "stage"));
    const provider = createParameterConfigProvider(
      { send },
      { basePath: "/course/lambda", cacheTtlMs: 30_000 },
    );

    expect((await provider.get("dev")).audience).toBe("dev-audience");
    expect((await provider.get("stage")).audience).toBe("stage-audience");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects missing or invalid values without echoing them", async () => {
    const invalidValue = "do-not-echo-this-value";
    const send = vi.fn().mockResolvedValue({
      Parameters: [
        {
          Name: "/course/lambda/dev/jwt-public-key-base64",
          Value: invalidValue,
        },
      ],
      InvalidParameters: ["/course/lambda/dev/jwt-audience"],
    });
    const provider = createParameterConfigProvider(
      { send },
      { basePath: "/course/lambda", cacheTtlMs: 30_000 },
    );

    await expect(provider.get("dev")).rejects.toThrow(
      "Invalid runtime parameters:",
    );
    try {
      await provider.get("dev");
    } catch (error) {
      expect(String(error)).not.toContain(invalidValue);
    }
  });

  it("rejects an unknown API stage before calling AWS", async () => {
    const send = vi.fn();
    const provider = createParameterConfigProvider(
      { send },
      { basePath: "/course/lambda", cacheTtlMs: 30_000 },
    );

    await expect(provider.get("production")).rejects.toThrow(
      "Unsupported API stage",
    );
    expect(send).not.toHaveBeenCalled();
  });
});
