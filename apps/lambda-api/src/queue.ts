import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Job } from "@aws-course/contracts";

export interface QueueSender {
  send(job: Job): Promise<void>;
}

export function createSqsQueueSender(
  client: Pick<SQSClient, "send">,
  queueUrl: string,
): QueueSender {
  return {
    async send(job) {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(job),
        }),
      );
    },
  };
}
