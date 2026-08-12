import { z } from "zod";
import { DateOnlySchema, IsoDateTimeSchema } from "./document.js";

/** The 8 evidence-level predicates from requirements.MD "Evidence-level predicates (MVP extraction targets)". */
export const EvidencePredicateSchema = z.enum([
  "definition",
  "altLabel",
  "broader",
  "narrower",
  "contextSignal",
  "appliesTo",
  "providesCoverageFor",
  "identifier",
  "regulatedBy",
  "definedBy"
]);
export type EvidencePredicate = z.infer<typeof EvidencePredicateSchema>;

export const ProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  documentId: z.string().min(1),
  url: z.string().url(),
  retrievedDate: IsoDateTimeSchema,
  publishedDate: DateOnlySchema.optional(),
  location: z.object({
    anchor: z.string().min(1)
  }),
  quote: z.string().min(1)
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * EvidenceRecord.assertionMode is always "explicit" — requirements.MD is explicit that
 * assertionMode is "explicit only for Source Intelligence output"; inferred statements are
 * represented downstream as InferenceRecord + TaxonomyEdge, never as an inferred EvidenceRecord.
 */
export const EvidenceRecordSchema = z.object({
  evidenceId: z.string().min(1),
  termId: z.string().min(1),
  predicate: EvidencePredicateSchema,
  value: z.string().min(1),
  assertionMode: z.literal("explicit"),
  provenance: ProvenanceSchema
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
