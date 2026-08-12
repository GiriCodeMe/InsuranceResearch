import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../apps/mock-evidence-store/src/server.js";

const validRecord = {
  evidenceId: "evidence-1",
  termId: "CommercialGeneralLiability",
  predicate: "definition",
  value: "CGL covers third-party bodily injury and property damage claims.",
  assertionMode: "explicit",
  provenance: {
    sourceId: "naic",
    documentId: "naic-glossary",
    url: "https://content.naic.org/consumer/glossary-terms",
    retrievedDate: "2026-08-11T00:00:00.000Z",
    location: { anchor: "#cgl" },
    quote: "CGL covers third-party bodily injury and property damage claims."
  }
};

describe("mock-evidence-store", () => {
  const app = buildServer();

  beforeEach(async () => {
    await app.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("writes a valid EvidenceRecord and reads it back", async () => {
    await app.inject({ method: "POST", url: "/evidence?envelope=raw", payload: validRecord });
    const res = await app.inject({ method: "GET", url: "/evidence/evidence-1?envelope=raw" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(validRecord);
  });

  it("HEAD returns 200 for an existing record and 404 for a missing one", async () => {
    await app.inject({ method: "POST", url: "/evidence", payload: validRecord });
    const found = await app.inject({ method: "HEAD", url: "/evidence/evidence-1" });
    const missing = await app.inject({ method: "HEAD", url: "/evidence/does-not-exist" });
    expect(found.statusCode).toBe(200);
    expect(missing.statusCode).toBe(404);
  });

  it("rejects a record with incomplete provenance (missing quote)", async () => {
    const { provenance, ...rest } = validRecord;
    const { quote, ...provenanceWithoutQuote } = provenance;
    const res = await app.inject({
      method: "POST",
      url: "/evidence",
      payload: { ...rest, provenance: provenanceWithoutQuote }
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects an inferred assertionMode (this store only accepts explicit evidence)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/evidence",
      payload: { ...validRecord, assertionMode: "inferred" }
    });
    expect(res.statusCode).toBe(400);
  });

  it("reseed loads the fixture evidence records", async () => {
    await app.inject({ method: "POST", url: "/__admin/reseed" });
    const res = await app.inject({ method: "GET", url: "/evidence/seed-evidence-cgl-definition" });
    expect(res.statusCode).toBe(200);
  });

  it("negative test: fault-injected ambiguous envelope carries both data and result", async () => {
    await app.inject({ method: "POST", url: "/evidence", payload: validRecord });
    const res = await app.inject({ method: "GET", url: "/evidence/evidence-1?envelope=ambiguous" });
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("result");
  });

  it("negative test: fault-injected malformed envelope does not match EvidenceRecord shape", async () => {
    await app.inject({ method: "POST", url: "/evidence", payload: validRecord });
    const res = await app.inject({ method: "GET", url: "/evidence/evidence-1?envelope=malformed" });
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty("__malformed", true);
  });
});
