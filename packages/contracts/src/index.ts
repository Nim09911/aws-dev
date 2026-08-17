import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const timestamp = z.iso.datetime();

export const noteSchema = z.object({
  id: nonEmptyString,
  ownerId: nonEmptyString,
  title: nonEmptyString,
  body: z.string(),
  version: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export type Note = z.infer<typeof noteSchema>;

export const createJobRequestSchema = z.object({
  noteId: nonEmptyString,
});

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;

export const jobSchema = z.object({
  id: nonEmptyString,
  kind: z.literal("process-note"),
  noteId: nonEmptyString,
  requestedBy: nonEmptyString,
  requestedAt: timestamp,
});

export type Job = z.infer<typeof jobSchema>;

export const noteCreatedDetailSchema = z.object({
  version: z.literal(1),
  noteId: nonEmptyString,
  ownerId: nonEmptyString,
  occurredAt: timestamp,
});

export type NoteCreatedDetail = z.infer<typeof noteCreatedDetailSchema>;

export const noteCreatedEventSchema = z.object({
  version: z.literal("0"),
  id: nonEmptyString,
  "detail-type": z.literal("NoteCreated"),
  source: z.literal("aws-course.notes"),
  account: nonEmptyString,
  time: timestamp,
  region: nonEmptyString,
  resources: z.array(z.string()),
  detail: noteCreatedDetailSchema,
});

export type NoteCreatedEvent = z.infer<typeof noteCreatedEventSchema>;
