# InsuranceKBAgents Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-08-11

## Active Technologies

- Node.js 20 + TypeScript 5 + `undici` (HTTP fetch), `cheerio` (HTML parsing), `zod` (schema validation for extracted evidence + EvidenceStore envelope), `pino` (structured logging), `bullmq`/`ioredis` (job orchestration — matches Architecture.MD's worker runtime, even though this feature's discovery is a single deterministic pass, not a queue-driven crawl) (001-insurance-research-agent)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

Node.js 20 + TypeScript 5: Follow standard conventions

## Recent Changes

- 001-insurance-research-agent: Added Node.js 20 + TypeScript 5 + `undici` (HTTP fetch), `cheerio` (HTML parsing), `zod` (schema validation for extracted evidence + EvidenceStore envelope), `pino` (structured logging), `bullmq`/`ioredis` (job orchestration — matches Architecture.MD's worker runtime, even though this feature's discovery is a single deterministic pass, not a queue-driven crawl)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
