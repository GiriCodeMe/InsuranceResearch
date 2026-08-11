import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@insurance-kb/contracts";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import type { GraphClient } from "@insurance-kb/graph-client";
import { validateTaxonomy } from "../../packages/taxonomy-core/src/taxonomy-validator.js";
import { conceptToEntity, edgeToRelation, inferenceRecordToEntity } from "../../packages/taxonomy-core/src/graph-mapping.js";

function fakeEvidenceClient(records: EvidenceRecord[]): EvidenceClient {
  const byId = new Map(records.map((record) => [record.evidenceId, record]));
  return {
    async getEvidence(evidenceId) {
      return byId.get(evidenceId);
    },
    async hasEvidence(evidenceId) {
      return byId.has(evidenceId);
    },
    async putEvidence(record) {
      byId.set(record.evidenceId, record);
    }
  };
}

function fakeGraphClient(entities: ReturnType<typeof conceptToEntity>[], relations: ReturnType<typeof edgeToRelation>[]): GraphClient {
  return {
    async readGraph() {
      return { entities, relations };
    },
    async openNodes(names) {
      return entities.filter((e) => names.includes(e.name));
    },
    async searchNodes() {
      return entities;
    },
    async createEntities() {},
    async createRelations() {},
    async addObservations() {}
  };
}

const evidence: EvidenceRecord = {
  evidenceId: "ev-1",
  termId: "CommercialGeneralLiability",
  predicate: "definition",
  value: "CGL covers...",
  assertionMode: "explicit",
  provenance: {
    sourceId: "naic",
    documentId: "doc-1",
    url: "https://example.org/cgl",
    retrievedDate: "2026-08-11T00:00:00.000Z",
    location: { anchor: "#cgl" },
    quote: "CGL covers..."
  }
};

const concepts = [
  { conceptId: "GL", prefLabel: "General Liability", altLabels: [], contextScope: "commercial" as const },
  { conceptId: "CGL", prefLabel: "CGL", altLabels: [], contextScope: "commercial" as const }
];
const conceptEntities = concepts.map(conceptToEntity);

