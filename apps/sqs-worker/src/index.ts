import pino from "pino";

import { createHandler } from "./handler.js";

const logger = pino();

export const handler = createHandler({
  logger,
  processJob: async () => undefined,
});
