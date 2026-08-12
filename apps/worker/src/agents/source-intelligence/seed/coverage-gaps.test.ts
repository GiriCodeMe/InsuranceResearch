import { describe, expect, it } from "vitest";
import { SEED_PRODUCT_LINE_TERMS } from "./product-line-terms.js";
import { DEFAULT_SEED_DOCUMENTS } from "./seed-sources.js";
import { getSourceCoverage, listGaps, SOURCE_COVERAGE } from "./coverage-gaps.js";

const coveredByASeedDocument = new Set(DEFAULT_SEED_DOCUMENTS.flatMap((doc) => doc.termIds));

describe("SOURCE_COVERAGE (keeps the coverage-gap table honest, not just documented in prose)", () => {
  it("has exactly one entry per concept in the taxonomy backbone — no concept is silently untracked", () => {
    for (const term of SEED_PRODUCT_LINE_TERMS) {
      expect(getSourceCoverage(term.termId), `missing SOURCE_COVERAGE entry for ${term.termId}`).toBeDefined();
    }
    expect(SOURCE_COVERAGE).toHaveLength(SEED_PRODUCT_LINE_TERMS.length);
  });

  it("marks every concept actually covered by a seed document as status=covered", () => {
    for (const conceptId of coveredByASeedDocument) {
      expect(getSourceCoverage(conceptId)?.status, `${conceptId} has a seed document but isn't marked covered`).toBe(
        "covered"
      );
    }
  });

  it("never claims status=covered for a concept with no seed document (no false coverage claims)", () => {
    for (const entry of SOURCE_COVERAGE) {
      if (entry.status === "covered") {
        expect(coveredByASeedDocument.has(entry.conceptId), `${entry.conceptId} is marked covered but has no seed document`).toBe(
          true
        );
      }
    }
  });

  it("every non-covered entry has a non-empty action describing what to do next", () => {
    for (const entry of listGaps()) {
      expect(entry.action.length, `${entry.conceptId} (${entry.status}) has no action recorded`).toBeGreaterThan(0);
    }
  });

  it("distinguishes technical extraction gaps (source known) from unresolved gaps (no source yet) from covered", () => {
    expect(getSourceCoverage("CropInsurance")?.status).toBe("technical_extraction_gap");
    expect(getSourceCoverage("GroupLifeBenefits")?.status).toBe("technical_extraction_gap");
    expect(getSourceCoverage("GroupBenefits")?.status).toBe("gap");
    expect(getSourceCoverage("PetInsurance")?.status).toBe("covered");
  });
});
