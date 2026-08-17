import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { describe, expect, it } from "vitest";

import { createHandler } from "../src/handler.js";

function capturingLogger() {
  const entries: Array<Record<string, unknown>> = [];
  return {
    entries,
    logger: {
      info: (fields: Record<string, unknown>) =>
        entries.push({ level: "info", ...fields }),
      warn: (fields: Record<string, unknown>) =>
        entries.push({ level: "warn", ...fields }),
      error: (fields: Record<string, unknown>) =>
        entries.push({ level: "error", ...fields }),
    },
  };
}

function event(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: "",
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "example.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "example",
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "request-1",
      routeKey: "$default",
      stage: "$default",
      time: "16/Aug/2026:10:00:00 +0000",
      timeEpoch: 1_776_336_000_000,
    },
    isBase64Encoded: false,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };
}

describe("Lambda API", () => {
  it("distinguishes execution reachability from runtime readiness", async () => {
    const checkedStages: string[] = [];
    const handler = createHandler({
      validateToken: async () => null,
      sendJob: async () => undefined,
      checkReady: async (stage) => {
        checkedStages.push(stage);
      },
    });

    const live = await handler(event("GET", "/health/live"));
    const ready = await handler(event("GET", "/health/ready"));

    expect(live.statusCode).toBe(200);
    expect(JSON.parse(live.body ?? "")).toEqual({
      status: "live",
      semantics: "handler-reachable",
    });
    expect(ready.statusCode).toBe(200);
    expect(JSON.parse(ready.body ?? "")).toEqual({
      status: "ready",
      semantics: "runtime-config-available",
    });
    expect(checkedStages).toEqual(["$default"]);
  });

  it("reports readiness failure without treating it as a liveness probe", async () => {
    const handler = createHandler({
      validateToken: async () => null,
      sendJob: async () => undefined,
      checkReady: async () => {
        throw new Error("configuration unavailable and secret");
      },
    });

    const response = await handler(event("GET", "/health/ready"));

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body ?? "")).toEqual({
      status: "not-ready",
      semantics: "runtime-config-unavailable",
    });
  });

  it("protects hello with injected bearer-token validation", async () => {
    const handler = createHandler({
      validateToken: async (token) =>
        token === "valid-token" ? { subject: "user-1" } : null,
      sendJob: async () => undefined,
    });

    const unauthorized = await handler(event("GET", "/api/hello"));
    const authorized = await handler(
      event("GET", "/api/hello", { token: "valid-token" }),
    );

    expect(unauthorized.statusCode).toBe(401);
    expect(JSON.parse(authorized.body ?? "")).toEqual({
      message: "hello",
      subject: "user-1",
    });
  });

  it("validates, enqueues, and accepts a job", async () => {
    const sent: unknown[] = [];
    const handler = createHandler({
      validateToken: async () => ({ subject: "user-1" }),
      sendJob: async (job) => {
        sent.push(job);
      },
      createJobId: () => "job-1",
      now: () => new Date("2026-08-16T10:00:00.000Z"),
    });

    const response = await handler(
      event("POST", "/jobs", {
        token: "valid-token",
        body: { noteId: "note-1" },
      }),
    );

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body ?? "")).toEqual({ jobId: "job-1" });
    expect(sent).toEqual([
      {
        id: "job-1",
        kind: "process-note",
        noteId: "note-1",
        requestedBy: "user-1",
        requestedAt: "2026-08-16T10:00:00.000Z",
      },
    ]);
  });

  it("rejects an invalid job before sending it", async () => {
    const sent: unknown[] = [];
    const handler = createHandler({
      validateToken: async () => ({ subject: "user-1" }),
      sendJob: async (job) => {
        sent.push(job);
      },
    });

    const response = await handler(
      event("POST", "/jobs", {
        token: "valid-token",
        body: { noteId: "" },
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(sent).toEqual([]);
  });

  it("logs request and job correlation without credentials or full payloads", async () => {
    const { entries, logger } = capturingLogger();
    const handler = createHandler({
      validateToken: async () => ({ subject: "user-1" }),
      sendJob: async () => undefined,
      createJobId: () => "job-1",
      now: () => new Date("2026-08-16T10:00:00.000Z"),
      logger,
    });

    await handler(
      event("POST", "/jobs", {
        token: "secret-token",
        body: { noteId: "note-1", privateValue: "do-not-log" },
      }),
    );

    expect(entries).toContainEqual({
      level: "info",
      event: "request.received",
      requestId: "request-1",
      stage: "$default",
      method: "POST",
      path: "/jobs",
      coldStart: true,
    });
    expect(entries).toContainEqual({
      level: "info",
      event: "job.accepted",
      requestId: "request-1",
      jobId: "job-1",
      noteId: "note-1",
    });
    expect(entries).toContainEqual({
      level: "info",
      event: "request.completed",
      requestId: "request-1",
      stage: "$default",
      method: "POST",
      path: "/jobs",
      statusCode: 202,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(entries)).not.toContain("secret-token");
    expect(JSON.stringify(entries)).not.toContain("do-not-log");
  });

  it("logs safe error metadata and returns 500 when queue sending fails", async () => {
    const { entries, logger } = capturingLogger();
    const handler = createHandler({
      validateToken: async () => ({ subject: "user-1" }),
      sendJob: async () => {
        throw new Error("queue rejected private-payload");
      },
      createJobId: () => "job-2",
      logger,
    });

    const response = await handler(
      event("POST", "/jobs", {
        token: "secret-token",
        body: { noteId: "note-1" },
      }),
    );

    expect(response.statusCode).toBe(500);
    expect(entries).toContainEqual({
      level: "error",
      event: "request.failed",
      requestId: "request-1",
      stage: "$default",
      method: "POST",
      path: "/jobs",
      errorType: "Error",
      jobId: "job-2",
      noteId: "note-1",
    });
    expect(JSON.stringify(entries)).not.toContain("secret-token");
    expect(JSON.stringify(entries)).not.toContain("private-payload");
  });
});
