import { z } from "zod";

/** Date-only, YYYY-MM-DD, per requirements.MD timestamp strictness rules. */
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD date-only string");

/** Full ISO 8601 datetime string, per requirements.MD timestamp strictness rules. */
export const IsoDateTimeSchema = z.string().datetime();

export const FetchStatusSchema = z.enum(["ok", "unreachable", "error"]);
export type FetchStatus = z.infer<typeof FetchStatusSchema>;

export const DocumentSchema = z.object({
  documentId: z.string().min(1),
  sourceId: z.string().min(1),
  url: z.string().url(),
  publishedDate: DateOnlySchema.optional(),
  retrievedDate: IsoDateTimeSchema,
  fetchStatus: FetchStatusSchema
});
export type Document = z.infer<typeof DocumentSchema>;
