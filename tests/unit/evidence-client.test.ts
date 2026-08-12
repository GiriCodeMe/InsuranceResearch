import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../apps/mock-evidence-store/src/server.js";
import { HttpEvidenceClient } from "../../packages/evidence-client/src/evidence-client.js";

const record = {
  evidenceId: "evidence-client-test-1",
  termId: "HomeownersInsurance",
  predicate: "definition" as const,
  value: "Homeowners insurance covers damage to a home and its contents.",
  assertionMode: "explicit" as const,
  provenance: {
    sourceId: "naic",
    documentId: "naic-glossary",
    url: "https://content.naic.org/consumer/glossary-terms",
    retrievedDate: "2026-08-11T00:00:00.000Z",
    location: { anchor: "#homeowners" },
    quote: "Homeowners insurance covers damage to a home and its contents."
  }
};

describe("HttpEvidenceClient against a live mock-evidence-store", () => {
  const app = buildServer();
  let baseUrl: string;

  beforeEach(async () => {
    if (!baseUrl) {
      baseUrl = await app.listen({ port: 0, host: "127.0.0.1" });
    }
    await app.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("writes and reads back an EvidenceRecord", async () => {
    const client = new HttpEvidenceClient({ baseUrl });
    await client.putEvidence(record);
    const fetched = await client.getEvidence(record.evidenceId);
    expect(fetched).toEqual(record);
  });

  it("getEvidence returns undefined for a missing record", async () => {
    const client = new HttpEvidenceClient({ baseUrl });
    expect(await client.getEvidence("does-not-exist")).toBeUndefined();
  });

  it("hasEvidence reflects existence without fetching the body", async () => {
    const client = new HttpEvidenceClient({ baseUrl });
    expect(await client.hasEvidence(record.evidenceId)).toBe(false);
    await client.putEvidence(record);
    expect(await client.hasEvidence(record.evidenceId)).toBe(true);
  });

  it("throws when the store rejects an invalid record (e.g. inferred assertionMode)", async () => {
    const client = new HttpEvidenceClient({ baseUrl });
    await expect(client.putEvidence({ ...record, assertionMode: "inferred" as never })).rejects.toThrow();
  });
});
