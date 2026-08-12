import { z } from "zod";
import { ContextScopeSchema } from "./canonical-concept.js";

/** The static, seeded target vocabulary discovery/extraction is scoped to (spec.md FR-002). */
export const ProductLineTermSchema = z.object({
  termId: z.string().min(1),
  canonicalLabel: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  contextScope: ContextScopeSchema
});
export type ProductLineTerm = z.infer<typeof ProductLineTermSchema>;
