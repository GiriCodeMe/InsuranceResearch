# Progress Report

_Generated: 2026-08-12_

Tracks status against `requirements.MD` / `Architecture.MD` (the governed Commercial+Personal P&C
MVP) and the broader 6-agent target pipeline in `OverviewOfAgents.md`. See `README.md` for how to
run everything referenced here.

## Complete

### Infrastructure (Phases 1–7 of the original build order)

| Component | What's done |
|---|---|
| `packages/contracts` | Zod schemas for every entity (Source, Document, Chunk, ProductLineTerm, ConceptCandidate, CanonicalConcept, EvidenceRecord, InferenceRecord, TaxonomyEdge, GraphSnapshot, ValidationReport) plus the strict raw/`{data}`/`{result}` envelope contract. Single source of truth — every service imports from here. |
| `apps/mock-graph-api` | Fastify mock of the Graph API: `read_graph`, `open_nodes`, `search_nodes`, `create_entities`, `create_relations`, `add_observations`, admin `reset`/`reseed`, envelope fault injection. |
| `apps/mock-evidence-store` | Fastify mock of the EvidenceStore: `GET/HEAD/POST /evidence`, admin `reset`/`reseed`, same envelope contract. Rejects incomplete provenance and non-explicit assertionMode. |
| `packages/graph-client` / `packages/evidence-client` | Thin HTTP clients enforcing the envelope contract client-side; fail fast on ambiguous/malformed responses. |
| `packages/taxonomy-core` | The governance validator — all 7 rules from `requirements.MD` (inferred-edge/InferenceRecord pairing, explicit-edge evidence, explicit/inferred mutual exclusion, seed_skeleton policy, validated-status evidence + confidence threshold, orphan detection, dangling evidence references) — plus the domain↔wire mapping layer (`graph-mapping.ts`) between `CanonicalConcept`/`TaxonomyEdge`/`InferenceRecord` and the Graph API's generic entity/relation model. |
| `apps/worker` queues | BullMQ queue/job definitions for `sourceIntelligence`, `taxonomyReasoning`, `taxonomyValidation`; `PostgresValidationReportStore` (upsert on `request_id`/`scheme_id`/`taxonomy_version`). |
| Seed taxonomy | 20 concepts total: the original 10-concept Commercial/Personal P&C backbone, 4 standalone lines-of-business concepts (Life, Group Benefits, Pet, Crop), and 6 Group Benefits sub-lines (Health→Medical/Vision/Dental, Disability, Life) — see below. 14 `seed_skeleton` inferred edges, one matching `InferenceRecord` each. Reseeding and validating produces **GO, 0 errors**. |

### Agents

| Agent | What's done |
|---|---|
| **Source Intelligence Agent** | Discovers from a static, versioned seed list (deterministic by design — no live search/crawling). Fetches with per-source failure isolation (a broken source is recorded and skipped, not fatal). Extracts `definition`, `altLabel`, `identifier` evidence via a heading+paragraph heuristic **verified against live page structure**, not guessed. Writes content-addressed, idempotent `EvidenceRecord`s. **Run live against the real internet.** |
| **Taxonomy Reasoning Agent** | Enriches existing concepts with `definition`/`altLabel` evidence. Resolves free-text `broader`/`narrower` evidence to a known `conceptId` and creates explicit `TaxonomyEdge`s, normalizing direction so the graph has one consistent convention. Skips creating a redundant edge when the pair is already connected (the Graph API has no delete/replace endpoint). Falls back to a deterministic `heuristic_placement` inference (confidence fixed below the validation threshold, so it stays provisional) for any known term left with no edge at all. Scoped to enriching the fixed backbone — does not invent new concepts. **Run live end-to-end**, with output verified to pass the Validator. |

### Domain coverage expansion (this session)

