import type { ProductLineTerm } from "@insurance-kb/contracts";
import type { SeedDocument } from "./discovery.js";

export interface PlannedWorkItem {
  seedDoc: SeedDocument;
  terms: ProductLineTerm[];
}

/**
 * Resolves each seed document's declared termIds against the known term list. A document whose
 * termIds don't resolve to anything is dropped rather than processed for nothing — a genuine
 * planning decision, not just a pass-through of discovery's output.
 */
export function planSourceIntelligenceRun(seedDocuments: SeedDocument[], terms: ProductLineTerm[]): PlannedWorkItem[] {
  const termsById = new Map(terms.map((term) => [term.termId, term]));
  const plan: PlannedWorkItem[] = [];

  for (const seedDoc of seedDocuments) {
    const resolvedTerms = seedDoc.termIds
      .map((termId) => termsById.get(termId))
      .filter((term): term is ProductLineTerm => term !== undefined);
    if (resolvedTerms.length === 0) continue;
    plan.push({ seedDoc, terms: resolvedTerms });
  }

  return plan;
}
