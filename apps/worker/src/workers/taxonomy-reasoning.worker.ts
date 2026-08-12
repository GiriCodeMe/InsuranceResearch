import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { HttpGraphClient } from "@insurance-kb/graph-client";
import { HttpEvidenceClient } from "@insurance-kb/evidence-client";
import { runTaxonomyReasoningAgent } from "../agents/taxonomy-reasoning/agent.js";
import { SEED_PRODUCT_LINE_TERMS } from "../agents/source-intelligence/seed/product-line-terms.js";
import {
  TAXONOMY_REASONING_QUEUE_NAME,
  TaxonomyReasoningJobDataSchema,
  TaxonomyValidationJobDataSchema,
  type TaxonomyReasoningJobData
} from "../queues/jobs.js";
import { createTaxonomyValidationQueue, enqueueTaxonomyValidation } from "../queues/queues.js";
import type { Env } from "../config/env.js";

/**
 * NOTE: a BullMQ Worker requires a live Redis connection to receive jobs — cannot be exercised
 * end-to-end in an environment without a reachable Redis instance. The per-run logic this worker
 * delegates to (runTaxonomyReasoningAgent) is tested independently.
 */
export function createTaxonomyReasoningWorker(connection: Redis, env: Env): Worker<TaxonomyReasoningJobData, void> {
  const graphClient = new HttpGraphClient({
    baseUrl: env.GRAPH_API_BASE_URL,
    paths: {
      readGraph: env.GRAPH_READ_PATH,
      openNodes: env.GRAPH_OPEN_NODES_PATH,
      searchNodes: env.GRAPH_SEARCH_NODES_PATH,
      createEntities: env.GRAPH_CREATE_ENTITIES_PATH,
      createRelations: env.GRAPH_CREATE_RELATIONS_PATH,
      addObservations: env.GRAPH_ADD_OBSERVATIONS_PATH
    }
  });
  const evidenceClient = new HttpEvidenceClient({ baseUrl: env.EVIDENCE_STORE_URL });
  const validationQueue = createTaxonomyValidationQueue(connection);

  return new Worker<TaxonomyReasoningJobData, void>(
    TAXONOMY_REASONING_QUEUE_NAME,
    async (job: Job<TaxonomyReasoningJobData>) => {
      const data = TaxonomyReasoningJobDataSchema.parse(job.data);
      await runTaxonomyReasoningAgent(graphClient, evidenceClient, {
        evidenceIds: data.evidenceIds,
        terms: SEED_PRODUCT_LINE_TERMS,
        schemeId: data.schemeId,
        taxonomyVersion: data.taxonomyVersion
      });
      // Pipeline continuation per Architecture.MD: reasoning -> BullMQ taxonomyValidation -> Validator.
      await enqueueTaxonomyValidation(
        validationQueue,
        TaxonomyValidationJobDataSchema.parse({
          requestId: job.id ?? data.schemeId,
          schemeId: data.schemeId,
          taxonomyVersion: data.taxonomyVersion
        })
      );
    },
    { connection }
  );
}
