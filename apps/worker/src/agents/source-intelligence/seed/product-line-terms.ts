import type { ProductLineTerm } from "@insurance-kb/contracts";

/**
 * The MVP taxonomy backbone (spec.md FR-002): the original 10-concept Commercial/Personal P&C
 * set, plus 4 additional top-level lines of business (Life, Group Benefits, Pet, Crop). The new
 * 4 are modeled as standalone segments — contextScope "both" — rather than forced under
 * CommercialInsurance/PersonalInsurance, since real-world insurance taxonomies treat "line of
 * business" (P&C vs. Life vs. Health, etc.) as a separate dimension from the commercial/personal
 * distinction; "both" also tells the Taxonomy Reasoning Agent's heuristic-placement fallback
 * (inference.ts) not to guess a Commercial/Personal parent for them.
 *
 * termId values intentionally match the conceptId values seeded into the mock Graph API
 * (apps/mock-graph-api/src/seed/insurance-taxonomy.ts) so evidence produced here lines up with
 * the same canonical concepts downstream.
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
  },
  { termId: "LifeInsurance", canonicalLabel: "Life Insurance", aliases: [], contextScope: "both" },
  {
    termId: "GroupBenefits",
    canonicalLabel: "Group Benefits",
    aliases: ["Group Insurance", "Employee Benefits"],
    contextScope: "both"
  },
  { termId: "PetInsurance", canonicalLabel: "Pet Insurance", aliases: ["Pet Health Insurance"], contextScope: "both" },
  {
    termId: "CropInsurance",
    canonicalLabel: "Crop Insurance",
    aliases: ["Multi-Peril Crop Insurance", "MPCI"],
    contextScope: "both"
  }
];
