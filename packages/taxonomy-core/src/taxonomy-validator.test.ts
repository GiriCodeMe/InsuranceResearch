import { describe, expect, it } from "vitest";
import type { GraphClient } from "@insurance-kb/graph-client";
import type { EvidenceClient } from "@insurance-kb/evidence-client";
import { validateTaxonomySafe } from "./taxonomy-validator.js";

const throwingGraphClient: GraphClient = {
  async readGraph() {
    throw new Error("Response envelope is ambiguous: both 'data' and 'result' keys are present");
  },
  async openNodes() {
    return [];
  },
  async searchNodes() {
    return [];
  },
  async createEntities() {},
  async createRelations() {},
  async addObservations() {}
};

const emptyEvidenceClient: EvidenceClient = {
  async getEvidence() {
    return undefined;
  },
  async hasEvidence() {
    return false;
  },
  async putEvidence() {}
};

describe("validateTaxonomySafe", () => {
  it("returns a NO_GO report instead of throwing when the GraphClient fails", async () => {
    const report = await validateTaxonomySafe(throwingGraphClient, emptyEvidenceClient, {
      requestId: "req-fail-1",
      schemeId: "insurance-taxonomy-us",
      taxonomyVersion: "0.1.0"
    });

    expect(report.status).toBe("NO_GO");
    expect(report.errorCount).toBe(1);
    expect(report.issues[0].ruleId).toBe("validator.execution-error");
    expect(report.issues[0].message).toContain("ambiguous");
  });
});
