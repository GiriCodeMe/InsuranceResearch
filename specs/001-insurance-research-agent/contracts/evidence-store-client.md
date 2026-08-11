# Contract: EvidenceStoreClient → EvidenceStore

This feature is a consumer of the EvidenceStore HTTP contract defined in requirements.MD. It does not own or implement the store — only the client used to write to it.

## POST /evidence

**Request body**: one `EvidenceRecord` (see data-model.md), JSON.

**Response** (must be exactly one envelope shape — client fails fast otherwise):

- Raw payload: `EvidenceRecord` (as persisted, may include server-assigned fields)
- `{ "data": EvidenceRecord }`
- `{ "result": EvidenceRecord }`

**Mutation success shape**: `{ "ok": true }` in any of the three envelope forms above is also acceptable for this endpoint per requirements.MD's "Mutation endpoints must return `{ ok: true }`" rule.

**Client failure modes (must throw, never guess)**:
- Both `data` and `result` present in the same response → ambiguous envelope, hard failure.
- Response body doesn't match any of the three shapes, or fails Zod validation against the EvidenceRecord schema → malformed, hard failure.
- Non-2xx HTTP status → hard failure for that write, logged and surfaced in the run's per-source failure report (does not abort the whole run — FR-009 is about source-fetch failures, but the same "isolate and report, don't abort" principle applies to a single write failure).

## GET /evidence/:id and HEAD /evidence/:id

Used only for the idempotency/duplicate-check path (FR-010): before writing a new EvidenceRecord, the client may check whether a record with the same derived id already exists.

Same envelope rules apply to `GET`.

## POST /__admin/reset, POST /__admin/reseed

Test-only. Used by the integration test suite to reset the mock EvidenceStore to a known state before each run (per requirements.MD's deterministic E2E testing requirements). Not called by the production pipeline code path.

## Timestamp contract

- `provenance.retrievedDate` — ISO datetime (strict).
- `provenance.publishedDate` — date-only `YYYY-MM-DD`, omitted if the source doesn't state one.

## Fault injection (test-only, mock EvidenceStore)

The mock store supports `?envelope=raw|data|result|ambiguous|malformed` on `/evidence`. Contract tests MUST include a case for each of `ambiguous` and `malformed` asserting the client throws rather than silently accepting a partial record — this is the feature's version of requirements.MD's negative-test requirement.
