import { z } from "zod";
import { EvidencePredicateSchema } from "./evidence-record.js";

/**
 * An extractor's raw, pre-evidence output for a single (Chunk, product-line term) pair.
 * Kept distinct from EvidenceRecord so "did we find a candidate claim" can be unit-tested
 * separately from "did we build a valid, provenance-complete EvidenceRecord from it."
 * A candidate with explicit=false must never be promoted to an EvidenceRecord (FR-003).
 */
export const ConceptCandidateSchema = z.object({
  termId: z.string().min(1),
  predicate: EvidencePredicateSchema,
  rawValue: z.string().min(1),
  chunkId: z.string().min(1),
  explicit: z.boolean()
});
export type ConceptCandidate = z.infer<typeof ConceptCandidateSchema>;