Added 4 new top-level lines of business as standalone taxonomy segments (`contextScope: "both"` —
modeled as siblings of Commercial/Personal Insurance, not nested under either, since "line of
business" is a different taxonomic dimension than the commercial/personal distinction), plus 6
Group Benefits sub-lines matching the employer-sponsored-benefits hierarchy (Group Health Benefits
→ Medical/Vision/Dental, Group Disability Benefits, Group Life Benefits — `contextScope:
"commercial"`, seeded with `broader` edges up to `GroupBenefits`):

| Line | Concept | Real source wired? |
|---|---|---|
| Life Insurance | `LifeInsurance` | **Yes** — NAIC consumer page. |
| Pet Insurance | `PetInsurance` | **Yes** — NAPHIA's Pet Insurance Buying Guide. |
| Group Benefits | `GroupBenefits` | No — gap. DOL/EBSA blocks all automated fetches (HTTP 403, confirmed with full browser headers, not a curl artifact); NAIC has no dedicated page. |
| Group Health/Medical/Vision/Dental/Disability Benefits | 5 concepts | No — gap, no source identified yet for any of these. |
| Group Life Benefits | `GroupLifeBenefits` | No — technical extraction gap. A real, on-topic IRS page exists (IRC §79 group-term life exclusion) but its content sits ~6 wrapper divs below the page's `<h1>`, past this extractor's 2-level fallback. |
| Crop Insurance | `CropInsurance` | No — technical extraction gap (USDA RMA's nested Drupal structure). |

Two things worth calling out from this pass:

- **A generalizable extractor improvement came out of closing the Pet Insurance gap.** NAPHIA's
  guide phrases its definition as an FAQ heading ("What Is Pet Health Insurance?") rather than the
  bare term — added `stripFaqQuestionWrapper()` so `heading.next()`-based term matching also
  recognizes "What Is/Are X?" phrasing. This is a real pattern (seen forming on other government
  sites too), not a one-off hack for a single page.
- **DOL/EBSA is a confirmed hard blocker**, not just an unchecked source: every DOL/ERISA URL
  tried returns HTTP 403 even with a full realistic browser `User-Agent`/`Accept` header set,
  indicating a WAF/bot-detection block this fetch-based agent cannot get past without real browser
  automation (headless Chrome, etc.) — a different category of gap than "haven't looked yet."

A missing source is tracked as a **coverage gap to close, not evidence the concept is invalid** —
this is structural, not just a comment: `apps/worker/src/agents/source-intelligence/seed/coverage-gaps.ts`
records every concept's status (`covered` / `gap` / `technical_extraction_gap`) and the concrete
next action to close it (including which specific URLs were tried and why they didn't work), and
`coverage-gaps.test.ts` fails the suite if this table ever drifts from what's actually wired in
`seed-sources.ts` (a concept can't be silently marked "covered" without a real seed document, and a
new concept can't be added without recording its status). The pipeline demo
(`scripts/run-taxonomy-pipeline-demo.ts`) prints the full gap list with actions on every run.

### Tooling / project hygiene

- Full worker pipeline wired: `index.ts` starts all three BullMQ workers, and each stage now
  enqueues the next (`sourceIntelligence` → `taxonomyReasoning` → `taxonomyValidation`).
- `npm run lint` was broken (no ESLint config existed at all) — fixed; 0 errors/warnings.
- `.env` now loads for local dev outside Docker (previously only Docker's `env_file` worked).
- `README.md` with architecture diagram, run instructions, and a status table.
- Postgres persistence verified against **real SQL execution** via `pg-mem` (migration + upsert +
  CHECK constraint + JSONB querying all proven to actually work, not just param-passed).
- **106/106 tests passing**, clean `tsc -b` project-reference build, clean lint.

## Pending / Not Started

### Within the governed P&C MVP scope (`requirements.MD`)

- **BullMQ/Redis is unverified.** No Redis server is reachable in this development environment (no
  `redis-server`, no Docker), and `ioredis-mock` doesn't support the Lua-script-heavy commands
  BullMQ depends on — there's no reliable in-memory substitute. Queue/worker code is written and
  typechecks but has never actually processed a job through a real broker.
- **Postgres is verified via `pg-mem`, not a live server.** Closest available proof without one
  reachable, but not the same as running against real Postgres.
- **Commercial-lines source coverage is a gap.** Only Homeowners and Personal Auto (personal
  lines) have real seed sources for the original 10-concept backbone; General
  Liability/CGL/CommercialProperty/CommercialAuto have none identified yet.
- **Only 3 of 8 evidence predicates are extracted from real pages**: `definition`, `altLabel`,
  `identifier`. `broader`/`narrower`/`contextSignal`/`appliesTo`/`providesCoverageFor`/
  `regulatedBy`/`definedBy` are supported by the Taxonomy Reasoning Agent's logic and tested via
  crafted evidence, but the extractor doesn't yet produce them from live content.
- **Group Benefits (all 6 sub-lines) and Crop Insurance have no real evidence sources wired** — the
  concepts exist in the taxonomy but nothing populates them yet. Tracked with a concrete next
  action per concept in `coverage-gaps.ts` (see above), including which specific URLs were tried
  and ruled out, not just noted here.
- Several of the original 10 P&C concepts (`CommercialInsurance`, `PersonalInsurance`,
  `CommercialPropertyInsurance`, `CommercialAutoInsurance`, `GeneralLiability`,
  `CommercialGeneralLiability`, `PersonalPropertyInsurance`, `PersonalAutoPolicy`) are also
  tracked as gaps in `coverage-gaps.ts` with a specific body to search next (ISO/ACORD/IRMI/III/
  state DOI, depending on the concept) — previously only stated informally as "no source yet."

### Beyond the MVP scope — the rest of `OverviewOfAgents.md`'s 6-agent pipeline

Not started. Each is a genuine scoped feature, not a small addition:

- **Knowledge Extraction Agent** — currently folded into Source Intelligence's `extractor.ts`
  (deterministic heading+paragraph heuristic). A standalone agent implies broader extraction
  techniques (e.g. handling nested/Drupal-style pages like RMA's, tables, PDFs).
- **Reconciliation Agent** — no cross-source conflict resolution exists. Today, conflicting
  evidence from two sources is simply stored as two separate `EvidenceRecord`s; nothing decides
  which to prefer or how to merge them.
- **Confidence + Provenance Engine** — provenance is enforced (governance rule 7) but there's no
  dedicated confidence-scoring engine beyond the single fixed heuristic-placement confidence value.
- **Evolution Agent (change detection + versioning)** — no mechanism to detect when a source has
  changed since last retrieval, version taxonomy changes over time, or propose updates. Every run
  today is a fresh, idempotent pass, not a diff against history.
- **ACORD/FIBO ontology alignment** — mentioned in `Architecture.MD`'s evolution path; not started.

## Bottom line

The core governed pipeline (evidence → reasoning → validation, with full provenance and explicit/
inferred separation enforced end-to-end) is real, tested, and has been run live against the actual
internet — this is the hard, foundational part and it works. What's pending is either (a) breadth
(more sources, more predicates, more lines of business with real content) or (b) the three
architecturally-separate agents from the target 6-agent vision that go beyond this MVP's stated
scope, plus infrastructure verification (Redis) blocked by this environment, not by the code.
