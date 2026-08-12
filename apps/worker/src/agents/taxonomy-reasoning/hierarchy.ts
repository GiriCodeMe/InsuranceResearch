import type { CanonicalConcept, EvidenceRecord, TaxonomyEdge } from "@insurance-kb/contracts";

/** Matches a free-text label (as stated in evidence) against a known concept's prefLabel/altLabels. */
export function resolveConceptByLabel(label: string, concepts: CanonicalConcept[]): CanonicalConcept | undefined {
  const normalized = label.trim().toLowerCase();
  return concepts.find(
    (concept) =>
      concept.prefLabel.toLowerCase() === normalized || concept.altLabels.some((alt) => alt.toLowerCase() === normalized)
  );
}

/**
 * Merges "definition" and "altLabel" evidence into a concept's metadata. Pure and idempotent —
 * re-running with the same evidence produces the same result, so it's safe to call on every pass.
 * Only definition/altLabel are promoted to concept metadata; other predicates (identifier,
 * contextSignal, appliesTo, providesCoverageFor, regulatedBy, definedBy) have no home in the
 * current CanonicalConcept schema and are left as evidence-only, not silently dropped elsewhere.
 */
export function mergeConceptEnrichment(concept: CanonicalConcept, evidenceForTerm: EvidenceRecord[]): CanonicalConcept {
  let definition = concept.definition;
  const altLabels = new Set(concept.altLabels);

  for (const evidence of evidenceForTerm) {
    if (evidence.predicate === "definition" && !definition) {
      definition = evidence.value;
    }
    if (evidence.predicate === "altLabel") {
      altLabels.add(evidence.value);
    }
  }

  return { ...concept, definition, altLabels: [...altLabels] };
}

function edgesMatchTriple(edge: TaxonomyEdge, subjectConceptId: string, objectConceptId: string): boolean {
  return (
    (edge.subjectConceptId === subjectConceptId && edge.objectConceptId === objectConceptId) ||
    (edge.subjectConceptId === objectConceptId && edge.objectConceptId === subjectConceptId)
  );
}

/**
 * Builds an explicit TaxonomyEdge from a single "broader"/"narrower" EvidenceRecord, or returns
 * undefined when it can't/shouldn't (predicate not a relationship, target label unresolvable, or a
 * TaxonomyEdge already exists for that pair — the Graph API contract has no delete/replace
 * endpoint, so an already-connected pair is left alone rather than adding a redundant second edge).
 *
 * Direction is normalized to "broader" regardless of which predicate the evidence used, so the
 * graph has one consistent convention (specific -> general) no matter how a source phrased it:
 * "narrower" evidence on X naming Y is the same fact as "broader" evidence on Y naming X.
 */
export function buildExplicitEdgeFromEvidence(
  evidence: EvidenceRecord,
  schemeId: string,
  allConcepts: CanonicalConcept[],
  existingEdges: TaxonomyEdge[]
): TaxonomyEdge | undefined {
  if (evidence.predicate !== "broader" && evidence.predicate !== "narrower") return undefined;

  const target = resolveConceptByLabel(evidence.value, allConcepts);
  if (!target) return undefined;

  const subjectConceptId = evidence.predicate === "broader" ? evidence.termId : target.conceptId;
  const objectConceptId = evidence.predicate === "broader" ? target.conceptId : evidence.termId;
  if (subjectConceptId === objectConceptId) return undefined;

  if (existingEdges.some((edge) => edgesMatchTriple(edge, subjectConceptId, objectConceptId))) {
    return undefined;
  }

  return {
    edgeId: `explicit-${evidence.evidenceId}`,
    schemeId,
    subjectConceptId,
    predicate: "broader",
    objectConceptId,
    assertionMode: "explicit",
    supportingEvidenceIds: [evidence.evidenceId]
  };
}
