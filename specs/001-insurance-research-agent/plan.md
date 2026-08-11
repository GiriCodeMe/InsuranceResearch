# Implementation Plan: Insurance Research Agent (Source Intelligence)

**Branch**: `001-insurance-research-agent` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-insurance-research-agent/spec.md`

## Summary

Build a deterministic evidence-collection worker that, given a curated seed list of authoritative US insurance source documents, fetches and parses each document, extracts only explicitly-stated claims (definitions, aliases, explicit broader/narrower relationships, context signals, applicability, coverage/peril references, identifiers, regulatory attribution) for the 10 seeded product-line concepts, and writes each as a provenance-complete `EvidenceRecord` (assertionMode="explicit") to the EvidenceStore over HTTP. No live web search/crawling in this MVP — discovery is a static, versioned seed list, matching the project's "no production-scale crawling" boundary.

## Technical Context

**Language/Version**: Node.js 20 + TypeScript 5
**Primary Dependencies**: `undici` (HTTP fetch), `cheerio` (HTML parsing), `zod` (schema validation for extracted evidence + EvidenceStore envelope), `pino` (structured logging), `bullmq`/`ioredis` (job orchestration — matches Architecture.MD's worker runtime, even though this feature's discovery is a single deterministic pass, not a queue-driven crawl)
**Storage**: None owned by this feature — writes to the EvidenceStore over HTTP (`POST /evidence`), per the strict envelope contract in requirements.MD (raw / `{data}` / `{result}`, `{ok:true}` on mutation, ambiguous envelope = hard failure)
**Testing**: Vitest (unit tests per evidence-predicate extractor; contract tests against the mock EvidenceStore; one end-to-end test running the full seed-list → evidence pipeline against the mock store, plus the negative ambiguous-envelope test)
**Target Platform**: Linux container / local Node runtime, run as a one-shot worker process (invoked by the pipeline, not always-on)
**Project Type**: Backend worker (single project)
**Performance Goals**: Not throughput-critical for this PoC; a full run over the seed list (~10-20 documents) should complete in low single-digit minutes
**Constraints**: Deterministic and reproducible (no live search/crawling); explicit-only extraction (FR-003, FR-005); idempotent re-runs (FR-010); must not abort the run on a single source failure (FR-009)
**Scale/Scope**: 10 seeded product-line concepts (+ known aliases) per requirements.MD; ~10-20 seed source documents for MVP coverage of SC-001

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles for this project yet). There are no project-specific gates to evaluate against. Proceeding with the general spec-kit defaults (test-first where practical, avoid unnecessary complexity, single project unless justified). **Recommendation**: run `/speckit.constitution` before the next feature to lock in principles (e.g., "explicit evidence only, never inferred" is exactly the kind of non-negotiable this project should ratify).

No violations to justify — Complexity Tracking section is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-insurance-research-agent/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── evidence-store-client.md
└── tasks.md              # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── agents/
│   └── source-intelligence/
│       ├── seed/                    # seed-sources.json + seed loader (the "discovery" step for this MVP)
│       ├── fetch/                    # HTTP retrieval of seed documents (retry/timeout, per-source failure isolation)
│       ├── extract/                  # one extractor per evidence predicate (definition, altLabel, broader/narrower, contextSignal, appliesTo, providesCoverageFor, identifier, regulatedBy/definedBy)
│       ├── evidence/                  # EvidenceRecord builder + EvidenceStoreClient (strict envelope parsing, per requirements.MD)
│       └── pipeline.ts                # orchestrates seed -> fetch -> extract -> write, isolates per-source failures (FR-009)
├── shared/
│   ├── types/                        # EvidenceRecord, Provenance, Source, Document, ProductLineTerm (shared with future agents)
│   └── config/                       # target product-line terms + aliases (the 10-concept seed backbone)
tests/
├── unit/                              # one suite per extractor
├── contract/                          # EvidenceStoreClient against the mock EvidenceStore (incl. ambiguous-envelope negative test)
└── integration/                       # full pipeline run over the seed list -> asserts evidence records land in the mock store with complete provenance
```

**Structure Decision**: Single project (Option 1). This feature only builds the Source Intelligence Agent; `src/agents/` is deliberately structured so the Taxonomy Reasoning Agent and Validator (out of scope here, per Architecture.MD) can land as sibling directories in later features without restructuring this one. `src/shared/` holds only what's genuinely reused across those future agents (evidence/provenance types, the product-line term list) — nothing else is pulled forward speculatively.

## Complexity Tracking

*No violations — section intentionally empty.*
