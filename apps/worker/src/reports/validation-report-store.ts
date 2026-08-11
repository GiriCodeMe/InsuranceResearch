import type { ValidationReport } from "@insurance-kb/contracts";

/** The minimal shape of pg.Pool this store needs — lets tests inject a fake instead of a live Postgres. */
export interface QueryablePool {
  query(text: string, params: unknown[]): Promise<unknown>;
}

export interface ValidationReportStore {
  upsert(report: ValidationReport): Promise<void>;
}

/**
 * NOTE: exercising this against a real database requires a reachable Postgres with the
 * validation_reports table from database/migrations/001_validation_reports.sql applied —
 * not available in this environment. Tests here only verify the SQL/params via a fake QueryablePool.
 */
export class PostgresValidationReportStore implements ValidationReportStore {
  constructor(private readonly pool: QueryablePool) {}

  async upsert(report: ValidationReport): Promise<void> {
    await this.pool.query(
      `INSERT INTO validation_reports
         (request_id, scheme_id, taxonomy_version, status, error_count, warning_count, checked_edges, report_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (request_id, scheme_id, taxonomy_version)
       DO UPDATE SET
         status = EXCLUDED.status,
         error_count = EXCLUDED.error_count,
         warning_count = EXCLUDED.warning_count,
         checked_edges = EXCLUDED.checked_edges,
         report_json = EXCLUDED.report_json,
         created_at = EXCLUDED.created_at`,
      [
        report.requestId,
        report.schemeId,
        report.taxonomyVersion,
        report.status,
        report.errorCount,
        report.warningCount,
        report.checkedEdges,
        JSON.stringify(report),
        report.createdAt
      ]
    );
  }
}
