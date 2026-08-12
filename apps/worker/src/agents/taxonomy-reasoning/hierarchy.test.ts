import { describe, expect, it } from "vitest";
import type { CanonicalConcept, EvidenceRecord, TaxonomyEdge } from "@insurance-kb/contracts";
import { buildExplicitEdgeFromEvidence, mergeConceptEnrichment, resolveConceptByLabel } from "./hierarchy.js";

const concepts: CanonicalConcept[] = [
  { conceptId: "GeneralLiability", prefLabel: "General Liability", altLabels: [], contextScope: "commercial" },
  {
    conceptId: "CommercialGeneralLiability",
    prefLabel: "Commercial General Liability",
    altLabels: ["CGL"],
    contextScope: "commercial"
  }
];

function evidence(overrides: Partial<EvidenceRecord>): EvidenceRecord {
  return {
    evidenceId: "ev-1",
    termId: "CommercialGeneralLiability",
    predicate: "definition",
    value: "some value",
    assertionMode: "explicit",
    provenance: {
      sourceId: "s",
      documentId: "d",
      url: "https://example.org",
      retrievedDate: "2026-08-11T00:00:00.000Z",
      location: { anchor: "#a" },
      quote: "some value"
    },
    ...overrides
  };
}

describe("resolveConceptByLabel", () => {
  it("matches by prefLabel case-insensitively", () => {
    expect(resolveConceptByLabel("general liability", concepts)?.conceptId).toBe("GeneralLiability");
  });

  it("matches by altLabel", () => {
    expect(resolveConceptByLabel("CGL", concepts)?.conceptId).toBe("CommercialGeneralLiability");
  });

  it("returns undefined for an unknown label", () => {
    expect(resolveConceptByLabel("Umbrella Insurance", concepts)).toBeUndefined();
  });
});

describe("mergeConceptEnrichment", () => {
  const base: CanonicalConcept = {
    conceptId: "CommercialGeneralLiability",
    prefLabel: "Commercial General Liability",
    altLabels: [],
    contextScope: "commercial"
  };

  it("sets definition from a definition-predicate evidence record", () => {
    const enriched = mergeConceptEnrichment(base, [evidence({ predicate: "definition", value: "CGL covers..." })]);
    expect(enriched.definition).toBe("CGL covers...");
  });

  it("does not overwrite an existing definition", () => {
    const withDefinition = { ...base, definition: "original" };
    const enriched = mergeConceptEnrichment(withDefinition, [evidence({ predicate: "definition", value: "new" })]);
    expect(enriched.definition).toBe("original");
  });

  it("adds and dedupes altLabels", () => {
    const enriched = mergeConceptEnrichment(base, [
      evidence({ predicate: "altLabel", value: "CGL" }),
      evidence({ predicate: "altLabel", value: "CGL" })
    ]);
    expect(enriched.altLabels).toEqual(["CGL"]);
  });

  it("ignores predicates with no home in CanonicalConcept (e.g. identifier)", () => {
    const enriched = mergeConceptEnrichment(base, [evidence({ predicate: "identifier", value: "CGL-001" })]);
    expect(enriched).toEqual(base);
  });
});

describe("buildExplicitEdgeFromEvidence", () => {
  const schemeId = "insurance-taxonomy-us";

  it("builds a broader edge, direction subject(term) -> object(resolved label)", () => {
    const edge = buildExplicitEdgeFromEvidence(
      evidence({ predicate: "broader", value: "General Liability" }),
      schemeId,
      concepts,
      []
    );
    expect(edge).toMatchObject({
      subjectConceptId: "CommercialGeneralLiability",
      predicate: "broader",
      objectConceptId: "GeneralLiability",
      assertionMode: "explicit",
      supportingEvidenceIds: ["ev-1"]
    });
  });

  it("normalizes a narrower-predicate evidence into the same broader direction", () => {
    const edge = buildExplicitEdgeFromEvidence(
      evidence({ termId: "GeneralLiability", predicate: "narrower", value: "Commercial General Liability" }),
      schemeId,
      concepts,
      []
    );
    expect(edge).toMatchObject({
      subjectConceptId: "CommercialGeneralLiability",
      predicate: "broader",
      objectConceptId: "GeneralLiability"
    });
  });

  it("returns undefined for non-relationship predicates", () => {
    expect(buildExplicitEdgeFromEvidence(evidence({ predicate: "definition" }), schemeId, concepts, [])).toBeUndefined();
  });

  it("returns undefined when the target label doesn't resolve to a known concept", () => {
    expect(
      buildExplicitEdgeFromEvidence(evidence({ predicate: "broader", value: "Umbrella Insurance" }), schemeId, concepts, [])
    ).toBeUndefined();
  });

  it("returns undefined when a TaxonomyEdge already exists for that pair (no delete/replace endpoint to promote it)", () => {
    const existing: TaxonomyEdge = {
      edgeId: "seed-1",
      schemeId,
      subjectConceptId: "CommercialGeneralLiability",
      predicate: "broader",
      objectConceptId: "GeneralLiability",
      assertionMode: "inferred",
      supportingEvidenceIds: []
    };
    expect(
      buildExplicitEdgeFromEvidence(evidence({ predicate: "broader", value: "General Liability" }), schemeId, concepts, [
        existing
      ])
    ).toBeUndefined();
  });
});
