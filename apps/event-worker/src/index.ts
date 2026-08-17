import { createHandler } from "./handler.js";

export const handler = createHandler({
  handleNoteCreated: async (detail) => {
    console.log(
      JSON.stringify({
        event: "note.created.handled",
        noteId: detail.noteId,
        ownerId: detail.ownerId,
      }),
    );
  },
});
