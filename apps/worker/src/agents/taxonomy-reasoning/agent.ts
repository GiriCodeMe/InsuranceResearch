import type { CanonicalConcept, EvidenceRecord, ProductLineTerm, TaxonomyEdge } from "@insurance-kb/contracts";
import type { GraphClient } from "@insurance-kb/graph-client";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import { conceptToEntity, edgeToRelation, inferenceRecordToEntity, toDomainSnapshot } from "@insurance-kb/taxonomy-core";
import { buildExplicitEdgeFromEvidence, mergeConceptEnrichment } from "./hierarchy.js";
import { buildHeuristicPlacementInference } from "./inference.js";

export interface TaxonomyReasoningRunOptions {
  evidenceIds: string[];
  terms: ProductLineTerm[];
  schemeId: string;
  taxonomyVersion: string;
}

export interface TaxonomyReasoningRunResult {
  conceptsEnriched: string[];
  explicitEdgesCreated: string[];
  inferredEdgesCreated: string[];
  unresolvedEvidenceIds: string[];
  unknownConceptIds: string[];
}

function conceptChanged(before: CanonicalConcept, after: CanonicalConcept): boolean {
  return before.definition !== after.definition || before.altLabels.length !== after.altLabels.length;
}

/**
 * Reads the evidence the caller hands it (the EvidenceStore contract has no query/list endpoint —
 * per requirements.MD it's GET/HEAD-by-id and POST only — so the Source Intelligence run or its
 * queue job must supply which evidenceIds to reason over), enriches known concepts with
 * definition/altLabel evidence, promotes explicit "broader"/"narrower" evidence to TaxonomyEdges,
 * and falls back to a heuristic placement inference for any known term left with no edge at all.
 * Scoped to the fixed MVP concept backbone — this agent updates existing concepts, it does not
 * create new ones (requirements.MD's 10-concept MVP boundary).
 */
export async function runTaxonomyReasoningAgent(
  graphClient: GraphClient,
  evidenceClient: EvidenceClient,
  options: TaxonomyReasoningRunOptions
): Promise<TaxonomyReasoningRunResult> {
  const nodeSnapshot = await graphClient.readGraph();
  const snapshot = toDomainSnapshot(nodeSnapshot, options.schemeId, options.taxonomyVersion);
  const workingEdges: TaxonomyEdge[] = [...snapshot.edges];

  const unresolvedEvidenceIds: string[] = [];
  const evidenceByTermId = new Map<string, EvidenceRecord[]>();
  for (const evidenceId of options.evidenceIds) {
    const record = await evidenceClient.getEvidence(evidenceId);
    if (!record) {
      unresolvedEvidenceIds.push(evidenceId);
      continue;
    }
    const list = evidenceByTermId.get(record.termId) ?? [];
    list.push(record);
    evidenceByTermId.set(record.termId, list);
  }

  const conceptsEnriched: string[] = [];
  const explicitEdgesCreated: string[] = [];
  const unknownConceptIds: string[] = [];
  const entitiesToWrite: ReturnType<typeof conceptToEntity>[] = [];
  const relationsToWrite: ReturnType<typeof edgeToRelation>[] = [];

  for (const [termId, evidenceForTerm] of evidenceByTermId) {
    const concept = snapshot.concepts.find((c) => c.conceptId === termId);
    if (!concept) {
      unknownConceptIds.push(termId);
      continue;
    }

    const enriched = mergeConceptEnrichment(concept, evidenceForTerm);
    if (conceptChanged(concept, enriched)) {
      entitiesToWrite.push(conceptToEntity(enriched));
      conceptsEnriched.push(termId);
    }

    for (const evidence of evidenceForTerm) {
      const edge = buildExplicitEdgeFromEvidence(evidence, options.schemeId, snapshot.concepts, workingEdges);
      if (edge) {
        workingEdges.push(edge);
        relationsToWrite.push(edgeToRelation(edge));
        explicitEdgesCreated.push(edge.edgeId);
      }
    }
  }

  const inferredEdgesCreated: string[] = [];
  for (const term of options.terms) {
    const hasAnyEdge = workingEdges.some(
      (edge) => edge.subjectConceptId === term.termId || edge.objectConceptId === term.termId
    );
    if (hasAnyEdge) continue;

    const placement = buildHeuristicPlacementInference(term, options.schemeId);
    if (!placement) continue;

    workingEdges.push(placement.edge);
    relationsToWrite.push(edgeToRelation(placement.edge));
    entitiesToWrite.push(inferenceRecordToEntity(placement.inferenceRecord));
    inferredEdgesCreated.push(placement.edge.edgeId);
  }

  if (entitiesToWrite.length > 0) {
    await graphClient.createEntities(entitiesToWrite);
  }
  if (relationsToWrite.length > 0) {
    await graphClient.createRelations(relationsToWrite);
  }

  return { conceptsEnriched, explicitEdgesCreated, inferredEdgesCreated, unresolvedEvidenceIds, unknownConceptIds };
}
