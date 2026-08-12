import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer as buildGraphServer } from "../../apps/mock-graph-api/src/server.js";
import { buildServer as buildEvidenceServer } from "../../apps/mock-evidence-store/src/server.js";
import { HttpGraphClient } from "../../packages/graph-client/src/graph-client.js";
import { HttpEvidenceClient } from "../../packages/evidence-client/src/evidence-client.js";
import { validateTaxonomy } from "../../packages/taxonomy-core/src/taxonomy-validator.js";
import { conceptToEntity, edgeToRelation, inferenceRecordToEntity } from "../../packages/taxonomy-core/src/graph-mapping.js";

describe("end-to-end: HttpGraphClient + HttpEvidenceClient + validateTaxonomy against live mocks", () => {
  const graphApp = buildGraphServer();
  const evidenceApp = buildEvidenceServer();
  let graphBaseUrl: string;
  let evidenceBaseUrl: string;

  beforeEach(async () => {
    if (!graphBaseUrl) {
      graphBaseUrl = await graphApp.listen({ port: 0, host: "127.0.0.1" });
      evidenceBaseUrl = await evidenceApp.listen({ port: 0, host: "127.0.0.1" });
    }
    await graphApp.inject({ method: "POST", url: "/__admin/reset" });
    await evidenceApp.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await graphApp.close();
    await evidenceApp.close();
  });

  it("produces a GO validation report for a well-formed graph + evidence", async () => {
    const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    await evidenceClient.putEvidence({
      evidenceId: "ev-cgl-1",
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
    });

    const explicitEdge = {
      edgeId: "edge-cgl-gl",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader" as const,
      objectConceptId: "GL",
      assertionMode: "explicit" as const,
      supportingEvidenceIds: ["ev-cgl-1"]
    };
    const inferredEdge = {
      edgeId: "edge-gl-commercial",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "GL",
      predicate: "broader" as const,
      objectConceptId: "CommercialInsurance",
      assertionMode: "inferred" as const,
      supportingEvidenceIds: []
    };
    const seedInference = {
      inferenceRecordId: "inf-gl-commercial",
      edgeId: "edge-gl-commercial",
      method: "seed_skeleton" as const,
      status: "provisional" as const,
      confidence: 0.5,
      supportingEvidenceIds: []
    };

    await graphClient.createEntities([
      conceptToEntity({ conceptId: "GL", prefLabel: "General Liability", altLabels: [], contextScope: "commercial" }),
      conceptToEntity({ conceptId: "CGL", prefLabel: "CGL", altLabels: [], contextScope: "commercial" }),
      conceptToEntity({ conceptId: "CommercialInsurance", prefLabel: "Commercial Insurance", altLabels: [], contextScope: "commercial" }),
      inferenceRecordToEntity(seedInference)
    ]);
    await graphClient.createRelations([edgeToRelation(explicitEdge), edgeToRelation(inferredEdge)]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "e2e-req-1",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("GO");
    expect(report.errorCount).toBe(0);
    expect(report.checkedEdges).toBe(2);
  });

  it("negative test: an ambiguous envelope from the Graph API makes the validator fail (not silently produce a report)", async () => {
    const graphClient = new HttpGraphClient({
      baseUrl: graphBaseUrl,
      paths: { readGraph: "/read_graph?envelope=ambiguous" }
    });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    await expect(
      validateTaxonomy(graphClient, evidenceClient, {
        requestId: "e2e-req-2",
        schemeId: "insurance-taxonomy-us",
        taxonomyVersion: "0.1.0"
      })
    ).rejects.toThrow();
  });

  it("Phase 7: reseeding the mock Graph API with the MVP taxonomy backbone produces a GO report", async () => {
    await graphApp.inject({ method: "POST", url: "/__admin/reseed" });

    const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "e2e-seed-taxonomy",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("GO");
    expect(report.errorCount).toBe(0);
    expect(report.checkedEdges).toBe(14);
  });
});
