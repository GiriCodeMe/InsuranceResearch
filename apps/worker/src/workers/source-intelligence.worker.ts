import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { HttpEvidenceClient } from "@insurance-kb/evidence-client";
import { runSourceIntelligenceAgent } from "../agents/source-intelligence/agent.js";
import { SOURCE_INTELLIGENCE_QUEUE_NAME, SourceIntelligenceJobDataSchema, type SourceIntelligenceJobData } from "../queues/jobs.js";
import type { Env } from "../config/env.js";

/**
 * NOTE: a BullMQ Worker requires a live Redis connection to receive jobs — cannot be exercised
 * end-to-end in an environment without a reachable Redis instance. The per-run logic this worker
 * delegates to (runSourceIntelligenceAgent) is tested independently and runnable standalone via
 * run-demo.ts, which needs neither Redis nor Postgres.
 */
export function createSourceIntelligenceWorker(connection: Redis, env: Env): Worker<SourceIntelligenceJobData, void> {
  const evidenceClient = new HttpEvidenceClient({ baseUrl: env.EVIDENCE_STORE_URL });

  return new Worker<SourceIntelligenceJobData, void>(
    SOURCE_INTELLIGENCE_QUEUE_NAME,
    async (job: Job<SourceIntelligenceJobData>) => {
      SourceIntelligenceJobDataSchema.parse(job.data);
      await runSourceIntelligenceAgent(evidenceClient);
    },
    { connection }
  );
}
