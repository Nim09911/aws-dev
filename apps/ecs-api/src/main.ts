import pino from "pino";

import { createApp } from "./app.js";
import { createJwtValidator } from "./auth.js";
import { loadEcsConfig } from "./config.js";
import { buildStartupMetadata } from "./startup.js";

const logger = pino();
const config = loadEcsConfig(process.env);

const app = createApp({
  logger,
  corsAllowedOrigins: config.corsAllowedOrigins,
  validateToken: createJwtValidator(config.jwt),
  checkReadiness: async () => true,
});

app.listen(config.port, () => {
  logger.info(
    buildStartupMetadata(config.service, config.port, "ready"),
    "ecs-api listening",
  );
});
