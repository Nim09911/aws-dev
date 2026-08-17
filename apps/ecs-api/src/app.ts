import cors from "cors";
import express, { type RequestHandler } from "express";
import pino, { type Logger } from "pino";
import { pinoHttp } from "pino-http";

export interface AuthIdentity {
  subject: string;
}

export interface AppDependencies {
  corsAllowedOrigins: string[];
  validateToken(token: string): Promise<AuthIdentity | null>;
  checkReadiness(): Promise<boolean>;
  logger?: Logger;
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer (.+)$/i.exec(header ?? "");
  return match?.[1] ?? null;
}

function authorize(
  validateToken: AppDependencies["validateToken"],
): RequestHandler {
  return async (request, response, next) => {
    const token = bearerToken(request.header("authorization"));
    if (!token) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const identity = await validateToken(token);
      if (!identity) {
        response.status(401).json({ error: "Unauthorized" });
        return;
      }

      response.locals.identity = identity;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createApp(dependencies: AppDependencies) {
  const logger =
    dependencies.logger ?? pino({ enabled: process.env.NODE_ENV !== "test" });
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(
          null,
          origin === undefined ||
            dependencies.corsAllowedOrigins.includes(origin),
        );
      },
    }),
  );
  app.use(express.json());

  app.get("/health/live", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/health/ready", async (_request, response) => {
    try {
      const ready = await dependencies.checkReadiness();
      response
        .status(ready ? 200 : 503)
        .json({ status: ready ? "ok" : "not_ready" });
    } catch (error) {
      logger.error(
        { event: "readiness.failed", errorType: errorName(error) },
        "readiness check failed",
      );
      response.status(503).json({ status: "not_ready" });
    }
  });

  app.get(
    "/hello",
    authorize(dependencies.validateToken),
    (_request, response) => {
      const identity = response.locals.identity as AuthIdentity;
      response.json({ message: "hello", subject: identity.subject });
    },
  );

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error(
        { event: "request.failed", errorType: errorName(error) },
        "request failed",
      );
      response.status(500).json({ error: "Internal Server Error" });
    },
  );

  return app;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
