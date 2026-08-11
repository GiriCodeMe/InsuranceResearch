import { Queue } from "bullmq";
import { Redis } from "ioredis";
import {
  TAXONOMY_REASONING_QUEUE_NAME,
  TAXONOMY_VALIDATION_QUEUE_NAME,
  TaxonomyReasoningJobDataSchema,
  TaxonomyValidationJobDataSchema,
  type TaxonomyReasoningJobData,
  type TaxonomyValidationJobData
} from "./jobs.js";

/**
 * NOTE: constructing this connects to Redis (BullMQ requires a live connection to enqueue/process
 * jobs) — this module cannot be exercised in an environment without a reachable Redis instance.
 */
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export function createTaxonomyReasoningQueue(connection: Redis): Queue<TaxonomyReasoningJobData> {
  return new Queue<TaxonomyReasoningJobData>(TAXONOMY_REASONING_QUEUE_NAME, { connection });
}

export function createTaxonomyValidationQueue(connection: Redis): Queue<TaxonomyValidationJobData> {
  return new Queue<TaxonomyValidationJobData>(TAXONOMY_VALIDATION_QUEUE_NAME, { connection });
}

export async function enqueueTaxonomyReasoning(
  queue: Queue<TaxonomyReasoningJobData>,
  data: TaxonomyReasoningJobData
) {
  return queue.add("reason", TaxonomyReasoningJobDataSchema.parse(data));
}

export async function enqueueTaxonomyValidation(
  queue: Queue<TaxonomyValidationJobData>,
  data: TaxonomyValidationJobData
) {
  return queue.add("validate", TaxonomyValidationJobDataSchema.parse(data));
}
