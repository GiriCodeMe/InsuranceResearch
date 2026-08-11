import type { CanonicalConcept, Entity, InferenceRecord, Relation, TaxonomyEdge } from "@insurance-kb/contracts";
import { conceptToEntity, edgeToRelation, inferenceRecordToEntity } from "@insurance-kb/taxonomy-core";

/**
 * The 10-concept MVP taxonomy backbone from requirements.MD, expressed as proper domain objects
 * (not just labeled placeholders) and mapped to the wire format via taxonomy-core's mapper. Every
 * seed edge is assertionMode="inferred" with a matching method="seed_skeleton" InferenceRecord
 * (confidence=0.50, status=provisional, no evidence) — exactly the seed policy governance rule 5
 * requires, so reseeding produces a graph that validateTaxonomy reports as GO.
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
  ["seed-edge-8", "PersonalAutoPolicy", "PersonalAutoInsurance"]
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
