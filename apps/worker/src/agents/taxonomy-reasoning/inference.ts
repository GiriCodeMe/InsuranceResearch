import type { InferenceRecord, ProductLineTerm, TaxonomyEdge } from "@insurance-kb/contracts";

export const HEURISTIC_PLACEMENT_CONFIDENCE = 0.6;

const TOP_LEVEL_CONCEPT_ID: Record<"commercial" | "personal", string> = {
  commercial: "CommercialInsurance",
  personal: "PersonalInsurance"
};

/**
 * Deterministic fallback for a concept with no edge at all yet: place it under its top-level
 * context concept (Commercial/Personal Insurance) using the term's known contextScope. No LLM
 * involved (research.md). Confidence is deliberately below the default validation threshold
 * (governance rule 5) — this is a heuristic guess standing in for a real placement, not a
 * validated claim, and must remain "provisional" until confirmed by better evidence.
 *
 * A term with contextScope "both" can't be placed under a single top-level concept by this
 * heuristic — returns undefined rather than guessing.
 */
export function buildHeuristicPlacementInference(
  term: ProductLineTerm,
  schemeId: string,
  supportingEvidenceId?: string
): { edge: TaxonomyEdge; inferenceRecord: InferenceRecord } | undefined {
  if (term.contextScope !== "commercial" && term.contextScope !== "personal") return undefined;

  const objectConceptId = TOP_LEVEL_CONCEPT_ID[term.contextScope];
  if (term.termId === objectConceptId) return undefined; // the top-level concept itself has no parent

  const edgeId = `heuristic-${term.termId}-broader-${objectConceptId}`;
  const edge: TaxonomyEdge = {
    edgeId,
    schemeId,
    subjectConceptId: term.termId,
    predicate: "broader",
    objectConceptId,
    assertionMode: "inferred",
    supportingEvidenceIds: []
  };
  const inferenceRecord: InferenceRecord = {
    inferenceRecordId: `${edgeId}-inference`,
    edgeId,
    method: "heuristic_placement",
    status: "provisional",
    confidence: HEURISTIC_PLACEMENT_CONFIDENCE,
    supportingEvidenceIds: supportingEvidenceId ? [supportingEvidenceId] : []
  };

  return { edge, inferenceRecord };
}
