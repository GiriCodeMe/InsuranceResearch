import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import { beforeEach, describe, expect, it } from "vitest";
import type { ValidationReport } from "@insurance-kb/contracts";
import { PostgresValidationReportStore, type QueryablePool } from "./validation-report-store.js";

/**
 * Runs the actual migration SQL and the store's actual SQL against pg-mem — a real (in-memory,
 * pure-JS) Postgres-compatible engine — rather than a stubbed pool. This is as close as this
 * environment can get to a live Postgres: no Postgres server is reachable here (no `psql`, no
 * Docker), so the migration's constraints/JSONB/ON CONFLICT behavior had only ever been asserted
 * against a fake `query()` call, never actually executed. This closes that gap.
 */
function loadMigrationSql(): string {
  return readFileSync(
    fileURLToPath(new URL("../../../../database/migrations/001_validation_reports.sql", import.meta.url)),
    "utf-8"
  );
}

function report(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    requestId: "req-1",
    schemeId: "insurance-taxonomy-us",
    taxonomyVersion: "0.1.0",
    status: "GO",
    errorCount: 0,
    warningCount: 0,
    checkedEdges: 8,
    issues: [],
    createdAt: "2026-08-11T00:00:00.000Z",
    ...overrides
  };
}

describe("PostgresValidationReportStore against pg-mem (real SQL execution, no live Postgres available here)", () => {
  let pool: QueryablePool;

  beforeEach(() => {
    const db = newDb();
    db.public.none(loadMigrationSql());
    const { Pool } = db.adapters.createPg();
    pool = new Pool() as unknown as QueryablePool;
  });

  it("inserts a new report and it's readable back with the expected columns", async () => {
    const store = new PostgresValidationReportStore(pool);
    await store.upsert(report());

    const result = (await pool.query("SELECT * FROM validation_reports WHERE request_id = $1", ["req-1"])) as {
      rows: Array<Record<string, unknown>>;
    };
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      request_id: "req-1",
      scheme_id: "insurance-taxonomy-us",
      taxonomy_version: "0.1.0",
      status: "GO",
      error_count: 0,
      warning_count: 0,
      checked_edges: 8
    });
  });

  it("upserts on (request_id, scheme_id, taxonomy_version): a second call updates, not duplicates", async () => {
    const store = new PostgresValidationReportStore(pool);
    await store.upsert(report({ status: "GO", errorCount: 0 }));
    await store.upsert(report({ status: "NO_GO", errorCount: 3 }));

    const result = (await pool.query("SELECT * FROM validation_reports WHERE request_id = $1", ["req-1"])) as {
      rows: Array<Record<string, unknown>>;
    };
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ status: "NO_GO", error_count: 3 });
  });

  it("keeps separate rows for different taxonomy_version values with the same request_id", async () => {
    const store = new PostgresValidationReportStore(pool);
    await store.upsert(report({ taxonomyVersion: "0.1.0" }));
    await store.upsert(report({ taxonomyVersion: "0.2.0" }));

    const result = (await pool.query("SELECT * FROM validation_reports WHERE request_id = $1", ["req-1"])) as {
      rows: Array<Record<string, unknown>>;
    };
    expect(result.rows).toHaveLength(2);
  });

  it("rejects a status outside GO/WARNING/NO_GO via the CHECK constraint (proves the constraint is real, not just typed)", async () => {
    const badPool = pool as unknown as { query: (text: string, params: unknown[]) => Promise<unknown> };
    await expect(
      badPool.query(
        `INSERT INTO validation_reports
           (request_id, scheme_id, taxonomy_version, status, error_count, warning_count, checked_edges, report_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ["req-bad", "insurance-taxonomy-us", "0.1.0", "MAYBE", 0, 0, 0, "{}", "2026-08-11T00:00:00.000Z"]
      )
    ).rejects.toThrow();
  });

  it("stores report_json as real, queryable JSONB", async () => {
    const store = new PostgresValidationReportStore(pool);
    await store.upsert(report({ issues: [{ ruleId: "rule2.explicit-edge-requires-evidence", severity: "error", message: "x" }] }));

    const result = (await pool.query(
      "SELECT report_json -> 'issues' -> 0 ->> 'ruleId' AS rule_id FROM validation_reports WHERE request_id = $1",
      ["req-1"]
    )) as { rows: Array<{ rule_id: string }> };
    expect(result.rows[0].rule_id).toBe("rule2.explicit-edge-requires-evidence");
  });
});
