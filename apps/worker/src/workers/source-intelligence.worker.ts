import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { HttpEvidenceClient } from "@insurance-kb/evidence-client";
import { runSourceIntelligenceAgent } from "../agents/source-intelligence/agent.js";
import {
  SOURCE_INTELLIGENCE_QUEUE_NAME,
  SourceIntelligenceJobDataSchema,
  TaxonomyReasoningJobDataSchema,
  type SourceIntelligenceJobData
} from "../queues/jobs.js";
import { createTaxonomyReasoningQueue, enqueueTaxonomyReasoning } from "../queues/queues.js";
import type { Env } from "../config/env.js";

/**
 * NOTE: a BullMQ Worker requires a live Redis connection to receive jobs — cannot be exercised
 * end-to-end in an environment without a reachable Redis instance. The per-run logic this worker
 * delegates to (runSourceIntelligenceAgent) is tested independently and runnable standalone via
 * scripts/run-source-intelligence-demo.ts, which needs neither Redis nor Postgres.
 */
export function createSourceIntelligenceWorker(connection: Redis, env: Env): Worker<SourceIntelligenceJobData, void> {
  const evidenceClient = new HttpEvidenceClient({ baseUrl: env.EVIDENCE_STORE_URL });
  const reasoningQueue = createTaxonomyReasoningQueue(connection);

  return new Worker<SourceIntelligenceJobData, void>(
    SOURCE_INTELLIGENCE_QUEUE_NAME,
    async (job: Job<SourceIntelligenceJobData>) => {
      SourceIntelligenceJobDataSchema.parse(job.data);
      const result = await runSourceIntelligenceAgent(evidenceClient);
      // Pipeline continuation per Architecture.MD: Source Intelligence -> EvidenceStore ->
      // Taxonomy Reasoning Agent. The EvidenceStore has no query/list endpoint (requirements.MD),
      // so the evidenceIds this run touched are handed forward explicitly via the job payload.
      await enqueueTaxonomyReasoning(
        reasoningQueue,
        TaxonomyReasoningJobDataSchema.parse({
          schemeId: env.SCHEME_ID,
          taxonomyVersion: env.TAXONOMY_VERSION,
          evidenceIds: result.evidenceIds
        })
      );
    },
    { connection }
  );
}
