Project: Insurance Research → Evidence → Taxonomy PoC (US-only)
Objective
Build a governed, evidence-grounded pipeline that discovers authoritative public sources, extracts structured evidence with provenance, and produces a pragmatic insurance product-line taxonomy (Commercial + Personal, US-only) with lightweight semantics. The system must preserve traceability from canonical taxonomy elements back to source evidence and enforce integrity rules via validation.


Scope (MVP)
Domain & Geography
Domain: Insurance

Geography: United States (US-only)

Contexts: Commercial and Personal

Taxonomy boundary (MVP)
First-class canonical taxonomy concepts: product lines only
Examples: Commercial Insurance, Personal Insurance, General Liability, CGL, Homeowners, Personal Auto.

Not first-class in MVP: coverages, perils, endorsements, forms
These are captured as relationships/evidence objects only (strings or external refs), not canonical taxonomy nodes.

Key question answered by MVP
“What are the major US insurance products/lines, how are they classified, and how do commercial and personal contexts relate—grounded in authoritative sources?”


Core principles
Separation of concerns (governed pipeline)
Source Intelligence Agent: evidence collector only

Extracts what sources explicitly state.

Does not silently infer taxonomy hierarchy.

Taxonomy Reasoning Agent: creates/updates canonical taxonomy using evidence

Can infer placements but must record lineage as InferenceRecords.

Validator: enforces integrity across KG + EvidenceStore + InferenceRecords.

Provenance-first
Every canonical taxonomy element (concepts and edges) must be auditable back to:


source organization

document + version/date

exact location (page/section/anchor)

verbatim quote

retrieval timestamp

Semantic compatibility path
Internal representation must remain convertible to:


Pragmatic Taxonomy → SKOS-like representation → Knowledge Graph → Optional OWL ontology

Canonical Scheme (MVP)
schemeId: insurance-taxonomy-us

Two top concepts:

Commercial Insurance

Personal Insurance

MVP canonical backbone (10 concepts)
Top concepts
Commercial Insurance

Personal Insurance

Commercial hierarchy
Property Insurance — commercial context

Auto Insurance — commercial context

General Liability — commercial context (explicitly commercial for MVP)

Commercial General Liability (CGL)

Personal hierarchy
Property Insurance — personal context

Homeowners Insurance

Auto Insurance — personal context

Personal Auto Insurance (PAP)

Context disambiguation rule (critical)
Do not create ambiguous canonical IDs like Property Insurance without context.
Instead use distinct canonical IDs while preserving labels:


ins_us:CommercialPropertyInsurance (prefLabel: “Property Insurance”, altLabel: “Commercial Property Insurance”)

ins_us:PersonalPropertyInsurance (prefLabel: “Property Insurance”, altLabel: “Personal Property Insurance”)

Same pattern for Auto.


Relationships
Canonical taxonomy edges (MVP)
broader / narrower (hierarchy)

related (associative)

Evidence-level predicates (MVP extraction targets)
For each authoritative source/document, extract evidence for:


definition (verbatim)

altLabel (synonyms/aliases/acronyms)

broader / narrower (ONLY when explicitly stated)

contextSignal (commercial/personal signals)

appliesTo (scope: businesses/individuals/vehicles/property, etc.)

providesCoverageFor (coverage/peril objects as text; not canonical nodes)

identifier (ACORD/NAIC IDs where available)

regulatedBy / definedBy (when explicit)

Explicit vs inferred requirement
Source Intelligence Agent outputs explicit evidence only.

Taxonomy Reasoning Agent may create inferred edges but must emit an InferenceRecord.

Data stores (PoC)
Knowledge Graph (canonical)
Stores:


CanonicalConcept

TaxonomyEdge

InferenceRecord

References to evidence IDs (not authoritative for evidence content)

EvidenceStore (authoritative)
Stores full EvidenceRecord JSON with provenance.


Governance store (Postgres)
Stores validation results as JSONB:


table: validation_reports

keyed by (request_id, scheme_id, taxonomy_version)

includes dashboard status: GO | WARNING | NO_GO

Governance validation rules (must enforce)
1) Inferred edge → InferenceRecord
Every TaxonomyEdge.assertionMode="inferred" must have ≥1 InferenceRecord.

InferenceRecord must reference the exact edgeId and match the edge triple.

2) Explicit edge → EvidenceRecord
Every TaxonomyEdge.assertionMode="explicit" must have ≥1 supportingEvidenceId.

Each EvidenceRecord must exist in EvidenceStore and contain required provenance.

3) Explicit edge → no InferenceRecord
Explicit edges must not have inference records.

4) InferenceRecord → evidence
Seed records may have empty evidence list.

Once InferenceRecord.status="validated", require supporting evidence IDs and provenance-valid evidence.

