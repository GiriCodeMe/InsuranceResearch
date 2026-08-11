System: Insurance Research → Evidence → Taxonomy PoC (US-only)
Purpose
Create a governed, evidence-grounded pipeline that:


discovers authoritative insurance sources,

extracts structured evidence with provenance,

reasons over evidence to build a pragmatic product-line taxonomy (Commercial + Personal),

validates the canonical taxonomy against strict integrity rules, and

persists audit-ready validation reports.

High-level architecture (vertical slice)
Public Internet / Documents
│
▼
Source Intelligence Agent (async, worker)


discovery, retrieval, parsing, extraction

emits EvidenceRecords (explicit only)
│
▼

EvidenceStore (authoritative)


evidence + provenance + confidence
│
▼

Taxonomy Reasoning Agent (async, worker)


resolves/normalizes product line concepts

derives canonical taxonomy edges and concept metadata

emits InferenceRecords for inferred edges
│
▼

Canonical Knowledge Graph (KG)


CanonicalConcept

TaxonomyEdge

InferenceRecord

references to evidence IDs (not authoritative for evidence payload)
│
▼

BullMQ Queue: taxonomyValidation
│
▼
Taxonomy Validator Worker


loads KG via GraphClient (HTTP)

loads evidence via EvidenceClient (HTTP)

enforces governance rules
│
▼

Postgres (validation_reports JSONB)


dashboard status: GO | WARNING | NO_GO

audit history per request/version


---

## Key design principles

### 1) Separation of duties (governed pipeline)
- **Source Intelligence Agent** is an **evidence collector**, not a taxonomist.
  - Extracts *explicit* claims only.
  - Must not silently infer hierarchy (e.g., “CGL is-a Liability Insurance”) unless explicitly stated.
- **Taxonomy Reasoning Agent** is the only component that:
  - creates/updates canonical taxonomy edges/concepts, and
  - generates inference records for derived statements.

### 2) EvidenceStore is authoritative for provenance
- The KG references evidence IDs but does not own evidence payload/provenance.
- Validator resolves evidence IDs via EvidenceStore and validates provenance.

### 3) Strict contracts + fail-fast parsing
- GraphClient and EvidenceClient use strict envelope detection + Zod validation.
- If response is malformed or ambiguous, fail early to prevent canonical corruption.

### 4) Semantic compatibility / future-proofing
- Canonical concepts/edges are modeled in a SKOS-like manner:
  - `prefLabel`, `altLabel`, `definition`, `broader/narrower/related`
- Can later export to SKOS/RDF, then align with OWL if desired.

---

## PoC deployment architecture (docker-compose)

Services:
- `redis` (BullMQ)
- `postgres` (validation reports)
- `mock-graph-api` (Fastify, in-memory KG + seed + reset/reseed)
- `mock-evidence-store` (Fastify, in-memory evidence + seed + reset/reseed)
- `worker` (Node/TS workers: reasoning + validation)

All components are locally runnable and deterministic.

---

## Core components

### A) Graph API (mock now, replaceable later)
**Contract endpoints (POST):**
- `/read_graph` → GraphSnapshot
- `/open_nodes` → Node[]
- `/search_nodes` → Node[]
- `/create_entities` → `{ ok: true }`
- `/create_relations` → `{ ok: true }`
- `/add_observations` → `{ ok: true }`

**Envelope modes (strictly supported):**
- raw payload
- `{ "data": payload }`
- `{ "result": payload }`

Ambiguous responses (e.g., `{data:..., result:...}`) must cause client failure.

**Admin endpoints (mock only):**
- `POST /__admin/reset`
- `POST /__admin/reseed`

### B) EvidenceStore (mock now, replaceable later)
**Contract endpoints:**
- `GET /evidence/:id` → EvidenceRecord
- `HEAD /evidence/:id`
- `POST /evidence` (test setup)
- `POST /__admin/reset`
- `POST /__admin/reseed`

**Envelope modes identical** to Graph API.

**Authoritative fields (strict):**
- `provenance.retrievedDate` is ISO datetime
- `provenance.publishedDate` is date-only (`YYYY-MM-DD`) when needed
- must include `sourceId`, `documentId`, `url`, `location.anchor`, `quote`

