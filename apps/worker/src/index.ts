import { Pool } from "pg";
import { loadEnv } from "./config/env.js";
import { createRedisConnection } from "./queues/queues.js";
import { PostgresValidationReportStore } from "./reports/validation-report-store.js";
import { createTaxonomyValidationWorker } from "./workers/taxonomy-validation.worker.js";

/**
 * NOTE: this entrypoint requires a reachable Redis and Postgres (with the validation_reports
 * migration applied) to actually run. Not runnable/verifiable in an environment without those —
 * see docker-compose.yml for how to bring them up locally.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const connection = createRedisConnection(env.REDIS_URL);
  const pool = new Pool({ connectionString: env.POSTGRES_URL });
  const store = new PostgresValidationReportStore(pool);

  const worker = createTaxonomyValidationWorker(connection, env, store);
  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id ?? "unknown"} failed`, error);
  });

  console.log("taxonomy-validation worker started");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
