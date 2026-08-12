import type { Source } from "@insurance-kb/contracts";

/**
 * Discovery for this MVP is a static, versioned seed list — not live web search/crawling
 * (out of scope per requirements.MD, and non-deterministic in a way that would break the
 * project's deterministic E2E testing requirement, per research.md).
 */
export interface SeedDocument {
  source: Source;
  documentId: string;
  url: string;
  /** Which target product-line terms this document is expected to be relevant to. */
  termIds: string[];
}

/** Identity by default — exists so callers (and tests) can inject an alternate seed list. */
export function loadSeedDocuments(seedDocuments: SeedDocument[]): SeedDocument[] {
  return seedDocuments;
}
