import { jobSchema, type Job } from "@aws-course/contracts";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";

export interface HandlerDependencies {
  processJob(job: Job): Promise<void>;
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

async function processRecord(
  record: SQSRecord,
  processJob: HandlerDependencies["processJob"],
  logger: StructuredLogger,
): Promise<string | null> {
  logger.info({ event: "message.received", messageId: record.messageId });

  let job: Job;
  try {
    const body: unknown = JSON.parse(record.body);
    job = jobSchema.parse(body);
  } catch (error) {
    logger.error({
      event: "message.invalid",
      messageId: record.messageId,
      errorType: errorName(error),
    });
    return record.messageId;
  }

  logger.info({
    event: "job.processing",
    messageId: record.messageId,
    jobId: job.id,
    noteId: job.noteId,
  });

  try {
    await processJob(job);
    logger.info({
      event: "job.completed",
      messageId: record.messageId,
      jobId: job.id,
      noteId: job.noteId,
    });
    return null;
  } catch (error) {
    logger.error({
      event: "job.failed",
      messageId: record.messageId,
      jobId: job.id,
      noteId: job.noteId,
      errorType: errorName(error),
    });
    return record.messageId;
  }
}

export function createHandler(dependencies: HandlerDependencies) {
  const logger = dependencies.logger ?? silentLogger;

  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const results = await Promise.all(
      event.Records.map((record) =>
        processRecord(record, dependencies.processJob, logger),
      ),
    );

    return {
      batchItemFailures: results
        .filter((messageId): messageId is string => messageId !== null)
        .map((itemIdentifier) => ({ itemIdentifier })),
    };
  };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
