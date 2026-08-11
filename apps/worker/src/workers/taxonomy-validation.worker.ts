import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { HttpGraphClient } from "@insurance-kb/graph-client";
import { HttpEvidenceClient } from "@insurance-kb/evidence-client";
import { validateTaxonomySafe } from "@insurance-kb/taxonomy-core";
import { TAXONOMY_VALIDATION_QUEUE_NAME, TaxonomyValidationJobDataSchema, type TaxonomyValidationJobData } from "../queues/jobs.js";
import type { ValidationReportStore } from "../reports/validation-report-store.js";
import type { Env } from "../config/env.js";

/**
 * NOTE: a BullMQ Worker requires a live Redis connection to receive jobs — cannot be exercised
 * end-to-end in an environment without a reachable Redis instance. The per-job logic this worker
 * delegates to (validateTaxonomySafe) is unit-tested independently in packages/taxonomy-core.
 */
export function createTaxonomyValidationWorker(
  connection: Redis,
  env: Env,
  store: ValidationReportStore
): Worker<TaxonomyValidationJobData, void> {
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

  return new Worker<TaxonomyValidationJobData, void>(
    TAXONOMY_VALIDATION_QUEUE_NAME,
    async (job: Job<TaxonomyValidationJobData>) => {
      const data = TaxonomyValidationJobDataSchema.parse(job.data);
      const report = await validateTaxonomySafe(graphClient, evidenceClient, {
        requestId: data.requestId,
        schemeId: data.schemeId,
        taxonomyVersion: data.taxonomyVersion,
        minConfidence: env.VALIDATED_MIN_CONFIDENCE
      });
      // Persisted unconditionally — including a NO_GO report produced by a caught failure —
      // per Architecture.MD: "must persist report even on failure (NO_GO)".
      await store.upsert(report);
    },
    { connection }
  );
}
