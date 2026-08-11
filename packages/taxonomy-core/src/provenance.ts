import type { EvidenceRecord, ValidationIssue } from "@insurance-kb/contracts";
import type { EvidenceClient } from "@insurance-kb/evidence-client";

export interface EvidenceResolution {
  evidenceId: string;
  record?: EvidenceRecord;
}

/** Resolves each evidenceId against the EvidenceStore — the authority for evidence content (requirements.MD). */
export async function resolveEvidenceIds(
  evidenceClient: EvidenceClient,
  evidenceIds: string[]
): Promise<EvidenceResolution[]> {
  return Promise.all(
    evidenceIds.map(async (evidenceId) => ({ evidenceId, record: await evidenceClient.getEvidence(evidenceId) }))
  );
}

/** Governance rule 6 (dangling evidence references) and 7 (provenance) both flow through here. */
export function danglingEvidenceIssues(
  resolutions: EvidenceResolution[],
  context: { edgeId?: string; inferenceRecordId?: string }
): ValidationIssue[] {
  return resolutions
    .filter((resolution) => !resolution.record)
    .map((resolution) => ({
      ruleId: "provenance.dangling-evidence-reference",
      severity: "error" as const,
      message: `Referenced evidence ${resolution.evidenceId} does not exist in the EvidenceStore`,
      evidenceId: resolution.evidenceId,
      edgeId: context.edgeId,
      inferenceRecordId: context.inferenceRecordId
    }));
}
