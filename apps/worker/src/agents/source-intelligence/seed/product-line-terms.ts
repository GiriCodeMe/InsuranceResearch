import type { ProductLineTerm } from "@insurance-kb/contracts";

/**
 * The 10-concept MVP taxonomy backbone (spec.md FR-002). termId values intentionally match the
 * conceptId values seeded into the mock Graph API (apps/mock-graph-api/src/seed/insurance-taxonomy.ts)
 * so evidence produced here lines up with the same canonical concepts downstream.
 */
export const SEED_PRODUCT_LINE_TERMS: ProductLineTerm[] = [
  { termId: "CommercialInsurance", canonicalLabel: "Commercial Insurance", aliases: [], contextScope: "commercial" },
  { termId: "PersonalInsurance", canonicalLabel: "Personal Insurance", aliases: [], contextScope: "personal" },
  {
    termId: "CommercialPropertyInsurance",
    canonicalLabel: "Property Insurance",
    aliases: ["Commercial Property Insurance"],
    contextScope: "commercial"
  },
  {
    termId: "CommercialAutoInsurance",
    canonicalLabel: "Auto Insurance",
    aliases: ["Commercial Auto Insurance"],
    contextScope: "commercial"
  },
  { termId: "GeneralLiability", canonicalLabel: "General Liability", aliases: [], contextScope: "commercial" },
  {
    termId: "CommercialGeneralLiability",
    canonicalLabel: "Commercial General Liability",
    aliases: ["CGL"],
    contextScope: "commercial"
  },
  {
    termId: "PersonalPropertyInsurance",
    canonicalLabel: "Property Insurance",
    aliases: ["Personal Property Insurance"],
    contextScope: "personal"
  },
  { termId: "HomeownersInsurance", canonicalLabel: "Homeowners Insurance", aliases: [], contextScope: "personal" },
  {
    termId: "PersonalAutoInsurance",
    canonicalLabel: "Auto Insurance",
    aliases: ["Personal Auto Insurance"],
    contextScope: "personal"
  },
  {
    termId: "PersonalAutoPolicy",
    canonicalLabel: "Personal Auto Insurance",
    aliases: ["PAP"],
    contextScope: "personal"
  }
];
