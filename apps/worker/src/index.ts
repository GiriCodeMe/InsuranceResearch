import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";
import type { Worker } from "bullmq";
import { loadEnv } from "./config/env.js";

// Loads the repo-root .env regardless of the current working directory the process was
// started from (Docker sets these vars directly via env_file, so this is a local-dev
// convenience only — it's a no-op if the file doesn't exist).
loadDotenv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
import { createRedisConnection } from "./queues/queues.js";
import { PostgresValidationReportStore } from "./reports/validation-report-store.js";
import { createSourceIntelligenceWorker } from "./workers/source-intelligence.worker.js";
import { createTaxonomyReasoningWorker } from "./workers/taxonomy-reasoning.worker.js";
import { createTaxonomyValidationWorker } from "./workers/taxonomy-validation.worker.js";

/**
 * Starts the full pipeline as three BullMQ workers sharing one Redis connection:
 *   sourceIntelligence -> taxonomyReasoning -> taxonomyValidation (each stage enqueues the next).
 * NOTE: this entrypoint requires a reachable Redis and Postgres (with the validation_reports
 * migration applied) to actually run. Not runnable/verifiable in an environment without those —
 * see docker-compose.yml for how to bring them up locally. Each worker's own logic is tested
 * independently (see apps/worker/src/agents/**, packages/taxonomy-core) and, for the two agents,
 * runnable standalone via scripts/run-*-demo.ts without any of this infrastructure.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const connection = createRedisConnection(env.REDIS_URL);
  const pool = new Pool({ connectionString: env.POSTGRES_URL });
  const store = new PostgresValidationReportStore(pool);

  const workers: Worker[] = [
    createSourceIntelligenceWorker(connection, env),
    createTaxonomyReasoningWorker(connection, env),
    createTaxonomyValidationWorker(connection, env, store)
  ];

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      console.error(`[${worker.name}] job ${job?.id ?? "unknown"} failed`, error);
    });
  }

  const shutdown = async (): Promise<void> => {
    await Promise.all(workers.map((worker) => worker.close()));
    await pool.end();
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`Workers started: ${workers.map((w) => w.name).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
