import { SQSClient } from "@aws-sdk/client-sqs";
import { SSMClient } from "@aws-sdk/client-ssm";
import pino from "pino";

import { createJwtValidator } from "./auth.js";
import { loadLambdaConfig } from "./config.js";
import { createHandler } from "./handler.js";
import { createParameterConfigProvider } from "./parameters.js";
import { createSqsQueueSender } from "./queue.js";

const config = loadLambdaConfig(process.env);
const logger = pino({ base: { service: config.serviceName } });
const ssmClient = new SSMClient({});
const sqsClient = new SQSClient({});
const runtimeConfig = createParameterConfigProvider(ssmClient, {
  basePath: config.jwtParameterBasePath,
  cacheTtlMs: config.parameterCacheTtlMs,
});
const queueSender = createSqsQueueSender(sqsClient, config.jobQueueUrl);

logger.info({
  event: "runtime.initialized",
  coldStart: true,
  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
  functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
});

export const handler = createHandler({
  logger,
  checkReady: async (stage) => {
    await runtimeConfig.get(stage);
  },
  validateToken: async (token, stage) => {
    const jwt = await runtimeConfig.get(stage);
    return createJwtValidator(jwt)(token);
  },
  sendJob: (job) => queueSender.send(job),
});
