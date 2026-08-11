import { describe, expect, it, vi } from "vitest";
import type { ValidationReport } from "@insurance-kb/contracts";
import { PostgresValidationReportStore, type QueryablePool } from "./validation-report-store.js";

const report: ValidationReport = {
  requestId: "req-1",
  schemeId: "insurance-taxonomy-us",
  taxonomyVersion: "0.1.0",
  status: "GO",
  errorCount: 0,
  warningCount: 0,
  checkedEdges: 2,
  issues: [],
  createdAt: "2026-08-11T00:00:00.000Z"
};

describe("PostgresValidationReportStore (verified against a fake QueryablePool — no live Postgres available here)", () => {
  it("upserts with the report's fields as positional params, keyed on (request_id, scheme_id, taxonomy_version)", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const fakePool: QueryablePool = { query };
    const store = new PostgresValidationReportStore(fakePool);

    await store.upsert(report);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO validation_reports");
    expect(sql).toContain("ON CONFLICT (request_id, scheme_id, taxonomy_version)");
    expect(params).toEqual([
      "req-1",
      "insurance-taxonomy-us",
      "0.1.0",
      "GO",
      0,
      0,
      2,
      JSON.stringify(report),
      "2026-08-11T00:00:00.000Z"
    ]);
  });
});
