import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer as buildGraphServer } from "../../apps/mock-graph-api/src/server.js";
import { buildServer as buildEvidenceServer } from "../../apps/mock-evidence-store/src/server.js";
import { HttpGraphClient } from "../../packages/graph-client/src/graph-client.js";
import { HttpEvidenceClient } from "../../packages/evidence-client/src/evidence-client.js";
import { validateTaxonomy } from "../../packages/taxonomy-core/src/taxonomy-validator.js";
import { runTaxonomyReasoningAgent } from "../../apps/worker/src/agents/taxonomy-reasoning/agent.js";
import { SEED_PRODUCT_LINE_TERMS } from "../../apps/worker/src/agents/source-intelligence/seed/product-line-terms.js";

const schemeId = "insurance-taxonomy-us";
const taxonomyVersion = "0.1.0";

function provenance(evidenceId: string, quote: string) {
  return {
    sourceId: "naic",
    documentId: "naic-consumer-homeowners-insurance",
    url: "https://content.naic.org/consumer/homeowners-insurance.htm",
    retrievedDate: "2026-08-11T00:00:00.000Z",
    location: { anchor: `#${evidenceId}` },
    quote
  };
}

describe("runTaxonomyReasoningAgent (against the live mock Graph API + EvidenceStore, seeded with the MVP backbone)", () => {
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
    await graphApp.inject({ method: "POST", url: "/__admin/reseed" });
    await evidenceApp.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await graphApp.close();
    await evidenceApp.close();
  });

  it("enriches a concept's definition/altLabel, creates a new explicit edge, and skips a pair already connected by the seed", async () => {
    const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    const definitionEvidence = {
      evidenceId: "ev-homeowners-def",
      termId: "HomeownersInsurance",
      predicate: "definition" as const,
      value: "Homeowners insurance covers damage to a home and its contents.",
      assertionMode: "explicit" as const,
      provenance: provenance("ev-homeowners-def", "Homeowners insurance covers damage to a home and its contents.")
    };
    const altLabelEvidence = {
      evidenceId: "ev-cgl-altlabel",
      termId: "CommercialGeneralLiability",
      predicate: "altLabel" as const,
      value: "Comp Gen Liab",
      assertionMode: "explicit" as const,
      provenance: provenance("ev-cgl-altlabel", "also known as Comp Gen Liab")
    };
    const newEdgeEvidence = {
      evidenceId: "ev-cgl-broader-commercial",
      termId: "CommercialGeneralLiability",
      predicate: "broader" as const,
      value: "Commercial Insurance",
      assertionMode: "explicit" as const,
      provenance: provenance("ev-cgl-broader-commercial", "CGL is a form of commercial insurance")
    };
    const redundantEdgeEvidence = {
      evidenceId: "ev-pap-broader-personal-auto",
      termId: "PersonalAutoPolicy",
      predicate: "broader" as const,
      value: "Personal Auto Insurance", // seed already connects PersonalAutoPolicy -> PersonalAutoInsurance
      assertionMode: "explicit" as const,
      provenance: provenance("ev-pap-broader-personal-auto", "a PAP is a personal auto insurance policy")
    };

    for (const record of [definitionEvidence, altLabelEvidence, newEdgeEvidence, redundantEdgeEvidence]) {
      await evidenceClient.putEvidence(record);
    }

    const result = await runTaxonomyReasoningAgent(graphClient, evidenceClient, {
      evidenceIds: [
        definitionEvidence.evidenceId,
        altLabelEvidence.evidenceId,
        newEdgeEvidence.evidenceId,
        redundantEdgeEvidence.evidenceId
      ],
      terms: SEED_PRODUCT_LINE_TERMS,
      schemeId,
      taxonomyVersion
    });

    expect(result.conceptsEnriched.sort()).toEqual(["CommercialGeneralLiability", "HomeownersInsurance"]);
    expect(result.explicitEdgesCreated).toEqual([`explicit-${newEdgeEvidence.evidenceId}`]);
    expect(result.inferredEdgesCreated).toEqual([]); // every seeded term already has an edge
    expect(result.unresolvedEvidenceIds).toEqual([]);
    expect(result.unknownConceptIds).toEqual([]);

    const snapshot = await graphClient.readGraph();
    const homeowners = snapshot.entities.find((e) => e.name === "HomeownersInsurance");
    expect(homeowners?.observations).toContain(
      `definition: ${definitionEvidence.value}`
    );
    const cgl = snapshot.entities.find((e) => e.name === "CommercialGeneralLiability");
    expect(cgl?.observations).toContain("altLabel: Comp Gen Liab");
    expect(
      snapshot.relations.some(
        (r) => r.from === "CommercialGeneralLiability" && r.to === "CommercialInsurance" && r.relationType === "broader"
      )
    ).toBe(true);
    // No duplicate created for the pair the seed already connects.
    expect(snapshot.relations.filter((r) => r.from === "PersonalAutoPolicy" && r.to === "PersonalAutoInsurance")).toHaveLength(1);
  });

  it("produces output that the Validator still reports as GO (new explicit edge has evidence, no stray InferenceRecord)", async () => {
    const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    const newEdgeEvidence = {
      evidenceId: "ev-cgl-broader-commercial-2",
      termId: "CommercialGeneralLiability",
      predicate: "broader" as const,
      value: "Commercial Insurance",
      assertionMode: "explicit" as const,
      provenance: provenance("ev-cgl-broader-commercial-2", "CGL is a form of commercial insurance")
    };
    await evidenceClient.putEvidence(newEdgeEvidence);

    await runTaxonomyReasoningAgent(graphClient, evidenceClient, {
      evidenceIds: [newEdgeEvidence.evidenceId],
      terms: SEED_PRODUCT_LINE_TERMS,
      schemeId,
      taxonomyVersion
    });

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "reasoning-e2e",
      schemeId,
      taxonomyVersion
    });

    expect(report.status).toBe("GO");
    expect(report.errorCount).toBe(0);
  });

  it("records an unresolved evidenceId rather than failing the whole run", async () => {
    const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
    const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

    const result = await runTaxonomyReasoningAgent(graphClient, evidenceClient, {
      evidenceIds: ["does-not-exist"],
      terms: SEED_PRODUCT_LINE_TERMS,
      schemeId,
      taxonomyVersion
    });

    expect(result.unresolvedEvidenceIds).toEqual(["does-not-exist"]);
  });
});
