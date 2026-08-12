# Research: Insurance Research Agent (Source Intelligence)

## Decision: Discovery is a static seed list, not live search/crawling

**Rationale**: requirements.MD explicitly puts "production-scale crawling/monitoring" out of scope for the MVP, and the project's success criteria (SC-001/SC-006) demand deterministic, reproducible runs — a hard requirement for the Vitest E2E harness described in requirements.MD ("deterministic E2E" tests, reset/reseed mocks). A curated seed list of known authoritative URLs (NAIC glossary pages, ACORD public materials, state DOI glossaries, established industry publications) per target product-line term gives full control over what evidence should be produced, which is what the test suite needs to assert against.

**Alternatives considered**:
- Search-API-backed discovery (Bing/Google/SerpAPI): more realistic long-term, but introduces non-determinism, external cost/API-key dependency, and result drift between runs — incompatible with the deterministic E2E testing requirement for this PoC.
- Hybrid (seed list + search fallback): defers the same non-determinism problem to an edge case rather than removing it; unnecessary complexity for an MVP whose seed backbone is only 10 concepts.

## Decision: HTML parsing via `cheerio`, HTTP via `undici`

**Rationale**: Both are lightweight, widely-used, dependency-light Node/TS libraries with no native bindings — fits the PoC's "locally runnable and deterministic" runtime goal from Architecture.MD. `cheerio` gives jQuery-like DOM traversal for extracting anchored text (needed for `location.anchor` provenance) without a full browser engine. `undici` is Node's own modern HTTP client, avoids adding `axios` as an extra dependency.

**Alternatives considered**: Playwright/Puppeteer for JS-rendered pages — rejected as overkill; MVP seed sources are static glossary/reference pages, not JS-heavy SPAs. Regex-only text scraping — rejected because it can't reliably capture `location.anchor` (section/anchor-level provenance is a hard requirement, FR-006).

## Decision: One extractor module per evidence predicate

**Rationale**: requirements.MD lists 8 distinct evidence-level predicates (definition, altLabel, broader/narrower, contextSignal, appliesTo, providesCoverageFor, identifier, regulatedBy/definedBy). Keeping each as an independently testable unit (own Vitest suite) directly supports FR-003/FR-005 ("explicit only, never inferred") — each extractor's job is narrow enough to unit-test "does this only fire on explicit statements, never on implied ones" in isolation, which is the single highest-risk correctness property in this feature (SC-003: 0% inferred-as-explicit).

**Alternatives considered**: A single generic "claim extractor" using one LLM prompt covering all predicates — rejected for this MVP because it makes the explicit-vs-implied boundary (the project's core governance guarantee) much harder to unit-test and audit deterministically; revisit for a post-MVP evolution once the explicit/implied boundary has a labeled evaluation set.

## Decision: EvidenceStoreClient enforces the strict envelope contract client-side

**Rationale**: requirements.MD mandates the client fail fast on ambiguous envelopes (both `data` and `result` present) or malformed responses, rather than guessing. This is directly testable via the mock EvidenceStore's `?envelope=ambiguous|malformed` fault-injection query params described in Architecture.MD, and requirements.MD's own negative-test requirement ("force ambiguous envelope response and assert validator fails").

**Alternatives considered**: Lenient parsing (accept `data` and ignore `result` if both present) — rejected; the project's provenance-first design treats ambiguity as corruption risk, not a case to silently paper over.

## Open questions resolved

All `NEEDS CLARIFICATION` items from the Technical Context are resolved above; none remain.
