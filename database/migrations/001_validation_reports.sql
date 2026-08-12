CREATE TABLE IF NOT EXISTS validation_reports (
    id BIGSERIAL PRIMARY KEY,
    request_id TEXT NOT NULL,
    scheme_id TEXT NOT NULL,
    taxonomy_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('GO', 'WARNING', 'NO_GO')),
    error_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    checked_edges INTEGER NOT NULL DEFAULT 0,
    report_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (request_id, scheme_id, taxonomy_version)
);

CREATE INDEX IF NOT EXISTS idx_validation_reports_scheme_version
    ON validation_reports (scheme_id, taxonomy_version);
