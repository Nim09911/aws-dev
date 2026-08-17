import type { SQSEvent } from "aws-lambda";
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

function sqsEvent(
  records: Array<{ messageId: string; body: string }>,
): SQSEvent {
  return {
    Records: records.map(({ messageId, body }) => ({
      messageId,
      receiptHandle: `receipt-${messageId}`,
      body,
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: "1776336000000",
        SenderId: "sender",
        ApproximateFirstReceiveTimestamp: "1776336000001",
      },
      messageAttributes: {},
      md5OfBody: "md5",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:jobs",
      awsRegion: "us-east-1",
    })),
  };
}

const validJob = {
  id: "job-1",
  kind: "process-note",
  noteId: "note-1",
  requestedBy: "user-1",
  requestedAt: "2026-08-16T10:00:00.000Z",
};

describe("SQS worker", () => {
  it("processes valid jobs and returns no batch failures", async () => {
    const processed: unknown[] = [];
    const handler = createHandler({
      processJob: async (job) => {
        processed.push(job);
      },
    });

    const result = await handler(
      sqsEvent([{ messageId: "message-1", body: JSON.stringify(validJob) }]),
    );

    expect(result).toEqual({ batchItemFailures: [] });
    expect(processed).toEqual([validJob]);
  });

  it("reports malformed and failed records without retrying successful records", async () => {
    const processedIds: string[] = [];
    const { entries, logger } = capturingLogger();
    const handler = createHandler({
      processJob: async (job) => {
        processedIds.push(job.id);
        if (job.id === "job-2") {
          throw new Error("temporary failure with private-payload");
        }
      },
      logger,
    });

    const result = await handler(
      sqsEvent([
        { messageId: "message-1", body: JSON.stringify(validJob) },
        { messageId: "message-2", body: "{invalid-json" },
        {
          messageId: "message-3",
          body: JSON.stringify({ ...validJob, id: "job-2" }),
        },
      ]),
    );

    expect(result).toEqual({
      batchItemFailures: [
        { itemIdentifier: "message-2" },
        { itemIdentifier: "message-3" },
      ],
    });
    expect(processedIds).toEqual(["job-1", "job-2"]);
    expect(entries).toContainEqual({
      level: "error",
      event: "job.failed",
      messageId: "message-3",
      jobId: "job-2",
      noteId: "note-1",
      errorType: "Error",
    });
    expect(entries).toContainEqual({
      level: "error",
      event: "message.invalid",
      messageId: "message-2",
      errorType: "SyntaxError",
    });
    expect(JSON.stringify(entries)).not.toContain("private-payload");
    expect(JSON.stringify(entries)).not.toContain("{invalid-json");
  });
});
