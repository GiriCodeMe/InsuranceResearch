import { EvidenceRecordSchema, type EvidenceRecord } from "@insurance-kb/contracts";
import { getAndUnwrap, headExists, postAndUnwrapMutation } from "./envelopes.js";
import type { EvidenceClient, EvidenceClientConfig } from "./types.js";

export class HttpEvidenceClient implements EvidenceClient {
  constructor(private readonly config: EvidenceClientConfig) {}

  private url(path: string): string {
    return new URL(path, this.config.baseUrl).toString();
  }

  async getEvidence(evidenceId: string): Promise<EvidenceRecord | undefined> {
    return getAndUnwrap(this.url(`/evidence/${encodeURIComponent(evidenceId)}`), EvidenceRecordSchema);
  }

  async hasEvidence(evidenceId: string): Promise<boolean> {
    return headExists(this.url(`/evidence/${encodeURIComponent(evidenceId)}`));
  }

  async putEvidence(record: EvidenceRecord): Promise<void> {
    return postAndUnwrapMutation(this.url("/evidence"), record);
  }
}
