import { describe, expect, it } from "vitest";
import type { ProductLineTerm } from "@insurance-kb/contracts";
import type { SeedDocument } from "./discovery.js";
import { planSourceIntelligenceRun } from "./planner.js";

const terms: ProductLineTerm[] = [
  { termId: "HomeownersInsurance", canonicalLabel: "Homeowners Insurance", aliases: [], contextScope: "personal" }
];

const source = { sourceId: "naic", organizationName: "NAIC", sourceType: "regulator" as const };

describe("planSourceIntelligenceRun", () => {
  it("keeps a document whose termIds resolve to a known term", () => {
    const seedDocuments: SeedDocument[] = [
      { source, documentId: "doc-1", url: "https://example.org/1", termIds: ["HomeownersInsurance"] }
    ];
    const plan = planSourceIntelligenceRun(seedDocuments, terms);
    expect(plan).toHaveLength(1);
    expect(plan[0].terms).toEqual(terms);
  });

  it("drops a document whose termIds don't resolve to any known term", () => {
    const seedDocuments: SeedDocument[] = [
      { source, documentId: "doc-2", url: "https://example.org/2", termIds: ["SomeUnknownTerm"] }
    ];
    expect(planSourceIntelligenceRun(seedDocuments, terms)).toEqual([]);
  });

  it("resolves only the subset of termIds that are known, keeping the document", () => {
    const seedDocuments: SeedDocument[] = [
      { source, documentId: "doc-3", url: "https://example.org/3", termIds: ["HomeownersInsurance", "Unknown"] }
    ];
    const plan = planSourceIntelligenceRun(seedDocuments, terms);
    expect(plan).toHaveLength(1);
    expect(plan[0].terms).toEqual(terms);
  });
});
