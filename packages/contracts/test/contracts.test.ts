import { describe, expect, it } from "vitest";

import { jobSchema, noteCreatedEventSchema, noteSchema } from "../src/index.js";

describe("shared contracts", () => {
  it("accepts a complete note and rejects a note without an owner", () => {
    const note = {
      id: "note-1",
      ownerId: "user-1",
      title: "AWS notes",
      body: "Prefer narrow IAM policies.",
      version: 1,
      createdAt: "2026-08-16T10:00:00.000Z",
      updatedAt: "2026-08-16T10:00:00.000Z",
    };

    expect(noteSchema.parse(note)).toEqual(note);
    expect(noteSchema.safeParse({ ...note, ownerId: "" }).success).toBe(false);
  });

  it("rejects a job with an unsupported kind", () => {
    expect(
      jobSchema.safeParse({
        id: "job-1",
        kind: "delete-account",
        noteId: "note-1",
        requestedBy: "user-1",
        requestedAt: "2026-08-16T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("validates the versioned NoteCreated EventBridge envelope", () => {
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

    expect(noteCreatedEventSchema.parse(event)).toEqual(event);
    expect(
      noteCreatedEventSchema.safeParse({
        ...event,
        detail: { ...event.detail, version: 2 },
      }).success,
    ).toBe(false);
  });
});