5) Confidence/status rules
method="seed_skeleton" implies:

confidence=0.50

status="provisional"

supportingEvidenceIds=[]

Validated edges/inferences must meet configurable thresholds (default &#62;= 0.80).

6) Orphan detection
No InferenceRecord without corresponding TaxonomyEdge.

No dangling evidence references (referenced evidence IDs must exist).

7) Provenance
Every evidence-backed assertion must retain:

sourceId, documentId, url, retrievedDate (ISO datetime)

location.anchor

quote (verbatim)

Strict API contracts (fail-fast)
Graph API (HTTP)
Endpoints (POST):


/read_graph

/open_nodes

/search_nodes

/create_entities

/create_relations

/add_observations

Response envelope must be exactly one of:


Raw payload

{ "data": payload }

{ "result": payload }

Mutation endpoints must return:


{ "ok": true } (raw/data/result)

Ambiguous envelopes (e.g., both data and result) must fail.


EvidenceStore API (HTTP)
Endpoints:


GET /evidence/:id

HEAD /evidence/:id

POST /evidence

POST /__admin/reset

POST /__admin/reseed

Envelope rules identical to Graph API.


Timestamp strictness
Use ISO datetime for:


retrievedDate, createdAt, updatedAt, completedAt, lastVerified
Use date-only field for:

publishedDate (YYYY-MM-DD)

Runtime architecture (PoC)
Node.js + TypeScript

BullMQ + Redis

Fastify mock services:

Mock Graph API (in-memory + reset/reseed)

Mock EvidenceStore (in-memory + reset/reseed)

Postgres for validation reports (JSONB)

Flow:
Source Intelligence → EvidenceStore → Taxonomy Reasoning → Canonical KG → BullMQ taxonomy-validation → Validator → Postgres validation_reports


Testing requirements (deterministic E2E)
Use Vitest to run end-to-end tests:


Reset + reseed mock Graph API

Reset + reseed mock EvidenceStore

Enqueue taxonomyReasoning job

Wait for taxonomyValidation completion/failure

Query Postgres validation_reports row

Assert status + summary counts

Negative test: force ambiguous envelope response and assert validator fails and persists NO_GO

Out of scope (MVP)
Full OWL reasoning and constraints

Coverage/peril taxonomy as canonical nodes

Production-scale crawling/monitoring

Temporal workflows (BullMQ is sufficient for PoC)

Requirements.MD
Project: Insurance Research → Evidence → Taxonomy PoC (US-only)
Objective
Build a governed, evidence-grounded pipeline that discovers authoritative public sources, extracts structured evidence with provenance, and produces a pragmatic insurance product-line taxonomy (Commercial + Personal, US-only) with lightweight semantics. The system must preserve traceability from canonical taxonomy elements back to source evidence and enforce integrity rules via validation.


Scope (MVP)
Domain & Geography
Domain: Insurance

Geography: United States (US-only)

Contexts: Commercial and Personal

Taxonomy boundary (MVP)
First-class canonical taxonomy concepts: product lines only
Examples: Commercial Insurance, Personal Insurance, General Liability, CGL, Homeowners, Personal Auto.

Not first-class in MVP: coverages, perils, endorsements, forms
These are captured as relationships/evidence objects only (strings or external refs), not canonical taxonomy nodes.

Key question answered by MVP
“What are the major US insurance products/lines, how are they classified, and how do commercial and personal contexts relate—grounded in authoritative sources?”


Core principles
Separation of concerns (governed pipeline)
Source Intelligence Agent: evidence collector only

Extracts what sources explicitly state.

Does not silently infer taxonomy hierarchy.

Taxonomy Reasoning Agent: creates/updates canonical taxonomy using evidence

Can infer placements but must record lineage as InferenceRecords.

Validator: enforces integrity across KG + EvidenceStore + InferenceRecords.

Provenance-first
Every canonical taxonomy element (concepts and edges) must be auditable back to:


source organization

document + version/date

exact location (page/section/anchor)

verbatim quote

retrieval timestamp

Semantic compatibility path
Internal representation must remain convertible to:


Pragmatic Taxonomy → SKOS-like representation → Knowledge Graph → Optional OWL ontology

Canonical Scheme (MVP)
schemeId: insurance-taxonomy-us

Two top concepts:

Commercial Insurance

Personal Insurance

MVP canonical backbone (10 concepts)
Top concepts
Commercial Insurance

Personal Insurance

Commercial hierarchy
Property Insurance — commercial context

Auto Insurance — commercial context

General Liability — commercial context (explicitly commercial for MVP)

Commercial General Liability (CGL)

Personal hierarchy
Property Insurance — personal context

Homeowners Insurance

Auto Insurance — personal context

Personal Auto Insurance (PAP)

