import { randomUUID } from "node:crypto";

import {
  createJobRequestSchema,
  jobSchema,
  type Job,
} from "@aws-course/contracts";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

export interface AuthIdentity {
  subject: string;
}

export interface HandlerDependencies {
  validateToken(token: string, stage: string): Promise<AuthIdentity | null>;
  sendJob(job: Job): Promise<void>;
  checkReady?(stage: string): Promise<void>;
  createJobId?: () => string;
  now?: () => Date;
  nowMillis?: () => number;
  logger?: StructuredLogger;
}

export interface StructuredLogger {
  info(fields: Record<string, unknown>): void;
  warn(fields: Record<string, unknown>): void;
  error(fields: Record<string, unknown>): void;
}

const silentLogger: StructuredLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function response(
  statusCode: number,
  body: Record<string, unknown>,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function bearerToken(event: APIGatewayProxyEventV2): string | null {
  const header = event.headers.authorization;
  const match = /^Bearer (.+)$/i.exec(header ?? "");
  return match?.[1] ?? null;
}

export function createHandler(dependencies: HandlerDependencies) {
  const createJobId = dependencies.createJobId ?? randomUUID;
  const now = dependencies.now ?? (() => new Date());
  const nowMillis = dependencies.nowMillis ?? Date.now;
  const checkReady = dependencies.checkReady ?? (async () => undefined);
  const logger = dependencies.logger ?? silentLogger;
  let firstInvocation = true;

  return async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const startedAt = nowMillis();
    const { method } = event.requestContext.http;
    const path = event.rawPath;
    const requestId = event.requestContext.requestId;
    const stage = event.requestContext.stage;
    const coldStart = firstInvocation;
    firstInvocation = false;
    let jobCorrelation: { jobId: string; noteId: string } | undefined;

    logger.info({
      event: "request.received",
      requestId,
      stage,
      method,
      path,
      coldStart,
    });

    const complete = (
      statusCode: number,
      body: Record<string, unknown>,
    ): APIGatewayProxyStructuredResultV2 => {
      logger.info({
        event: "request.completed",
        requestId,
        stage,
        method,
        path,
        statusCode,
        durationMs: Math.max(0, nowMillis() - startedAt),
      });
      return response(statusCode, body);
    };

    try {
      if (method === "GET" && path === "/health/live") {
        return complete(200, {
          status: "live",
          semantics: "handler-reachable",
        });
      }

      if (method === "GET" && path === "/health/ready") {
        try {
          await checkReady(stage);
          return complete(200, {
            status: "ready",
            semantics: "runtime-config-available",
          });
        } catch (error) {
          logger.warn({
            event: "readiness.failed",
            requestId,
            stage,
            errorType: errorName(error),
          });
          return complete(503, {
            status: "not-ready",
            semantics: "runtime-config-unavailable",
          });
        }
      }

      const token = bearerToken(event);
      const identity = token
        ? await dependencies.validateToken(token, stage)
        : null;
      if (!identity) {
        logger.warn({
          event: "auth.rejected",
          requestId,
          stage,
          method,
          path,
        });
        return complete(401, { error: "Unauthorized" });
      }

      if (method === "GET" && path === "/api/hello") {
        return complete(200, {
          message: "hello",
          subject: identity.subject,
        });
      }

      if (method === "POST" && path === "/jobs") {
        let body: unknown;
        try {
          body = event.body ? JSON.parse(event.body) : undefined;
        } catch {
          logger.warn({
            event: "request.invalid",
            requestId,
            stage,
            method,
            path,
          });
          return complete(400, { error: "Invalid request body" });
        }

        const request = createJobRequestSchema.safeParse(body);
        if (!request.success) {
          logger.warn({
            event: "request.invalid",
            requestId,
            stage,
            method,
            path,
          });
          return complete(400, { error: "Invalid request body" });
        }

        const job = jobSchema.parse({
          id: createJobId(),
          kind: "process-note",
          noteId: request.data.noteId,
          requestedBy: identity.subject,
          requestedAt: now().toISOString(),
        });
        jobCorrelation = { jobId: job.id, noteId: job.noteId };

        await dependencies.sendJob(job);
        logger.info({
          event: "job.accepted",
          requestId,
          jobId: job.id,
          noteId: job.noteId,
        });
        return complete(202, { jobId: job.id });
      }

      return complete(404, { error: "Not Found" });
    } catch (error) {
      logger.error({
        event: "request.failed",
        requestId,
        stage,
        method,
        path,
        errorType: errorName(error),
        ...jobCorrelation,
      });
      return complete(500, { error: "Internal Server Error" });
    }
  };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
