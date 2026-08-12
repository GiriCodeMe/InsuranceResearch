import type { GraphSnapshot, ValidationIssue } from "@insurance-kb/contracts";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import { danglingEvidenceIssues, resolveEvidenceIds } from "./provenance.js";

/** Governance rule 2: every explicit TaxonomyEdge must have >=1 supportingEvidenceId that resolves. */
export async function checkExplicitEdgesHaveEvidence(
  snapshot: GraphSnapshot,
  evidenceClient: EvidenceClient
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const edge of snapshot.edges) {
    if (edge.assertionMode !== "explicit") continue;
    if (edge.supportingEvidenceIds.length === 0) {
      issues.push({
        ruleId: "rule2.explicit-edge-requires-evidence",
        severity: "error",
        message: `Explicit edge ${edge.edgeId} has no supportingEvidenceIds`,
        edgeId: edge.edgeId
      });
      continue;
    }
    const resolutions = await resolveEvidenceIds(evidenceClient, edge.supportingEvidenceIds);
    issues.push(...danglingEvidenceIssues(resolutions, { edgeId: edge.edgeId }));
  }
  return issues;
}

/** Governance rule 6: no InferenceRecord without a corresponding TaxonomyEdge. */
export function checkOrphanInferenceRecords(snapshot: GraphSnapshot): ValidationIssue[] {
  const edgeIds = new Set(snapshot.edges.map((edge) => edge.edgeId));
  return snapshot.inferenceRecords
    .filter((record) => !edgeIds.has(record.edgeId))
    .map((record) => ({
      ruleId: "rule6.orphan-inference-record",
      severity: "error" as const,
      message: `InferenceRecord ${record.inferenceRecordId} references edgeId ${record.edgeId}, which does not exist in the graph`,
      inferenceRecordId: record.inferenceRecordId,
      edgeId: record.edgeId
    }));
}
