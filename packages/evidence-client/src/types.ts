import type { EvidenceRecord } from "@insurance-kb/contracts";

export interface EvidenceClientConfig {
  baseUrl: string;
}

/** Interface, not implementation — a real EvidenceStore can implement this without touching callers. */
export interface EvidenceClient {
  getEvidence(evidenceId: string): Promise<EvidenceRecord | undefined>;
  hasEvidence(evidenceId: string): Promise<boolean>;
  putEvidence(record: EvidenceRecord): Promise<void>;
}
