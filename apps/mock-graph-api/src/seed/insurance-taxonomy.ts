import type { CanonicalConcept, Entity, InferenceRecord, Relation, TaxonomyEdge } from "@insurance-kb/contracts";
import { conceptToEntity, edgeToRelation, inferenceRecordToEntity } from "@insurance-kb/taxonomy-core";

/**
 * The MVP taxonomy backbone: the original 10-concept Commercial/Personal P&C set from
 * requirements.MD, plus 4 additional standalone top-level lines of business (Life Insurance,
 * Group Benefits, Pet Insurance, Crop Insurance — see product-line-terms.ts for why they're
 * standalone rather than nested under Commercial/Personal), plus 6 Group Benefits sub-lines
 * (Group Health Benefits -> Medical/Vision/Dental, Group Disability Benefits, Group Life
 * Benefits). Expressed as proper domain objects (not just labeled placeholders) and mapped to the
 * wire format via taxonomy-core's mapper. Every seed edge is assertionMode="inferred" with a
 * matching method="seed_skeleton" InferenceRecord (confidence=0.50, status=provisional, no
 * evidence) — exactly the seed policy governance rule 5 requires, so reseeding produces a graph
 * that validateTaxonomy reports as GO. Life/Group Benefits/Pet/Crop themselves have no seed edges
 * — they're new top-level concepts with no fabricated hierarchy underneath.
 */
export const SEED_SCHEME_ID = "insurance-taxonomy-us";

export const seedConcepts: CanonicalConcept[] = [
  { conceptId: "CommercialInsurance", prefLabel: "Commercial Insurance", altLabels: [], contextScope: "commercial" },
  { conceptId: "PersonalInsurance", prefLabel: "Personal Insurance", altLabels: [], contextScope: "personal" },
  {
    conceptId: "CommercialPropertyInsurance",
    prefLabel: "Property Insurance",
    altLabels: ["Commercial Property Insurance"],
    contextScope: "commercial"
  },
  {
    conceptId: "CommercialAutoInsurance",
    prefLabel: "Auto Insurance",
    altLabels: ["Commercial Auto Insurance"],
    contextScope: "commercial"
  },
  { conceptId: "GeneralLiability", prefLabel: "General Liability", altLabels: [], contextScope: "commercial" },
  {
    conceptId: "CommercialGeneralLiability",
    prefLabel: "Commercial General Liability",
    altLabels: ["CGL"],
    contextScope: "commercial"
  },
  {
    conceptId: "PersonalPropertyInsurance",
    prefLabel: "Property Insurance",
    altLabels: ["Personal Property Insurance"],
    contextScope: "personal"
  },
  { conceptId: "HomeownersInsurance", prefLabel: "Homeowners Insurance", altLabels: [], contextScope: "personal" },
  {
    conceptId: "PersonalAutoInsurance",
    prefLabel: "Auto Insurance",
    altLabels: ["Personal Auto Insurance"],
    contextScope: "personal"
  },
  {
    conceptId: "PersonalAutoPolicy",
    prefLabel: "Personal Auto Insurance",
    altLabels: ["PAP"],
    contextScope: "personal"
  },
  // Additional top-level lines of business, modeled as standalone segments (contextScope "both")
  // rather than forced under Commercial/Personal — see product-line-terms.ts for the rationale.
  { conceptId: "LifeInsurance", prefLabel: "Life Insurance", altLabels: [], contextScope: "both" },
  {
    conceptId: "GroupBenefits",
    prefLabel: "Group Benefits",
    altLabels: ["Group Insurance", "Employee Benefits"],
    contextScope: "both"
  },
  { conceptId: "PetInsurance", prefLabel: "Pet Insurance", altLabels: ["Pet Health Insurance"], contextScope: "both" },
  {
    conceptId: "CropInsurance",
    prefLabel: "Crop Insurance",
    altLabels: ["Multi-Peril Crop Insurance", "MPCI"],
    contextScope: "both"
  },
  // Group Benefits sub-lines (per the employer-sponsored-benefits hierarchy: Health [Medical,
  // Vision, Dental], Disability, Life). contextScope "commercial" — see product-line-terms.ts.
  { conceptId: "GroupHealthBenefits", prefLabel: "Group Health Benefits", altLabels: [], contextScope: "commercial" },
  { conceptId: "GroupMedicalBenefits", prefLabel: "Group Medical Benefits", altLabels: [], contextScope: "commercial" },
  { conceptId: "GroupVisionBenefits", prefLabel: "Group Vision Benefits", altLabels: [], contextScope: "commercial" },
  { conceptId: "GroupDentalBenefits", prefLabel: "Group Dental Benefits", altLabels: [], contextScope: "commercial" },
  {
    conceptId: "GroupDisabilityBenefits",
    prefLabel: "Group Disability Benefits",
    altLabels: [],
    contextScope: "commercial"
  },
  {
    conceptId: "GroupLifeBenefits",
    prefLabel: "Group Life Benefits",
    altLabels: ["Group-Term Life Insurance", "Group Term Life Insurance"],
    contextScope: "commercial"
  }
];

const seedEdgeTriples: Array<[edgeId: string, subjectConceptId: string, objectConceptId: string]> = [
  ["seed-edge-1", "CommercialPropertyInsurance", "CommercialInsurance"],
  ["seed-edge-2", "CommercialAutoInsurance", "CommercialInsurance"],
  ["seed-edge-3", "GeneralLiability", "CommercialInsurance"],
  ["seed-edge-4", "CommercialGeneralLiability", "GeneralLiability"],
  ["seed-edge-5", "PersonalPropertyInsurance", "PersonalInsurance"],
  ["seed-edge-6", "HomeownersInsurance", "PersonalPropertyInsurance"],
  ["seed-edge-7", "PersonalAutoInsurance", "PersonalInsurance"],
  ["seed-edge-8", "PersonalAutoPolicy", "PersonalAutoInsurance"],
  ["seed-edge-9", "GroupHealthBenefits", "GroupBenefits"],
  ["seed-edge-10", "GroupMedicalBenefits", "GroupHealthBenefits"],
  ["seed-edge-11", "GroupVisionBenefits", "GroupHealthBenefits"],
  ["seed-edge-12", "GroupDentalBenefits", "GroupHealthBenefits"],
  ["seed-edge-13", "GroupDisabilityBenefits", "GroupBenefits"],
  ["seed-edge-14", "GroupLifeBenefits", "GroupBenefits"]
];

export const seedEdges: TaxonomyEdge[] = seedEdgeTriples.map(([edgeId, subjectConceptId, objectConceptId]) => ({
  edgeId,
  schemeId: SEED_SCHEME_ID,
  subjectConceptId,
  predicate: "broader",
  objectConceptId,
  assertionMode: "inferred",
  supportingEvidenceIds: []
}));

export const seedInferenceRecords: InferenceRecord[] = seedEdges.map((edge) => ({
  inferenceRecordId: `${edge.edgeId}-seed-inference`,
  edgeId: edge.edgeId,
  method: "seed_skeleton",
  status: "provisional",
  confidence: 0.5,
  supportingEvidenceIds: []
}));

export const seedEntities: Entity[] = [...seedConcepts.map(conceptToEntity), ...seedInferenceRecords.map(inferenceRecordToEntity)];
export const seedRelations: Relation[] = seedEdges.map(edgeToRelation);
