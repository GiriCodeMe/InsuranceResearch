import { z } from "zod";
import { CanonicalConceptSchema } from "./canonical-concept.js";
import { TaxonomyEdgeSchema } from "./taxonomy-edge.js";
import { InferenceRecordSchema } from "./inference-record.js";

/** Full snapshot returned by the Graph API's /read_graph endpoint. */
export const GraphSnapshotSchema = z.object({
  schemeId: z.string().min(1),
  taxonomyVersion: z.string().min(1),
  concepts: z.array(CanonicalConceptSchema),
  edges: z.array(TaxonomyEdgeSchema),
  inferenceRecords: z.array(InferenceRecordSchema)
});
export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;
