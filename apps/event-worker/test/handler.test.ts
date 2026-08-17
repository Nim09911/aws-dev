import { describe, expect, it } from "vitest";

import { createHandler } from "../src/handler.js";

const event = {
  version: "0",
  id: "event-1",
  "detail-type": "NoteCreated",
  source: "aws-course.notes",
  account: "123456789012",
  time: "2026-08-16T10:00:00.000Z",
  region: "us-east-1",
  resources: [],
  detail: {
    version: 1,
    noteId: "note-1",
    ownerId: "user-1",
    occurredAt: "2026-08-16T10:00:00.000Z",
  },
};

describe("EventBridge worker", () => {
  it("validates and handles a NoteCreated event", async () => {
    const handled: unknown[] = [];
    const handler = createHandler({
      handleNoteCreated: async (detail) => {
        handled.push(detail);
      },
    });

    await handler(event);

    expect(handled).toEqual([event.detail]);
  });

  it("rejects an event from an unexpected source", async () => {
    const handler = createHandler({
      handleNoteCreated: async () => undefined,
    });

    await expect(
      handler({ ...event, source: "unexpected.source" }),
    ).rejects.toThrow();
  });
});
