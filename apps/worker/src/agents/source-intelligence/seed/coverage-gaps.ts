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
  { conceptId: "GroupBenefits", status: "gap", action: "Search DOL/ERISA, NAIC, state regulators, LIMRA/industry standards" },
  { conceptId: "PetInsurance", status: "gap", action: "Search NAIC, state insurance departments, NAPHIA, insurer/industry standards" },
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
