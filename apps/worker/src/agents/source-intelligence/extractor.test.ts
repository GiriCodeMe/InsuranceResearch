import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProductLineTerm } from "@insurance-kb/contracts";
import {
  buildEvidenceRecord,
  chunkByHeading,
  extractAltLabelCandidates,
  extractDefinitionCandidates,
  extractIdentifierCandidates
} from "./extractor.js";

function loadFixture(name: string): string {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return readFileSync(path, "utf-8");
}

const homeownersTerm: ProductLineTerm = {
  termId: "HomeownersInsurance",
  canonicalLabel: "Homeowners Insurance",
  aliases: [],
  contextScope: "personal"
};
const personalAutoTerm: ProductLineTerm = {
  termId: "PersonalAutoInsurance",
  canonicalLabel: "Auto Insurance",
  aliases: ["Personal Auto Insurance"],
  contextScope: "personal"
};
const cglTerm: ProductLineTerm = {
  termId: "CommercialGeneralLiability",
  canonicalLabel: "Commercial General Liability",
  aliases: ["CGL"],
  contextScope: "commercial"
};

describe("chunkByHeading + extractDefinitionCandidates against real page structure", () => {
  it("extracts the definition from NAIC's Homeowners Insurance page (h1 wrapped in a heading container div)", () => {
    const html = loadFixture("naic-homeowners-insurance.html");
    const chunks = chunkByHeading(html, "naic-consumer-homeowners-insurance");
    expect(chunks).toHaveLength(1);

    const candidates = extractDefinitionCandidates(chunks[0], homeownersTerm);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawValue).toContain("Homeowners insurance is a financial protection policy");
  });

  it("extracts the definition from NAIC's Auto Insurance page and also chunks the unrelated Rental Car Insurance h3", () => {
    const html = loadFixture("naic-auto-insurance.html");
    const chunks = chunkByHeading(html, "naic-consumer-auto-insurance");
    expect(chunks).toHaveLength(2);

    const autoChunk = chunks.find((c) => c.text.startsWith("Auto Insurance"));
    expect(autoChunk).toBeDefined();
    const candidates = extractDefinitionCandidates(autoChunk!, personalAutoTerm);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawValue).toContain("Auto insurance is one of the most used types of personal insurance");
  });

  it("does not produce a definition candidate for a term the heading doesn't name (explicit-only, FR-003)", () => {
    const html = loadFixture("naic-homeowners-insurance.html");
    const chunks = chunkByHeading(html, "naic-consumer-homeowners-insurance");
    expect(extractDefinitionCandidates(chunks[0], personalAutoTerm)).toEqual([]);
  });

  it("extracts altLabel and identifier evidence from a heading with a parenthetical acronym", () => {
    const html = loadFixture("synthetic-cgl-glossary.html");
    const chunks = chunkByHeading(html, "synthetic-cgl-glossary");
    expect(chunks).toHaveLength(1);

    const altLabels = extractAltLabelCandidates(chunks[0], cglTerm);
    expect(altLabels).toEqual([
      { termId: "CommercialGeneralLiability", predicate: "altLabel", rawValue: "CGL", chunkId: chunks[0].chunkId, explicit: true }
    ]);

    const identifiers = extractIdentifierCandidates(chunks[0], cglTerm);
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0].rawValue).toBe("CGL");

    const definitions = extractDefinitionCandidates(chunks[0], cglTerm);
    expect(definitions).toHaveLength(1);
    expect(definitions[0].rawValue).toContain("Commercial General Liability insurance protects businesses");
  });
});

describe("buildEvidenceRecord", () => {
  it("produces a provenance-complete, explicit EvidenceRecord and a stable id across identical inputs", () => {
    const html = loadFixture("naic-homeowners-insurance.html");
    const chunk = chunkByHeading(html, "naic-consumer-homeowners-insurance")[0];
    const candidate = extractDefinitionCandidates(chunk, homeownersTerm)[0];
    const meta = {
      sourceId: "naic",
      documentId: "naic-consumer-homeowners-insurance",
      url: "https://content.naic.org/consumer/homeowners-insurance.htm",
      retrievedDate: "2026-08-11T00:00:00.000Z"
    };

    const record1 = buildEvidenceRecord(candidate, chunk, meta);
    const record2 = buildEvidenceRecord(candidate, chunk, meta);

    expect(record1.evidenceId).toBe(record2.evidenceId);
    expect(record1.assertionMode).toBe("explicit");
    expect(record1.provenance.quote).toBe(candidate.rawValue);
    expect(record1.provenance.location.anchor).toBe(chunk.anchor);
  });
});
