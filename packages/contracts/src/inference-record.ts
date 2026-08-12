import { z } from "zod";

/**
 * "heuristic_placement" is the Taxonomy Reasoning Agent's deterministic fallback: when a concept
 * has no edge at all yet, place it under its top-level context concept (Commercial/Personal
 * Insurance) using the term's known contextScope — no LLM involved in this MVP (research.md).
 */
export const InferenceMethodSchema = z.enum(["seed_skeleton", "llm_inference", "heuristic_placement"]);
export type InferenceMethod = z.infer<typeof InferenceMethodSchema>;

export const InferenceStatusSchema = z.enum(["provisional", "validated"]);
export type InferenceStatus = z.infer<typeof InferenceStatusSchema>;

/**
 * Exists only for inferred TaxonomyEdges (governance rule 1 in requirements.MD).
 * method="seed_skeleton" implies confidence=0.50, status="provisional", supportingEvidenceIds=[].
 * Owned/written by the Taxonomy Reasoning Agent; defined here as shared schema.
 */
export const InferenceRecordSchema = z.object({
  inferenceRecordId: z.string().min(1),
  edgeId: z.string().min(1),
  method: InferenceMethodSchema,
  status: InferenceStatusSchema,
  confidence: z.number().min(0).max(1),
  supportingEvidenceIds: z.array(z.string().min(1)).default([])
});
export type InferenceRecord = z.infer<typeof InferenceRecordSchema>;
