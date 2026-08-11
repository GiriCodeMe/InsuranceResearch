# Data Model: Insurance Research Agent (Source Intelligence)

Entities are derived from spec.md's Key Entities section and requirements.MD's EvidenceRecord schema. This feature only *produces* these; the EvidenceStore that persists them is an external dependency (per spec.md Assumptions).

## ProductLineTerm

The static, seeded target vocabulary this run is scoped to (spec FR-002).

| Field | Type | Notes |
|---|---|---|
| `termId` | string | Stable id, e.g. `CommercialGeneralLiability` |
| `canonicalLabel` | string | e.g. "Commercial General Liability" |
| `aliases` | string[] | Known synonyms/acronyms to also match, e.g. `["CGL"]` |
| `contextScope` | `commercial \| personal \| both` | Matches the taxonomy backbone's context disambiguation rule |

Seeded with exactly the 10-concept backbone from requirements.MD (Commercial/Personal Insurance, Property/Auto/GL/CGL commercial, Property/Auto/Homeowners/PAP personal).

## Source

An authoritative organization or publication (spec Key Entities).

| Field | Type | Notes |
|---|---|---|
| `sourceId` | string | Stable id, e.g. `naic` |
| `organizationName` | string | e.g. "National Association of Insurance Commissioners" |
| `sourceType` | `standards-body \| regulator \| industry-publication` | Informational; not used for filtering in MVP |

## Document

A specific page/publication belonging to a Source (spec Key Entities); one row per seed URL.

| Field | Type | Notes |
|---|---|---|
| `documentId` | string | Stable id derived from URL |
| `sourceId` | string | FK → Source |
| `url` | string | Seed URL |
| `publishedDate` | date (`YYYY-MM-DD`) | Only if the page states one; else omitted |
| `retrievedDate` | ISO datetime | Set at fetch time |
| `fetchStatus` | `ok \| unreachable \| error` | Drives FR-009 (continue on failure) and the failure report (SC-005) |

## Provenance

Embedded in every EvidenceRecord (spec Key Entities; requirements.MD "Provenance-first").

| Field | Type | Notes |
|---|---|---|
| `sourceId` | string | FK → Source |
| `documentId` | string | FK → Document |
| `url` | string | Denormalized for convenience |
| `retrievedDate` | ISO datetime | Required, strict |
| `publishedDate` | date (`YYYY-MM-DD`) | Optional, date-only per requirements.MD |
| `location.anchor` | string | Page/section/anchor identifying exactly where the quote came from |
| `quote` | string | Verbatim supporting text — never paraphrased |

## EvidenceRecord

The atomic unit this feature produces (spec Key Entities; requirements.MD EvidenceRecord).

| Field | Type | Notes |
|---|---|---|
| `evidenceId` | string | Generated (e.g. UUID); unique per FR-008 |
| `termId` | string | FK → ProductLineTerm this evidence is about |
| `predicate` | enum | One of: `definition`, `altLabel`, `broader`, `narrower`, `contextSignal`, `appliesTo`, `providesCoverageFor`, `identifier`, `regulatedBy`, `definedBy` |
| `value` | string | The extracted claim value (e.g. the alias text, the identifier code, the related term name for broader/narrower) |
| `assertionMode` | `"explicit"` | Constant — this agent never emits `"inferred"` (FR-005) |
| `provenance` | Provenance | Embedded, see above |

### Validation rules (from Functional Requirements)

- `assertionMode` MUST always be `"explicit"` for records this agent produces (FR-005).
- `provenance.quote`, `provenance.location.anchor`, `provenance.retrievedDate`, `provenance.sourceId`, `provenance.documentId` MUST all be present — no partial-provenance records (FR-006, SC-002).
- A `broader`/`narrower` record MUST only be created when the source text directly states the relationship (not implied) — enforced by the extractor unit tests (FR-003).
- No two EvidenceRecords in the same run may share identical `(termId, predicate, value, provenance.documentId, provenance.location.anchor)` — duplicate detection for FR-010.
- On re-run over an unchanged Document, previously-produced records for that exact `(termId, predicate, value, location.anchor)` are not re-submitted (FR-010, FR-011 preserves prior records rather than overwriting).

## State transitions

None — EvidenceRecords are immutable once produced (append-only). A source revision produces new records with a new `retrievedDate`, never a mutation of an existing record (FR-011).
