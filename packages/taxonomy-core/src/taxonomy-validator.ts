import { ValidationReportSchema, type ValidationReport } from "@insurance-kb/contracts";
import type { GraphClient } from "@insurance-kb/graph-client";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import { toDomainSnapshot } from "./graph-mapping.js";
import { checkExplicitEdgesHaveEvidence, checkOrphanInferenceRecords } from "./rules.js";
import {
  checkExplicitEdgesHaveNoInferenceRecord,
  checkInferredEdgesHaveInferenceRecord,
  checkSeedSkeletonPolicy,
  checkValidatedInferencesHaveEvidence,
  DEFAULT_VALIDATED_MIN_CONFIDENCE
} from "./inference-integrity.js";

export interface ValidateTaxonomyOptions {
  requestId: string;
  schemeId: string;
  taxonomyVersion: string;
  minConfidence?: number;
}

/**
 * Loads the KG via GraphClient and evidence via EvidenceClient, enforces all 7 governance rules
 * from requirements.MD, and returns a ValidationReport with a GO/WARNING/NO_GO dashboard status.
 * Persisting the report (to Postgres) is the caller's responsibility (taxonomy-validation.worker.ts).
 */
export async function validateTaxonomy(
  graphClient: GraphClient,
  evidenceClient: EvidenceClient,
  options: ValidateTaxonomyOptions
): Promise<ValidationReport> {
  const nodeSnapshot = await graphClient.readGraph();
  const snapshot = toDomainSnapshot(nodeSnapshot, options.schemeId, options.taxonomyVersion);
  const minConfidence = options.minConfidence ?? DEFAULT_VALIDATED_MIN_CONFIDENCE;

  const issues = [
    ...checkInferredEdgesHaveInferenceRecord(snapshot),
    ...checkExplicitEdgesHaveNoInferenceRecord(snapshot),
    ...checkSeedSkeletonPolicy(snapshot),
    ...(await checkValidatedInferencesHaveEvidence(snapshot, evidenceClient, minConfidence)),
    ...(await checkExplicitEdgesHaveEvidence(snapshot, evidenceClient)),
    ...checkOrphanInferenceRecords(snapshot)
  ];

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const status = errorCount > 0 ? "NO_GO" : warningCount > 0 ? "WARNING" : "GO";

  return ValidationReportSchema.parse({
    requestId: options.requestId,
    schemeId: options.schemeId,
    taxonomyVersion: options.taxonomyVersion,
    status,
    errorCount,
    warningCount,
    checkedEdges: snapshot.edges.length,
    issues,
    createdAt: new Date().toISOString()
  });
}
