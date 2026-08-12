import type { EvidenceClient } from "@insurance-kb/evidence-client";
import type { ProductLineTerm } from "@insurance-kb/contracts";
import { loadSeedDocuments, type SeedDocument } from "./discovery.js";
import { planSourceIntelligenceRun } from "./planner.js";
import { fetchAndEvaluate } from "./source-evaluator.js";
import {
  buildEvidenceRecord,
  chunkByHeading,
  extractAltLabelCandidates,
  extractDefinitionCandidates,
  extractIdentifierCandidates
} from "./extractor.js";
import { SEED_PRODUCT_LINE_TERMS } from "./seed/product-line-terms.js";
import { DEFAULT_SEED_DOCUMENTS } from "./seed/seed-sources.js";

export interface SourceFailure {
  documentId: string;
  url: string;
  reason: string;
}

export interface SourceIntelligenceRunResult {
  documentsProcessed: number;
  documentsFailed: number;
  evidenceWritten: number;
  evidenceAlreadyKnown: number;
  failures: SourceFailure[];
}

export interface SourceIntelligenceRunOptions {
  terms?: ProductLineTerm[];
  seedDocuments?: SeedDocument[];
}

/**
 * The Source Intelligence Agent: discovers (from the static seed list) -> fetches and evaluates
 * each source -> extracts explicit-only evidence -> writes it to the EvidenceStore. A single
 * unreachable/failing source is recorded in `failures` and does not stop the run (FR-009).
 */
export async function runSourceIntelligenceAgent(
  evidenceClient: EvidenceClient,
  options: SourceIntelligenceRunOptions = {}
): Promise<SourceIntelligenceRunResult> {
  const terms = options.terms ?? SEED_PRODUCT_LINE_TERMS;
  const seedDocuments = loadSeedDocuments(options.seedDocuments ?? DEFAULT_SEED_DOCUMENTS);
  const plan = planSourceIntelligenceRun(seedDocuments, terms);

  const failures: SourceFailure[] = [];
  let documentsProcessed = 0;
  let evidenceWritten = 0;
  let evidenceAlreadyKnown = 0;

  for (const item of plan) {
    const fetchResult = await fetchAndEvaluate(item.seedDoc);
    if (fetchResult.status !== "ok" || !fetchResult.html) {
      failures.push({
        documentId: item.seedDoc.documentId,
        url: item.seedDoc.url,
        reason: fetchResult.reason ?? fetchResult.status
      });
      continue;
    }
    documentsProcessed++;

    const chunks = chunkByHeading(fetchResult.html, item.seedDoc.documentId);
    for (const term of item.terms) {
      for (const chunk of chunks) {
        const candidates = [
          ...extractDefinitionCandidates(chunk, term),
          ...extractAltLabelCandidates(chunk, term),
          ...extractIdentifierCandidates(chunk, term)
        ];
        for (const candidate of candidates) {
          const record = buildEvidenceRecord(candidate, chunk, {
            sourceId: item.seedDoc.source.sourceId,
            documentId: item.seedDoc.documentId,
            url: item.seedDoc.url,
            retrievedDate: fetchResult.retrievedDate
          });

          const alreadyKnown = await evidenceClient.hasEvidence(record.evidenceId);
          if (alreadyKnown) {
            evidenceAlreadyKnown++;
            continue;
          }
          await evidenceClient.putEvidence(record);
          evidenceWritten++;
        }
      }
    }
  }

  return { documentsProcessed, documentsFailed: failures.length, evidenceWritten, evidenceAlreadyKnown, failures };
}
