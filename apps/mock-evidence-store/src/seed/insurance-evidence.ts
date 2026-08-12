import type { EvidenceRecord } from "@insurance-kb/contracts";

/** A handful of representative fixtures for local dev/tests — not a substitute for real extraction (Phase 8). */
export const seedEvidenceRecords: EvidenceRecord[] = [
  {
    evidenceId: "seed-evidence-cgl-definition",
    termId: "CommercialGeneralLiability",
    predicate: "definition",
    value:
      "Commercial general liability (CGL) insurance protects businesses from claims of bodily injury, property damage, and personal/advertising injury arising from their operations.",
    assertionMode: "explicit",
    provenance: {
      sourceId: "naic",
      documentId: "naic-glossary",
      url: "https://content.naic.org/consumer/glossary-terms",
      retrievedDate: "2026-08-11T00:00:00.000Z",
      location: { anchor: "#commercial-general-liability" },
      quote:
        "Commercial general liability (CGL) insurance protects businesses from claims of bodily injury, property damage, and personal/advertising injury arising from their operations."
    }
  },
  {
    evidenceId: "seed-evidence-homeowners-definition",
    termId: "HomeownersInsurance",
    predicate: "definition",
    value: "Homeowners insurance covers damage to a home and its contents, plus liability for accidents on the property.",
    assertionMode: "explicit",
    provenance: {
      sourceId: "naic",
      documentId: "naic-glossary",
      url: "https://content.naic.org/consumer/glossary-terms",
      retrievedDate: "2026-08-11T00:00:00.000Z",
      location: { anchor: "#homeowners-insurance" },
      quote: "Homeowners insurance covers damage to a home and its contents, plus liability for accidents on the property."
    }
  }
];
