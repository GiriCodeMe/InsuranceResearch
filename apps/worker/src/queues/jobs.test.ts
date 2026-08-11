import { describe, expect, it } from "vitest";
import { TaxonomyReasoningJobDataSchema, TaxonomyValidationJobDataSchema } from "./jobs.js";

describe("TaxonomyValidationJobDataSchema", () => {
  it("accepts a valid job payload", () => {
    expect(
      TaxonomyValidationJobDataSchema.parse({
        requestId: "req-1",
        schemeId: "insurance-taxonomy-us",
        taxonomyVersion: "0.1.0"
      })
    ).toEqual({ requestId: "req-1", schemeId: "insurance-taxonomy-us", taxonomyVersion: "0.1.0" });
  });

  it("rejects a payload missing requestId", () => {
    expect(() =>
      TaxonomyValidationJobDataSchema.parse({ schemeId: "insurance-taxonomy-us", taxonomyVersion: "0.1.0" })
    ).toThrow();
  });
});

describe("TaxonomyReasoningJobDataSchema", () => {
  it("accepts a valid job payload", () => {
    expect(
      TaxonomyReasoningJobDataSchema.parse({ schemeId: "insurance-taxonomy-us", taxonomyVersion: "0.1.0" })
    ).toEqual({ schemeId: "insurance-taxonomy-us", taxonomyVersion: "0.1.0" });
  });

  it("rejects an empty schemeId", () => {
    expect(() => TaxonomyReasoningJobDataSchema.parse({ schemeId: "", taxonomyVersion: "0.1.0" })).toThrow();
  });
});
