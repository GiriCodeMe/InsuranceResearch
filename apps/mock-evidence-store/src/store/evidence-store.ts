import type { EvidenceRecord } from "@insurance-kb/contracts";

/** In-memory, append-only EvidenceRecord store. Reset/reseed reach a known state for deterministic E2E tests. */
export class EvidenceStore {
  private records = new Map<string, EvidenceRecord>();

  reset(): void {
    this.records.clear();
  }

  put(record: EvidenceRecord): void {
    this.records.set(record.evidenceId, record);
  }

  get(evidenceId: string): EvidenceRecord | undefined {
    return this.records.get(evidenceId);
  }

  has(evidenceId: string): boolean {
    return this.records.has(evidenceId);
  }

  all(): EvidenceRecord[] {
    return [...this.records.values()];
  }
}
