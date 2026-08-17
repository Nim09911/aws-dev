import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("ECS API", () => {
  it("keeps liveness process-only when readiness fails", async () => {
    let readinessChecks = 0;
    const response = await request(
      createApp({
        corsAllowedOrigins: ["https://learner.example"],
        validateToken: async () => null,
        checkReadiness: async () => {
          readinessChecks += 1;
          return false;
        },
      }),
    ).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(readinessChecks).toBe(0);
  });

  it.each([
    [true, 200, { status: "ok" }],
    [false, 503, { status: "not_ready" }],
  ] as const)(
    "maps readiness %s to HTTP %s",
    async (ready, expectedStatus, expectedBody) => {
      const response = await request(
        createApp({
          corsAllowedOrigins: ["https://learner.example"],
          validateToken: async () => null,
          checkReadiness: async () => ready,
        }),
      ).get("/health/ready");

      expect(response.status).toBe(expectedStatus);
      expect(response.body).toEqual(expectedBody);
    },
  );

  it("adds CORS headers only for an allowed origin", async () => {
    const response = await request(
      createApp({
        corsAllowedOrigins: ["https://learner.example"],
        validateToken: async () => null,
        checkReadiness: async () => true,
      }),
    )
      .options("/hello")
      .set("Origin", "https://learner.example")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://learner.example",
    );
  });

  it("omits CORS headers for a disallowed origin", async () => {
    const response = await request(
      createApp({
        corsAllowedOrigins: ["https://learner.example"],
        validateToken: async () => null,
        checkReadiness: async () => true,
      }),
    )
      .get("/health/live")
      .set("Origin", "https://attacker.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects a protected request without a bearer token", async () => {
    const response = await request(
      createApp({
        corsAllowedOrigins: ["https://learner.example"],
        validateToken: async () => null,
        checkReadiness: async () => true,
      }),
    ).get("/hello");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("returns the injected token identity from the protected route", async () => {
    const seenTokens: string[] = [];
    const response = await request(
      createApp({
        corsAllowedOrigins: ["https://learner.example"],
        checkReadiness: async () => true,
        validateToken: async (token) => {
          seenTokens.push(token);
          return token === "valid-token" ? { subject: "user-1" } : null;
        },
      }),
    )
      .get("/hello")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "hello", subject: "user-1" });
    expect(seenTokens).toEqual(["valid-token"]);
  });
});
