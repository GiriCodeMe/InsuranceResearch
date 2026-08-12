import { z } from "zod";

export const SOURCE_INTELLIGENCE_QUEUE_NAME = "sourceIntelligence";
export const TAXONOMY_REASONING_QUEUE_NAME = "taxonomyReasoning";
export const TAXONOMY_VALIDATION_QUEUE_NAME = "taxonomyValidation";

export const SourceIntelligenceJobDataSchema = z.object({
  requestId: z.string().min(1)
});
export type SourceIntelligenceJobData = z.infer<typeof SourceIntelligenceJobDataSchema>;

export const TaxonomyReasoningJobDataSchema = z.object({
  schemeId: z.string().min(1),
  taxonomyVersion: z.string().min(1),
  /** Handed forward from the Source Intelligence run (or another producer) — see agent.ts's docstring. */
  evidenceIds: z.array(z.string().min(1)).default([])
});
export type TaxonomyReasoningJobData = z.infer<typeof TaxonomyReasoningJobDataSchema>;

export const TaxonomyValidationJobDataSchema = z.object({
  requestId: z.string().min(1),
  schemeId: z.string().min(1),
  taxonomyVersion: z.string().min(1)
});
export type TaxonomyValidationJobData = z.infer<typeof TaxonomyValidationJobDataSchema>;
