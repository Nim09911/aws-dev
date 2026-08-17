import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";

import {
  buildNoteKey,
  createDynamoNotesRepository,
  deserializeNote,
  serializeNote,
  type DynamoCommandSender,
} from "../src/index.js";

const note = {
  id: "note-1",
  ownerId: "user-1",
  title: "DynamoDB",
  body: "Model access patterns first.",
  version: 3,
  createdAt: "2026-08-16T10:00:00.000Z",
  updatedAt: "2026-08-16T11:00:00.000Z",
};

class InMemoryDynamoSender implements DynamoCommandSender {
  readonly items = new Map<string, Record<string, unknown>>();

  async send(command: GetCommand | PutCommand) {
    if (command instanceof PutCommand) {
      const item = command.input.Item as Record<string, unknown>;
      this.items.set(`${item.pk}|${item.sk}`, item);
      return {};
    }

    const key = command.input.Key as Record<string, unknown>;
    return { Item: this.items.get(`${key.pk}|${key.sk}`) };
  }
}

describe("note persistence mapping", () => {
  it("constructs deterministic tenant-scoped keys", () => {
    expect(buildNoteKey("user-1", "note-1")).toEqual({
      pk: "OWNER#user-1",
      sk: "NOTE#note-1",
    });
  });

  it("serializes and deserializes a note without losing its contract", () => {
    const item = serializeNote(note);

    expect(item).toEqual({
      pk: "OWNER#user-1",
      sk: "NOTE#note-1",
      entityType: "NOTE",
      id: "note-1",
      ownerId: "user-1",
      title: "DynamoDB",
      body: "Model access patterns first.",
      version: 3,
      createdAt: "2026-08-16T10:00:00.000Z",
      updatedAt: "2026-08-16T11:00:00.000Z",
    });
    expect(deserializeNote(item)).toEqual(note);
  });

  it("rejects an item whose keys do not match its note identity", () => {
    expect(() =>
      deserializeNote({ ...serializeNote(note), sk: "NOTE#other" }),
    ).toThrow("Note item keys do not match its identity");
  });
});

describe("DynamoDB notes repository", () => {
  it("round-trips notes through an injected command sender", async () => {
    const sender = new InMemoryDynamoSender();
    const repository = createDynamoNotesRepository(sender, "notes-table");

    await repository.put(note);

    await expect(repository.get("user-1", "note-1")).resolves.toEqual(note);
  });

  it("returns null when DynamoDB has no matching item", async () => {
    const repository = createDynamoNotesRepository(
      new InMemoryDynamoSender(),
      "notes-table",
    );

    await expect(repository.get("user-1", "missing")).resolves.toBeNull();
  });
});