describe("validateTaxonomy", () => {
  it("returns GO for a well-formed graph (explicit edge with evidence, inferred edge with seed inference record)", async () => {
    const explicitEdge = {
      edgeId: "edge-explicit-1",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader" as const,
      objectConceptId: "GL",
      assertionMode: "explicit" as const,
      supportingEvidenceIds: ["ev-1"]
    };
    const inferredEdge = {
      edgeId: "edge-inferred-1",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "GL",
      predicate: "broader" as const,
      objectConceptId: "CGL",
      assertionMode: "inferred" as const,
      supportingEvidenceIds: []
    };
    const seedInference = {
      inferenceRecordId: "inf-1",
      edgeId: "edge-inferred-1",
      method: "seed_skeleton" as const,
      status: "provisional" as const,
      confidence: 0.5,
      supportingEvidenceIds: []
    };

    const graphClient = fakeGraphClient(
      [...conceptEntities, inferenceRecordToEntity(seedInference)],
      [edgeToRelation(explicitEdge), edgeToRelation(inferredEdge)]
    );
    const evidenceClient = fakeEvidenceClient([evidence]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-1",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("GO");
    expect(report.errorCount).toBe(0);
    expect(report.checkedEdges).toBe(2);
  });

  it("returns NO_GO when an inferred edge has no InferenceRecord (rule 1)", async () => {
    const inferredEdge = {
      edgeId: "edge-inferred-2",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "GL",
      predicate: "broader" as const,
      objectConceptId: "CGL",
      assertionMode: "inferred" as const,
      supportingEvidenceIds: []
    };
    const graphClient = fakeGraphClient(conceptEntities, [edgeToRelation(inferredEdge)]);
    const evidenceClient = fakeEvidenceClient([]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-2",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule1.inferred-edge-requires-inference-record")).toBe(true);
  });

  it("returns NO_GO when an explicit edge has no supporting evidence (rule 2)", async () => {
    const explicitEdge = {
      edgeId: "edge-explicit-2",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader" as const,
      objectConceptId: "GL",
      assertionMode: "explicit" as const,
      supportingEvidenceIds: []
    };
    const graphClient = fakeGraphClient(conceptEntities, [edgeToRelation(explicitEdge)]);
    const evidenceClient = fakeEvidenceClient([]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-3",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule2.explicit-edge-requires-evidence")).toBe(true);
  });

  it("returns NO_GO for a dangling evidence reference on an explicit edge (rule 6/7)", async () => {
    const explicitEdge = {
      edgeId: "edge-explicit-3",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader" as const,
      objectConceptId: "GL",
      assertionMode: "explicit" as const,
      supportingEvidenceIds: ["does-not-exist"]
    };
    const graphClient = fakeGraphClient(conceptEntities, [edgeToRelation(explicitEdge)]);
    const evidenceClient = fakeEvidenceClient([]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-4",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "provenance.dangling-evidence-reference")).toBe(true);
  });

  it("returns NO_GO when an explicit edge also has an InferenceRecord (rule 3)", async () => {
    const explicitEdge = {
      edgeId: "edge-explicit-4",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader" as const,
      objectConceptId: "GL",
      assertionMode: "explicit" as const,
      supportingEvidenceIds: ["ev-1"]
    };
    const stray = {
      inferenceRecordId: "inf-stray",
      edgeId: "edge-explicit-4",
      method: "llm_inference" as const,
      status: "provisional" as const,
      confidence: 0.6,
      supportingEvidenceIds: []
    };
    const graphClient = fakeGraphClient(
      [...conceptEntities, inferenceRecordToEntity(stray)],
      [edgeToRelation(explicitEdge)]
    );
    const evidenceClient = fakeEvidenceClient([evidence]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-5",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule3.explicit-edge-must-not-have-inference-record")).toBe(true);
  });

  it("returns NO_GO for a seed_skeleton InferenceRecord that violates the fixed confidence/status/evidence policy (rule 5)", async () => {
    const inferredEdge = {
      edgeId: "edge-inferred-3",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "GL",
      predicate: "broader" as const,
      objectConceptId: "CGL",
      assertionMode: "inferred" as const,
      supportingEvidenceIds: []
    };
    const badSeed = {
      inferenceRecordId: "inf-bad-seed",
      edgeId: "edge-inferred-3",
      method: "seed_skeleton" as const,
      status: "validated" as const, // violates: seed_skeleton must be provisional
      confidence: 0.9, // violates: seed_skeleton must be 0.50
      supportingEvidenceIds: ["ev-1"] // violates: seed_skeleton must have no evidence
    };
    const graphClient = fakeGraphClient(
      [...conceptEntities, inferenceRecordToEntity(badSeed)],
      [edgeToRelation(inferredEdge)]
    );
    const evidenceClient = fakeEvidenceClient([evidence]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-6",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule5.seed-skeleton-confidence")).toBe(true);
    expect(report.issues.some((i) => i.ruleId === "rule5.seed-skeleton-status")).toBe(true);
    expect(report.issues.some((i) => i.ruleId === "rule5.seed-skeleton-no-evidence")).toBe(true);
  });

  it("returns NO_GO for an orphan InferenceRecord with no corresponding edge (rule 6)", async () => {
    const orphan = {
      inferenceRecordId: "inf-orphan",
      edgeId: "no-such-edge",
      method: "llm_inference" as const,
      status: "provisional" as const,
      confidence: 0.6,
      supportingEvidenceIds: []
    };
    const graphClient = fakeGraphClient([...conceptEntities, inferenceRecordToEntity(orphan)], []);
    const evidenceClient = fakeEvidenceClient([]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-7",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule6.orphan-inference-record")).toBe(true);
  });

  it("returns NO_GO when a validated InferenceRecord is below the confidence threshold (rule 5)", async () => {
    const inferredEdge = {
      edgeId: "edge-inferred-4",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "GL",
      predicate: "broader" as const,
      objectConceptId: "CGL",
      assertionMode: "inferred" as const,
      supportingEvidenceIds: []
    };
    const lowConfidenceValidated = {
      inferenceRecordId: "inf-low-conf",
      edgeId: "edge-inferred-4",
      method: "llm_inference" as const,
      status: "validated" as const,
      confidence: 0.6,
      supportingEvidenceIds: ["ev-1"]
    };
    const graphClient = fakeGraphClient(
      [...conceptEntities, inferenceRecordToEntity(lowConfidenceValidated)],
      [edgeToRelation(inferredEdge)]
    );
    const evidenceClient = fakeEvidenceClient([evidence]);

    const report = await validateTaxonomy(graphClient, evidenceClient, {
      requestId: "req-8",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.issues.some((i) => i.ruleId === "rule5.validated-confidence-threshold")).toBe(true);
  });
});
