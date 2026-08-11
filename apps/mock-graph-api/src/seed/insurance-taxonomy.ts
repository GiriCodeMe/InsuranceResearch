import type { Entity, Relation } from "@insurance-kb/contracts";

/**
 * The 10-concept MVP taxonomy backbone from requirements.MD, seeded as generic
 * entities/relations. Full TaxonomyEdge semantics (assertionMode, InferenceRecord
 * linkage) belong to the Taxonomy Reasoning Agent (out of scope for this mock).
 */
export const seedEntities: Entity[] = [
  { name: "CommercialInsurance", entityType: "ProductLine", observations: ["prefLabel: Commercial Insurance", "contextScope: commercial"] },
  { name: "PersonalInsurance", entityType: "ProductLine", observations: ["prefLabel: Personal Insurance", "contextScope: personal"] },
  { name: "CommercialPropertyInsurance", entityType: "ProductLine", observations: ["prefLabel: Property Insurance", "altLabel: Commercial Property Insurance", "contextScope: commercial"] },
  { name: "CommercialAutoInsurance", entityType: "ProductLine", observations: ["prefLabel: Auto Insurance", "altLabel: Commercial Auto Insurance", "contextScope: commercial"] },
  { name: "GeneralLiability", entityType: "ProductLine", observations: ["prefLabel: General Liability", "contextScope: commercial"] },
  { name: "CommercialGeneralLiability", entityType: "ProductLine", observations: ["prefLabel: Commercial General Liability", "altLabel: CGL", "contextScope: commercial"] },
  { name: "PersonalPropertyInsurance", entityType: "ProductLine", observations: ["prefLabel: Property Insurance", "altLabel: Personal Property Insurance", "contextScope: personal"] },
  { name: "HomeownersInsurance", entityType: "ProductLine", observations: ["prefLabel: Homeowners Insurance", "contextScope: personal"] },
  { name: "PersonalAutoInsurance", entityType: "ProductLine", observations: ["prefLabel: Auto Insurance", "altLabel: Personal Auto Insurance", "contextScope: personal"] },
  { name: "PersonalAutoPolicy", entityType: "ProductLine", observations: ["prefLabel: Personal Auto Insurance", "altLabel: PAP", "contextScope: personal"] }
];

export const seedRelations: Relation[] = [
  { from: "CommercialPropertyInsurance", to: "CommercialInsurance", relationType: "broader" },
  { from: "CommercialAutoInsurance", to: "CommercialInsurance", relationType: "broader" },
  { from: "GeneralLiability", to: "CommercialInsurance", relationType: "broader" },
  { from: "CommercialGeneralLiability", to: "GeneralLiability", relationType: "broader" },
  { from: "PersonalPropertyInsurance", to: "PersonalInsurance", relationType: "broader" },
  { from: "HomeownersInsurance", to: "PersonalPropertyInsurance", relationType: "broader" },
  { from: "PersonalAutoInsurance", to: "PersonalInsurance", relationType: "broader" },
  { from: "PersonalAutoPolicy", to: "PersonalAutoInsurance", relationType: "broader" }
];
