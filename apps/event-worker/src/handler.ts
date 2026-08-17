import {
  noteCreatedEventSchema,
  type NoteCreatedDetail,
} from "@aws-course/contracts";

export interface HandlerDependencies {
  handleNoteCreated(detail: NoteCreatedDetail): Promise<void>;
}

export function createHandler(dependencies: HandlerDependencies) {
  return async (value: unknown): Promise<void> => {
    const event = noteCreatedEventSchema.parse(value);
    await dependencies.handleNoteCreated(event.detail);
  };
}
