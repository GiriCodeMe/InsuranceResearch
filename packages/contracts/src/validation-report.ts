import { z } from "zod";
import { IsoDateTimeSchema } from "./document.js";

export const ValidationStatusSchema = z.enum(["GO", "WARNING", "NO_GO"]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ValidationIssueSchema = z.object({
  ruleId: z.string().min(1),
  severity: z.enum(["error", "warning"]),
  message: z.string().min(1),
  edgeId: z.string().optional(),
  evidenceId: z.string().optional(),
  inferenceRecordId: z.string().optional()
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/** Persisted to Postgres validation_reports (JSONB), keyed by (requestId, schemeId, taxonomyVersion). */
export const ValidationReportSchema = z.object({
  requestId: z.string().min(1),
  schemeId: z.string().min(1),
  taxonomyVersion: z.string().min(1),
  status: ValidationStatusSchema,
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  checkedEdges: z.number().int().min(0),
  issues: z.array(ValidationIssueSchema).default([]),
  createdAt: IsoDateTimeSchema
});
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
