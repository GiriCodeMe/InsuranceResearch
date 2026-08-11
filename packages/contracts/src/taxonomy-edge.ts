import { z } from "zod";

export const EdgePredicateSchema = z.enum(["broader", "narrower", "related"]);
export type EdgePredicate = z.infer<typeof EdgePredicateSchema>;

export const AssertionModeSchema = z.enum(["explicit", "inferred"]);
export type AssertionMode = z.infer<typeof AssertionModeSchema>;

/** Owned/written by the Taxonomy Reasoning Agent; defined here as shared schema. */
export const TaxonomyEdgeSchema = z.object({
  edgeId: z.string().min(1),
  schemeId: z.string().min(1),
  subjectConceptId: z.string().min(1),
  predicate: EdgePredicateSchema,
  objectConceptId: z.string().min(1),
  assertionMode: AssertionModeSchema,
  supportingEvidenceIds: z.array(z.string().min(1)).default([])
});
export type TaxonomyEdge = z.infer<typeof TaxonomyEdgeSchema>;
