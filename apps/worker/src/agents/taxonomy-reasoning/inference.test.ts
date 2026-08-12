import { describe, expect, it } from "vitest";
import type { ProductLineTerm } from "@insurance-kb/contracts";
import { buildHeuristicPlacementInference, HEURISTIC_PLACEMENT_CONFIDENCE } from "./inference.js";

const schemeId = "insurance-taxonomy-us";

describe("buildHeuristicPlacementInference", () => {
  it("places a commercial-scoped term under CommercialInsurance, provisional and below the validation threshold", () => {
    const term: ProductLineTerm = {
      termId: "GeneralLiability",
      canonicalLabel: "General Liability",
      aliases: [],
      contextScope: "commercial"
    };
    const result = buildHeuristicPlacementInference(term, schemeId);
    expect(result?.edge).toMatchObject({
      subjectConceptId: "GeneralLiability",
      predicate: "broader",
      objectConceptId: "CommercialInsurance",
      assertionMode: "inferred"
    });
    expect(result?.inferenceRecord).toMatchObject({
      edgeId: result?.edge.edgeId,
      method: "heuristic_placement",
      status: "provisional",
      confidence: HEURISTIC_PLACEMENT_CONFIDENCE
    });
    expect(HEURISTIC_PLACEMENT_CONFIDENCE).toBeLessThan(0.8); // must stay below the default validation threshold
  });

  it("places a personal-scoped term under PersonalInsurance", () => {
    const term: ProductLineTerm = {
      termId: "HomeownersInsurance",
      canonicalLabel: "Homeowners Insurance",
      aliases: [],
      contextScope: "personal"
    };
    expect(buildHeuristicPlacementInference(term, schemeId)?.edge.objectConceptId).toBe("PersonalInsurance");
  });

  it("returns undefined for a term scoped to both contexts (can't pick a single parent)", () => {
    const term: ProductLineTerm = {
      termId: "SomeSharedTerm",
      canonicalLabel: "Shared",
      aliases: [],
      contextScope: "both"
    };
    expect(buildHeuristicPlacementInference(term, schemeId)).toBeUndefined();
  });

  it("returns undefined for the top-level concept itself", () => {
    const term: ProductLineTerm = {
      termId: "CommercialInsurance",
      canonicalLabel: "Commercial Insurance",
      aliases: [],
      contextScope: "commercial"
    };
    expect(buildHeuristicPlacementInference(term, schemeId)).toBeUndefined();
  });

  it("includes the supporting evidenceId when one is given", () => {
    const term: ProductLineTerm = {
      termId: "GeneralLiability",
      canonicalLabel: "General Liability",
      aliases: [],
      contextScope: "commercial"
    };
    expect(buildHeuristicPlacementInference(term, schemeId, "ev-1")?.inferenceRecord.supportingEvidenceIds).toEqual([
      "ev-1"
    ]);
  });
});