### C) Worker (BullMQ + Node.js + TypeScript)
Queues:
- `taxonomyReasoning`
- `taxonomyValidation`

Workers:
- `taxonomy-reasoning.worker.ts`
  - reads evidence (optional in PoC)
  - writes/updates canonical KG nodes/edges + inference nodes
  - enqueues validation job
- `taxonomy-validation.worker.ts`
  - loads KG snapshot and evidence records
  - runs validator rules
  - persists validation report to Postgres
  - must persist report even on failure (NO_GO)

---

## Data model (MVP)

### Canonical taxonomy (KG)
- `CanonicalConcept`
  - product-line concepts only
  - disambiguate commercial vs personal via canonical IDs + `contextScope`
- `TaxonomyEdge`
  - predicates: `broader`, `narrower`, `related`
  - `assertionMode`: `explicit | inferred`
  - `supportingEvidenceIds[]`
- `InferenceRecord`
  - exists ONLY for inferred statements
  - references `edgeId`
  - includes method/status/confidence + evidence IDs (when validated)

### EvidenceRecord (EvidenceStore)
Atomic claim with provenance:
- `evidenceId`
- `predicate` (definition, altLabel, broader, providesCoverageFor, etc.)
- `assertionMode` (explicit only for Source Intelligence output)
- `provenance` including `sourceId`, `documentId`, `url`, `retrievedDate`, `location.anchor`, `quote`

### Validation reports (Postgres JSONB)
Table: `validation_reports`
- `request_id`, `scheme_id`, `taxonomy_version`
- `status` (GO/WARNING/NO_GO)
- `error_count`, `warning_count`, `checked_edges`
- `report_json` (full report as JSONB)

---

## Governance validation rules (enforced by validator)
1) Inferred edge → InferenceRecord must exist and match triple  
2) Explicit edge → must have evidence IDs; evidence must exist + have provenance  
3) Explicit edge → must NOT have inference record  
4) Seed inference policy (`seed_skeleton`) fixed confidence/status/evidence-empty  
5) Validated inferences require evidence + confidence threshold  
6) Orphan detection: inference without edge; dangling evidence references  
7) Provenance required fields validated from EvidenceStore

Validator thresholds and enforcement levels are configuration-driven.

---

## MVP taxonomy backbone (seed)
Scheme: `insurance-taxonomy-us`

Top:
- Commercial Insurance
- Personal Insurance

Commercial:
- Property Insurance (commercial)
- Auto Insurance (commercial)
- General Liability (commercial)
  - Commercial General Liability (CGL)

Personal:
- Property Insurance (personal)
  - Homeowners Insurance
- Auto Insurance (personal)
  - Personal Auto Insurance (PAP)

Seed edges are `assertionMode="inferred"` with `seed_skeleton` inference records:
- confidence=0.50, status=provisional, evidence=[]

---

## Fault injection & deterministic testing

### Mock response fault injection
Both mock services support:
- `?envelope=raw|data|result` (valid)
- `?envelope=ambiguous` (invalid; should fail strict client)
- `?envelope=malformed` (invalid; should fail strict client)

### Deterministic test controls
- `POST /__admin/reset`
- `POST /__admin/reseed`

### E2E harness (Vitest)
Test flow:
1) reset + reseed mocks
2) enqueue reasoning job
3) wait for validation job
4) assert Postgres validation report status + counts
5) negative test: ambiguous envelope → validator fails, NO_GO report persisted

---

## Configuration
Environment variables (examples):
- `REDIS_URL`
- `POSTGRES_URL`
- `GRAPH_API_BASE_URL`
- `GRAPH_READ_PATH`, `GRAPH_OPEN_NODES_PATH`, ...
- `EVIDENCE_STORE_URL`
- `SCHEME_ID`
- `TAXONOMY_VERSION`
- `VALIDATED_MIN_CONFIDENCE`
- `MOCK_RESPONSE_ENVELOPE` (mock evidence store default envelope)

---

## Evolution path (post-MVP)
- Add real web discovery/crawling
- Expand product line taxonomy breadth (Workers Comp, Umbrella, etc.)
- Add coverage/peril taxonomy as a second scheme
- Add ontology alignment (ACORD/FIBO) and optional OWL reasoning
- Continuous monitoring + automated taxonomy update proposals
