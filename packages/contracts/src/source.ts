import { z } from "zod";

export const SourceTypeSchema = z.enum(["standards-body", "regulator", "industry-publication"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceSchema = z.object({
  sourceId: z.string().min(1),
  organizationName: z.string().min(1),
  sourceType: SourceTypeSchema
});
export type Source = z.infer<typeof SourceSchema>;
