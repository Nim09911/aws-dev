import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { noteSchema, type Note } from "@aws-course/contracts";
import { z } from "zod";

export interface NotesRepository {
  get(ownerId: string, noteId: string): Promise<Note | null>;
  put(note: Note): Promise<void>;
}

export interface NoteKey {
  pk: string;
  sk: string;
}

export interface DynamoCommandSender {
  send(
    command: GetCommand | PutCommand,
  ): Promise<{ Item?: Record<string, unknown> }>;
}

const noteItemSchema = noteSchema.extend({
  pk: z.string().min(1),
  sk: z.string().min(1),
  entityType: z.literal("NOTE"),
});

export type NoteItem = z.infer<typeof noteItemSchema>;

export function buildNoteKey(ownerId: string, noteId: string): NoteKey {
  return {
    pk: `OWNER#${ownerId}`,
    sk: `NOTE#${noteId}`,
  };
}

export function serializeNote(note: Note): NoteItem {
  return {
    ...buildNoteKey(note.ownerId, note.id),
    entityType: "NOTE",
    ...note,
  };
}

export function deserializeNote(value: unknown): Note {
  const item = noteItemSchema.parse(value);
  const expectedKey = buildNoteKey(item.ownerId, item.id);

  if (item.pk !== expectedKey.pk || item.sk !== expectedKey.sk) {
    throw new Error("Note item keys do not match its identity");
  }

  return noteSchema.parse(item);
}

export function createDynamoNotesRepository(
  sender: DynamoCommandSender,
  tableName: string,
): NotesRepository {
  return {
    async get(ownerId, noteId) {
      const result = await sender.send(
        new GetCommand({
          TableName: tableName,
          Key: buildNoteKey(ownerId, noteId),
        }),
      );
      return result.Item ? deserializeNote(result.Item) : null;
    },

    async put(note) {
      await sender.send(
        new PutCommand({
          TableName: tableName,
          Item: serializeNote(note),
        }),
      );
    },
  };
}
