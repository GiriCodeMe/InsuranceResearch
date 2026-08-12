import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer as buildEvidenceServer } from "../../apps/mock-evidence-store/src/server.js";
import { HttpEvidenceClient } from "../../packages/evidence-client/src/evidence-client.js";
import { runSourceIntelligenceAgent } from "../../apps/worker/src/agents/source-intelligence/agent.js";
import { SEED_PRODUCT_LINE_TERMS } from "../../apps/worker/src/agents/source-intelligence/seed/product-line-terms.js";
import {
  buildEvidenceRecord,
  chunkByHeading,
  extractDefinitionCandidates
} from "../../apps/worker/src/agents/source-intelligence/extractor.js";

function loadFixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../apps/worker/src/agents/source-intelligence/__fixtures__/${name}`, import.meta.url)),
    "utf-8"
  );
}

const source = { sourceId: "test-source", organizationName: "Test Org", sourceType: "regulator" as const };

describe("runSourceIntelligenceAgent (against a local fixture server + the real mock-evidence-store)", () => {
  let fixtureServer: Server;
  let fixtureBaseUrl: string;
  const evidenceApp = buildEvidenceServer();
  let evidenceBaseUrl: string;

  beforeEach(async () => {
    if (!fixtureServer) {
      fixtureServer = createServer((req, res) => {
        if (req.url === "/homeowners") {
          res.writeHead(200, { "content-type": "text/html" }).end(loadFixture("naic-homeowners-insurance.html"));
        } else {
          res.writeHead(500).end("error");
        }
      });
      await new Promise<void>((resolve) => fixtureServer.listen(0, "127.0.0.1", resolve));
      const address = fixtureServer.address();
      if (typeof address !== "object" || address === null) throw new Error("failed to bind fixture server");
      fixtureBaseUrl = `http://127.0.0.1:${address.port}`;
      evidenceBaseUrl = await evidenceApp.listen({ port: 0, host: "127.0.0.1" });
    }
    await evidenceApp.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => fixtureServer.close(() => resolve()));
    await evidenceApp.close();
  });

  it("writes provenance-complete, explicit evidence and reports the failing source separately (FR-009)", async () => {
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });
    const seedDocuments = [
      { source, documentId: "doc-ok", url: `${fixtureBaseUrl}/homeowners`, termIds: ["HomeownersInsurance"] },
      { source, documentId: "doc-broken", url: `${fixtureBaseUrl}/does-not-exist`, termIds: ["HomeownersInsurance"] }
    ];

    const result = await runSourceIntelligenceAgent(evidenceClient, {
      terms: SEED_PRODUCT_LINE_TERMS,
      seedDocuments
    });

    expect(result.documentsProcessed).toBe(1);
    expect(result.documentsFailed).toBe(1);
    expect(result.failures).toEqual([{ documentId: "doc-broken", url: `${fixtureBaseUrl}/does-not-exist`, reason: "HTTP 500" }]);
    expect(result.evidenceWritten).toBe(1);

    // Independently recompute the expected id/content from the same fixture to verify what was written,
    // rather than asserting only the run summary's counts.
    const homeownersTerm = SEED_PRODUCT_LINE_TERMS.find((t) => t.termId === "HomeownersInsurance")!;
    const chunk = chunkByHeading(loadFixture("naic-homeowners-insurance.html"), "doc-ok")[0];
    const candidate = extractDefinitionCandidates(chunk, homeownersTerm)[0];
    const expected = buildEvidenceRecord(candidate, chunk, {
      sourceId: source.sourceId,
      documentId: "doc-ok",
      url: `${fixtureBaseUrl}/homeowners`,
      retrievedDate: "2026-08-11T00:00:00.000Z" // evidenceId is content-derived and doesn't depend on this value
    });

    const written = await evidenceClient.getEvidence(expected.evidenceId);
    expect(written).toBeDefined();
    expect(written?.assertionMode).toBe("explicit");
    expect(written?.value).toContain("Homeowners insurance is a financial protection policy");
    expect(written?.provenance.quote).toBe(written?.value);
  });

  it("is idempotent on re-run: the second run over the same document writes no new evidence (FR-010)", async () => {
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });
    const seedDocuments = [
      { source, documentId: "doc-ok", url: `${fixtureBaseUrl}/homeowners`, termIds: ["HomeownersInsurance"] }
    ];

    const first = await runSourceIntelligenceAgent(evidenceClient, { terms: SEED_PRODUCT_LINE_TERMS, seedDocuments });
    expect(first.evidenceWritten).toBe(1);
    expect(first.evidenceAlreadyKnown).toBe(0);

    const second = await runSourceIntelligenceAgent(evidenceClient, { terms: SEED_PRODUCT_LINE_TERMS, seedDocuments });
    expect(second.evidenceWritten).toBe(0);
    expect(second.evidenceAlreadyKnown).toBe(1);
  });
});
