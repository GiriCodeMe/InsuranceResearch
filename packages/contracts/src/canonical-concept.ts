import { z } from "zod";

export const ContextScopeSchema = z.enum(["commercial", "personal", "both"]);
export type ContextScope = z.infer<typeof ContextScopeSchema>;

/**
 * Canonical taxonomy concept (product line only, per requirements.MD MVP boundary).
 * Owned/written by the Taxonomy Reasoning Agent, not by Source Intelligence — defined here
 * because packages/contracts is the single shared schema source for the whole pipeline.
 */
export const CanonicalConceptSchema = z.object({
  conceptId: z.string().min(1),
  prefLabel: z.string().min(1),
  altLabels: z.array(z.string().min(1)).default([]),
  contextScope: ContextScopeSchema,
  definition: z.string().optional()
});
export type CanonicalConcept = z.infer<typeof CanonicalConceptSchema>;