Context disambiguation rule (critical)
Do not create ambiguous canonical IDs like Property Insurance without context.
Instead use distinct canonical IDs while preserving labels:


ins_us:CommercialPropertyInsurance (prefLabel: “Property Insurance”, altLabel: “Commercial Property Insurance”)

ins_us:PersonalPropertyInsurance (prefLabel: “Property Insurance”, altLabel: “Personal Property Insurance”)

Same pattern for Auto.


Relationships
Canonical taxonomy edges (MVP)
broader / narrower (hierarchy)

related (associative)

Evidence-level predicates (MVP extraction targets)
For each authoritative source/document, extract evidence for:


definition (verbatim)

altLabel (synonyms/aliases/acronyms)

broader / narrower (ONLY when explicitly stated)

contextSignal (commercial/personal signals)

appliesTo (scope: businesses/individuals/vehicles/property, etc.)

providesCoverageFor (coverage/peril objects as text; not canonical nodes)

identifier (ACORD/NAIC IDs where available)

regulatedBy / definedBy (when explicit)

Explicit vs inferred requirement
Source Intelligence Agent outputs explicit evidence only.

Taxonomy Reasoning Agent may create inferred edges but must emit an InferenceRecord.

Data stores (PoC)
Knowledge Graph (canonical)
Stores:


CanonicalConcept

TaxonomyEdge

InferenceRecord

References to evidence IDs (not authoritative for evidence content)

EvidenceStore (authoritative)
Stores full EvidenceRecord JSON with provenance.


Governance store (Postgres)
Stores validation results as JSONB:


table: validation_reports

keyed by (request_id, scheme_id, taxonomy_version)

includes dashboard status: GO | WARNING | NO_GO

Governance validation rules (must enforce)
1) Inferred edge → InferenceRecord
Every TaxonomyEdge.assertionMode="inferred" must have ≥1 InferenceRecord.

InferenceRecord must reference the exact edgeId and match the edge triple.

2) Explicit edge → EvidenceRecord
Every TaxonomyEdge.assertionMode="explicit" must have ≥1 supportingEvidenceId.

Each EvidenceRecord must exist in EvidenceStore and contain required provenance.

3) Explicit edge → no InferenceRecord
Explicit edges must not have inference records.

4) InferenceRecord → evidence
Seed records may have empty evidence list.

Once InferenceRecord.status="validated", require supporting evidence IDs and provenance-valid evidence.

5) Confidence/status rules
method="seed_skeleton" implies:

confidence=0.50

status="provisional"

supportingEvidenceIds=[]

Validated edges/inferences must meet configurable thresholds (default &#62;= 0.80).

6) Orphan detection
No InferenceRecord without corresponding TaxonomyEdge.

No dangling evidence references (referenced evidence IDs must exist).

7) Provenance
Every evidence-backed assertion must retain:

sourceId, documentId, url, retrievedDate (ISO datetime)

location.anchor

quote (verbatim)

Strict API contracts (fail-fast)
Graph API (HTTP)
Endpoints (POST):


/read_graph

/open_nodes

/search_nodes

/create_entities

/create_relations

/add_observations

Response envelope must be exactly one of:


Raw payload

{ "data": payload }

{ "result": payload }

Mutation endpoints must return:


{ "ok": true } (raw/data/result)

Ambiguous envelopes (e.g., both data and result) must fail.


EvidenceStore API (HTTP)
Endpoints:


GET /evidence/:id

HEAD /evidence/:id

POST /evidence

POST /__admin/reset

POST /__admin/reseed

Envelope rules identical to Graph API.


Timestamp strictness
Use ISO datetime for:


retrievedDate, createdAt, updatedAt, completedAt, lastVerified
Use date-only field for:

publishedDate (YYYY-MM-DD)

Runtime architecture (PoC)
Node.js + TypeScript

BullMQ + Redis

Fastify mock services:

Mock Graph API (in-memory + reset/reseed)

Mock EvidenceStore (in-memory + reset/reseed)

Postgres for validation reports (JSONB)

Flow:
Source Intelligence → EvidenceStore → Taxonomy Reasoning → Canonical KG → BullMQ taxonomy-validation → Validator → Postgres validation_reports


Testing requirements (deterministic E2E)
Use Vitest to run end-to-end tests:


Reset + reseed mock Graph API

Reset + reseed mock EvidenceStore

Enqueue taxonomyReasoning job

Wait for taxonomyValidation completion/failure

Query Postgres validation_reports row

Assert status + summary counts

Negative test: force ambiguous envelope response and assert validator fails and persists NO_GO

Out of scope (MVP)
Full OWL reasoning and constraints

Coverage/peril taxonomy as canonical nodes

Production-scale crawling/monitoring

Temporal workflows (BullMQ is sufficient for PoC)
