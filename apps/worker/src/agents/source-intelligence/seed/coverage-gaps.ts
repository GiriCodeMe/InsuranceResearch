/**
 * Explicit source-coverage tracking for every concept in the taxonomy backbone. A concept with no
 * wired source is a *coverage gap to close*, not evidence the concept is invalid — this file makes
 * that distinction structural rather than something only stated in a comment, and
 * coverage-gaps.test.ts enforces it stays truthful as concepts and seed sources change.
 */
export type SourceCoverageStatus =
  | "covered" // a real, structurally-verified source is wired in seed-sources.ts
  | "gap" // no authoritative source has been identified/verified yet
  | "technical_extraction_gap"; // a source is known, but the extractor can't parse its structure yet

export interface SourceCoverageEntry {
  conceptId: string;
  status: SourceCoverageStatus;
  /** What to do next to close a gap; empty for "covered" entries. */
  action: string;
}

export const SOURCE_COVERAGE: SourceCoverageEntry[] = [
  { conceptId: "CommercialInsurance", status: "gap", action: "Search NAIC/ACORD for a definitional overview of \"commercial insurance\" as a line-of-business umbrella" },
  { conceptId: "PersonalInsurance", status: "gap", action: "Search NAIC/ACORD for a definitional overview of \"personal insurance\" as a line-of-business umbrella" },
  { conceptId: "CommercialPropertyInsurance", status: "gap", action: "Search ISO/ACORD/state DOI glossaries for commercial property insurance" },
  { conceptId: "CommercialAutoInsurance", status: "gap", action: "Search ISO/ACORD/state DOI glossaries for commercial auto insurance" },
  { conceptId: "GeneralLiability", status: "gap", action: "Search ISO/ACORD/IRMI glossaries for general liability insurance" },
  { conceptId: "CommercialGeneralLiability", status: "gap", action: "Search ISO/ACORD CGL form documentation and IRMI's glossary" },
  { conceptId: "PersonalPropertyInsurance", status: "gap", action: "Search NAIC/state DOI glossaries for personal property insurance" },
  { conceptId: "HomeownersInsurance", status: "covered", action: "" },
  { conceptId: "PersonalAutoInsurance", status: "covered", action: "" },
  { conceptId: "PersonalAutoPolicy", status: "gap", action: "Search III (Insurance Information Institute) and state DOI glossaries for the Personal Auto Policy (PAP) form specifically" },
  { conceptId: "LifeInsurance", status: "covered", action: "" },
  {
    conceptId: "GroupBenefits",
    status: "gap",
    action:
      'DOL/EBSA pages (dol.gov/general/topic/health-plans, .../health-plans/erisa) return HTTP 403 to automated fetches even with full browser headers — a WAF block, not a curl quirk; would need real browser automation. NAIC has no dedicated "group benefits" consumer page. Still worth trying: state DOI group-insurance bulletins, LIMRA (paywalled member content, unconfirmed), IRS umbrella pages for group plans generally (only found one for the Life sub-line, see GroupLifeBenefits).'
  },
  { conceptId: "GroupHealthBenefits", status: "gap", action: "Search NAIC/state DOI group health insurance guidance; DOL/EBSA pages on group health plans are blocked (see GroupBenefits)" },
  { conceptId: "GroupMedicalBenefits", status: "gap", action: "Search NAIC/state DOI/CMS guidance on employer-sponsored group medical plans" },
  { conceptId: "GroupVisionBenefits", status: "gap", action: "Search NAIC/state DOI or vision-industry association (e.g. VCA) guidance on group vision benefits" },
  { conceptId: "GroupDentalBenefits", status: "gap", action: "Search NAIC/state DOI or dental-industry association (e.g. NADP) guidance on group dental benefits" },
  {
    conceptId: "GroupDisabilityBenefits",
    status: "gap",
    action:
      "DOL/EBSA's group-disability claims-procedure publication is blocked (403, same WAF as GroupBenefits). Search state DOI/CDA (Council for Disability Awareness) guidance instead."
  },
  {
    conceptId: "GroupLifeBenefits",
    status: "technical_extraction_gap",
    action:
      'Source found and reachable: https://www.irs.gov/government-entities/federal-state-local-governments/group-term-life-insurance (verified real content on IRC section 79 group-term life exclusion). Not yet usable: the real content div sits ~6 wrapper divs below the page h1 (sidebar/region/article/field nesting), beyond this extractor\'s 2-level (heading -> heading.parent()) fallback. Needs either a deeper/generic "find nearest ancestor with sibling <p> content" fallback, or a page-specific selector.'
  },
  {
    conceptId: "PetInsurance",
    status: "covered",
    action: ""
  },
  {
    conceptId: "CropInsurance",
    status: "technical_extraction_gap",
    action: "Use USDA RMA directly; improve crawler/extractor for nested Drupal pages"
  }
];

export function getSourceCoverage(conceptId: string): SourceCoverageEntry | undefined {
  return SOURCE_COVERAGE.find((entry) => entry.conceptId === conceptId);
}

export function listGaps(status?: Exclude<SourceCoverageStatus, "covered">): SourceCoverageEntry[] {
  return SOURCE_COVERAGE.filter((entry) => entry.status !== "covered" && (!status || entry.status === status));
}
