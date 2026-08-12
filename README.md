# Insurance Research → Evidence → Taxonomy PoC

A governed, evidence-grounded pipeline that discovers authoritative public US insurance sources,
extracts structured evidence with full provenance, and builds a pragmatic Commercial + Personal
insurance product-line taxonomy — with every canonical taxonomy element traceable back to its
source. See `requirements.MD` and `Architecture.MD` for the full design; `specs/001-insurance-research-agent/`
for the spec-kit feature spec/plan this was built from.

## Architecture

```
Source Intelligence Agent  --(evidence)-->  EvidenceStore
        |                                        ^
        v (evidenceIds)                          |
Taxonomy Reasoning Agent  --(reads evidence)------
        |
        v (create_entities / create_relations)
   Graph API (canonical KG)
        |
        v BullMQ: taxonomyValidation
     Validator  --(GO / WARNING / NO_GO)-->  Postgres validation_reports
```

- **`packages/contracts`** — Zod schemas shared by every service; the single source of truth for
  every entity in the system.
- **`packages/graph-client` / `packages/evidence-client`** — thin HTTP clients enforcing the strict
  raw/`{data}`/`{result}` envelope contract client-side.
- **`packages/taxonomy-core`** — the governance validator (all 7 rules from `requirements.MD`) and
  the domain↔wire mapping between `CanonicalConcept`/`TaxonomyEdge`/`InferenceRecord` and the Graph
  API's generic entity/relation model.
- **`apps/mock-graph-api`** / **`apps/mock-evidence-store`** — Fastify mocks of the Graph API and
  EvidenceStore, with admin reset/reseed and envelope fault injection for deterministic testing.
- **`apps/worker`** — the two agents (`agents/source-intelligence`, `agents/taxonomy-reasoning`),
  their BullMQ worker wrappers, and the Postgres-backed validation report store.

## Running it

```bash
npm install
npm run build       # tsc -b, project-references build
npm test             # vitest — 106 tests, no external services required
npm run lint
```

### Live demos (no Redis/Postgres required)

These run the agents directly, in-process, against an ephemeral mock EvidenceStore/Graph API and
the **real internet** (they fetch real NAIC pages):

```bash
npx tsx scripts/run-source-intelligence-demo.ts     # Source Intelligence Agent only
npx tsx scripts/run-taxonomy-pipeline-demo.ts        # full pipeline: fetch -> reason -> validate
```

### Full stack (BullMQ workers + Postgres reports)

```bash
cp .env.example .env   # then edit if needed
docker compose up      # redis, postgres, mock-graph-api, mock-evidence-store, worker
```

`apps/worker`'s `index.ts` starts all three workers (`sourceIntelligence` → `taxonomyReasoning` →
`taxonomyValidation`), each enqueuing the next stage. **This path has not been run against a live
Redis/Postgres in this development environment** (neither was available) — see Known Limitations.

## Project status

| Phase | What | Status |
|---|---|---|
| 1 | `packages/contracts` | Done, tested |
| 2 | `apps/mock-graph-api` | Done, tested |
| 3 | `apps/mock-evidence-store` | Done, tested |
| 4 | `packages/graph-client` / `evidence-client` | Done, tested |
| 5 | `packages/taxonomy-core` validator | Done, tested |
| 6 | BullMQ queues + validation worker | Built; worker/queue path unverified (no Redis available) |
| 7 | Seed the MVP taxonomy backbone | Done — reseed produces a graph the Validator reports GO |
| 8 | Source Intelligence Agent | Done, tested, **run live** against real NAIC pages |
| — | Taxonomy Reasoning Agent | Done, tested, **run live** end-to-end with the Validator |

106/106 tests passing; full `tsc -b` project-reference build clean. See `ProgressReport.MD` for the
full complete/pending breakdown, including per-concept source coverage status.

## Known limitations

- **BullMQ/Redis is unverified.** No Redis server was reachable in this development environment
  (no `redis-server`, no Docker), and `ioredis-mock` doesn't support the Lua-script-heavy commands
  BullMQ depends on, so there's no reliable in-memory substitute. The queue/job schemas and worker
  wiring are written and typecheck, but have never actually processed a job.
- **Postgres persistence is verified against `pg-mem`** (a real in-memory Postgres-compatible
  engine that actually executes the migration SQL and the store's queries), not a live Postgres
  server — the closest available verification without one.
- **Source coverage is partial.** The seed source list (`apps/worker/src/agents/source-intelligence/seed/seed-sources.ts`)
  only has real content for 2 of the 10 seeded product-line terms (NAIC's public consumer pages
  only cover personal-lines topics: Homeowners, Auto). No commercial-lines source is configured yet.
- **Only 3 of 8 evidence predicates are extracted**: `definition`, `altLabel`, `identifier`.
  `broader`/`narrower`/`contextSignal`/`appliesTo`/`providesCoverageFor`/`regulatedBy`/`definedBy`
  are supported by the Taxonomy Reasoning Agent's logic (and tested via crafted evidence) but are
  not yet produced by the extractor from real pages.
- **No LLM is used anywhere in this MVP** — extraction is a real-page-verified heading+paragraph
  heuristic, and taxonomy placement is a deterministic `heuristic_placement` fallback keyed off each
  term's static `contextScope`. This was a deliberate choice (see `specs/001-insurance-research-agent/research.md`)
  to keep the pipeline deterministic for testing; swapping in an LLM-based extractor/reasoner later
  is a scoped, additive change, not a rewrite.
