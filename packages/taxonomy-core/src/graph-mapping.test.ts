import { describe, expect, it } from "vitest";
import type { CanonicalConcept, InferenceRecord, TaxonomyEdge } from "@insurance-kb/contracts";
import {
  conceptToEntity,
  edgeToRelation,
  entityToConcept,
  entityToInferenceRecord,
  inferenceRecordToEntity,
  relationToEdge,
  toDomainSnapshot
} from "./graph-mapping.js";

describe("graph-mapping", () => {
  it("round-trips a CanonicalConcept through Entity", () => {
    const concept: CanonicalConcept = {
      conceptId: "CommercialGeneralLiability",
      prefLabel: "Commercial General Liability",
      altLabels: ["CGL"],
      contextScope: "commercial",
      definition: "Covers third-party bodily injury and property damage."
    };
    expect(entityToConcept(conceptToEntity(concept))).toEqual(concept);
  });

  it("entityToConcept returns undefined for a non-ProductLine entity", () => {
    expect(entityToConcept({ name: "inf-1", entityType: "InferenceRecord", observations: [] })).toBeUndefined();
  });

  it("round-trips a TaxonomyEdge through Relation", () => {
    const edge: TaxonomyEdge = {
      edgeId: "edge-1",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader",
      objectConceptId: "GL",
      assertionMode: "explicit",
      supportingEvidenceIds: ["ev-1"]
    };
    expect(relationToEdge(edgeToRelation(edge))).toEqual(edge);
  });

  it("relationToEdge returns undefined for a plain relation with no edge properties", () => {
    expect(relationToEdge({ from: "A", to: "B", relationType: "broader" })).toBeUndefined();
  });

  it("round-trips an InferenceRecord through Entity", () => {
    const record: InferenceRecord = {
      inferenceRecordId: "inf-1",
      edgeId: "edge-1",
      method: "seed_skeleton",
      status: "provisional",
      confidence: 0.5,
      supportingEvidenceIds: []
    };
    expect(entityToInferenceRecord(inferenceRecordToEntity(record))).toEqual(record);
  });

  it("toDomainSnapshot separates concepts, edges, and inference records from a mixed wire snapshot", () => {
    const concept: CanonicalConcept = {
      conceptId: "GL",
      prefLabel: "General Liability",
      altLabels: [],
      contextScope: "commercial"
    };
    const edge: TaxonomyEdge = {
      edgeId: "edge-1",
      schemeId: "insurance-taxonomy-us",
      subjectConceptId: "CGL",
      predicate: "broader",
      objectConceptId: "GL",
      assertionMode: "inferred",
      supportingEvidenceIds: []
    };
    const inferenceRecord: InferenceRecord = {
      inferenceRecordId: "inf-1",
      edgeId: "edge-1",
      method: "seed_skeleton",
      status: "provisional",
      confidence: 0.5,
      supportingEvidenceIds: []
    };

    const snapshot = toDomainSnapshot(
      {
        entities: [conceptToEntity(concept), inferenceRecordToEntity(inferenceRecord)],
        relations: [edgeToRelation(edge)]
      },
      "insurance-taxonomy-us",
      "0.1.0"
    );

    expect(snapshot.concepts).toEqual([concept]);
    expect(snapshot.edges).toEqual([edge]);
    expect(snapshot.inferenceRecords).toEqual([inferenceRecord]);
  });
});
