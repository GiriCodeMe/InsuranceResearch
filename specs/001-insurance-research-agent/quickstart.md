# Quickstart: Insurance Research Agent (Source Intelligence)

## Prerequisites

- Node.js 20+
- The mock EvidenceStore running locally (Fastify, per Architecture.MD) — this feature is a client of it, not its implementation.

## Run a full pass over the seed list

```bash
npm install
npm run start:source-intelligence -- --evidence-store-url http://localhost:4001
```

This loads `src/shared/config/seed-sources.json`, fetches each seed document, runs all predicate extractors against it, and writes resulting `EvidenceRecord`s to the EvidenceStore. Per-source failures are logged and summarized at the end of the run rather than aborting it (FR-009).

## Run tests

```bash
npm test              # unit + contract tests (mock EvidenceStore must be running for contract tests)
npm run test:e2e      # resets/reseeds the mock store, runs the full pipeline, asserts evidence + provenance
```

## Verify success criteria manually

- SC-001: query the mock EvidenceStore for each of the 10 seeded `termId`s and confirm at least one `predicate: "definition"` record exists.
- SC-002: confirm every returned record has a non-empty `provenance.quote`, `provenance.location.anchor`, and `provenance.retrievedDate`.
- SC-005: point one seed URL at an unreachable host, rerun, and confirm the run still completes and the failure summary names that source.
