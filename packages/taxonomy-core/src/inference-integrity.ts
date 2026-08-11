import type { GraphSnapshot, InferenceRecord, ValidationIssue } from "@insurance-kb/contracts";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import { danglingEvidenceIssues, resolveEvidenceIds } from "./provenance.js";

export const DEFAULT_VALIDATED_MIN_CONFIDENCE = 0.8;
const SEED_SKELETON_CONFIDENCE = 0.5;

function groupByEdgeId(records: InferenceRecord[]): Map<string, InferenceRecord[]> {
  const byEdgeId = new Map<string, InferenceRecord[]>();
  for (const record of records) {
    const list = byEdgeId.get(record.edgeId) ?? [];
    list.push(record);
    byEdgeId.set(record.edgeId, list);
  }
  return byEdgeId;
}

/** Governance rule 1: every inferred TaxonomyEdge must have >=1 InferenceRecord referencing its edgeId. */
export function checkInferredEdgesHaveInferenceRecord(snapshot: GraphSnapshot): ValidationIssue[] {
  const byEdgeId = groupByEdgeId(snapshot.inferenceRecords);
  const issues: ValidationIssue[] = [];
  for (const edge of snapshot.edges) {
    if (edge.assertionMode !== "inferred") continue;
    if ((byEdgeId.get(edge.edgeId) ?? []).length === 0) {
      issues.push({
        ruleId: "rule1.inferred-edge-requires-inference-record",
        severity: "error",
        message: `Inferred edge ${edge.edgeId} has no InferenceRecord`,
        edgeId: edge.edgeId
      });
    }
  }
  return issues;
}

/** Governance rule 3: an explicit TaxonomyEdge must NOT have any InferenceRecord. */
export function checkExplicitEdgesHaveNoInferenceRecord(snapshot: GraphSnapshot): ValidationIssue[] {
  const explicitEdgeIds = new Set(
    snapshot.edges.filter((edge) => edge.assertionMode === "explicit").map((edge) => edge.edgeId)
  );
  return snapshot.inferenceRecords
    .filter((record) => explicitEdgeIds.has(record.edgeId))
    .map((record) => ({
      ruleId: "rule3.explicit-edge-must-not-have-inference-record",
      severity: "error" as const,
      message: `Edge ${record.edgeId} is explicit but has InferenceRecord ${record.inferenceRecordId}`,
      edgeId: record.edgeId,
      inferenceRecordId: record.inferenceRecordId
    }));
}

/** Governance rule 5 (seed half): method="seed_skeleton" implies confidence=0.50, status=provisional, evidence=[]. */
export function checkSeedSkeletonPolicy(snapshot: GraphSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const record of snapshot.inferenceRecords) {
    if (record.method !== "seed_skeleton") continue;
    if (record.confidence !== SEED_SKELETON_CONFIDENCE) {
      issues.push({
        ruleId: "rule5.seed-skeleton-confidence",
        severity: "error",
        message: `seed_skeleton InferenceRecord ${record.inferenceRecordId} must have confidence ${SEED_SKELETON_CONFIDENCE}, found ${record.confidence}`,
        inferenceRecordId: record.inferenceRecordId
      });
    }
    if (record.status !== "provisional") {
      issues.push({
        ruleId: "rule5.seed-skeleton-status",
        severity: "error",
        message: `seed_skeleton InferenceRecord ${record.inferenceRecordId} must have status "provisional", found "${record.status}"`,
        inferenceRecordId: record.inferenceRecordId
      });
    }
    if (record.supportingEvidenceIds.length !== 0) {
      issues.push({
        ruleId: "rule5.seed-skeleton-no-evidence",
        severity: "error",
        message: `seed_skeleton InferenceRecord ${record.inferenceRecordId} must have an empty supportingEvidenceIds list`,
        inferenceRecordId: record.inferenceRecordId
      });
    }
  }
  return issues;
}

/** Governance rule 4 + rule 5 (validated half): validated inferences require evidence and meet the confidence threshold. */
export async function checkValidatedInferencesHaveEvidence(
  snapshot: GraphSnapshot,
  evidenceClient: EvidenceClient,
  minConfidence: number = DEFAULT_VALIDATED_MIN_CONFIDENCE
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const record of snapshot.inferenceRecords) {
    if (record.status !== "validated") continue;

    if (record.supportingEvidenceIds.length === 0) {
      issues.push({
        ruleId: "rule4.validated-inference-requires-evidence",
        severity: "error",
        message: `Validated InferenceRecord ${record.inferenceRecordId} has no supporting evidence`,
        inferenceRecordId: record.inferenceRecordId
      });
    } else {
      const resolutions = await resolveEvidenceIds(evidenceClient, record.supportingEvidenceIds);
      issues.push(...danglingEvidenceIssues(resolutions, { inferenceRecordId: record.inferenceRecordId }));
    }

    if (record.confidence < minConfidence) {
      issues.push({
        ruleId: "rule5.validated-confidence-threshold",
        severity: "error",
        message: `Validated InferenceRecord ${record.inferenceRecordId} has confidence ${record.confidence}, below threshold ${minConfidence}`,
        inferenceRecordId: record.inferenceRecordId
      });
    }
  }
  return issues;
}
