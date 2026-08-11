import {
  CanonicalConceptSchema,
  ContextScopeSchema,
  GraphSnapshotSchema,
  InferenceRecordSchema,
  TaxonomyEdgeSchema,
  type CanonicalConcept,
  type Entity,
  type GraphSnapshot,
  type InferenceRecord,
  type NodeGraphSnapshot,
  type Relation,
  type TaxonomyEdge
} from "@insurance-kb/contracts";

/**
 * Observations are "key: value" strings by convention (a key may repeat, e.g. multiple altLabels).
 * This is the only place that convention is encoded/decoded — everywhere else deals in domain types.
 */
function parseObservations(observations: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const observation of observations) {
    const separatorIndex = observation.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = observation.slice(0, separatorIndex).trim();
    const value = observation.slice(separatorIndex + 1).trim();
    const values = map.get(key) ?? [];
    values.push(value);
    map.set(key, values);
  }
  return map;
}

export function conceptToEntity(concept: CanonicalConcept): Entity {
  const observations = [
    `prefLabel: ${concept.prefLabel}`,
    `contextScope: ${concept.contextScope}`,
    ...concept.altLabels.map((label) => `altLabel: ${label}`)
  ];
  if (concept.definition) {
    observations.push(`definition: ${concept.definition}`);
  }
  return { name: concept.conceptId, entityType: "ProductLine", observations };
}

/** Returns undefined (not an error) for entities that simply aren't ProductLine concepts. */
export function entityToConcept(entity: Entity): CanonicalConcept | undefined {
  if (entity.entityType !== "ProductLine") return undefined;
  const observations = parseObservations(entity.observations);
  const prefLabel = observations.get("prefLabel")?.[0];
  if (!prefLabel) return undefined;

  const contextScopeRaw = observations.get("contextScope")?.[0];
  const contextScopeParsed = ContextScopeSchema.safeParse(contextScopeRaw);

  return CanonicalConceptSchema.parse({
    conceptId: entity.name,
    prefLabel,
    altLabels: observations.get("altLabel") ?? [],
    contextScope: contextScopeParsed.success ? contextScopeParsed.data : "both",
    definition: observations.get("definition")?.[0]
  });
}

export function edgeToRelation(edge: TaxonomyEdge): Relation {
  return {
    from: edge.subjectConceptId,
    to: edge.objectConceptId,
    relationType: edge.predicate,
    edgeId: edge.edgeId,
    schemeId: edge.schemeId,
    assertionMode: edge.assertionMode,
    supportingEvidenceIds: edge.supportingEvidenceIds
  };
}

/** Returns undefined (not an error) for relations that don't carry TaxonomyEdge properties. */
export function relationToEdge(relation: Relation): TaxonomyEdge | undefined {
  if (!relation.edgeId || !relation.schemeId || !relation.assertionMode) return undefined;
  return TaxonomyEdgeSchema.parse({
    edgeId: relation.edgeId,
    schemeId: relation.schemeId,
    subjectConceptId: relation.from,
    predicate: relation.relationType,
    objectConceptId: relation.to,
    assertionMode: relation.assertionMode,
    supportingEvidenceIds: relation.supportingEvidenceIds ?? []
  });
}

export function inferenceRecordToEntity(record: InferenceRecord): Entity {
  return {
    name: record.inferenceRecordId,
    entityType: "InferenceRecord",
    observations: [
      `edgeId: ${record.edgeId}`,
      `method: ${record.method}`,
      `status: ${record.status}`,
      `confidence: ${record.confidence}`,
      ...record.supportingEvidenceIds.map((id) => `supportingEvidenceId: ${id}`)
    ]
  };
}

/** Returns undefined (not an error) for entities that simply aren't InferenceRecords. */
export function entityToInferenceRecord(entity: Entity): InferenceRecord | undefined {
  if (entity.entityType !== "InferenceRecord") return undefined;
  const observations = parseObservations(entity.observations);
  const edgeId = observations.get("edgeId")?.[0];
  const method = observations.get("method")?.[0];
  const status = observations.get("status")?.[0];
  const confidenceRaw = observations.get("confidence")?.[0];
  if (!edgeId || !method || !status || confidenceRaw === undefined) return undefined;

  return InferenceRecordSchema.parse({
    inferenceRecordId: entity.name,
    edgeId,
    method,
    status,
    confidence: Number(confidenceRaw),
    supportingEvidenceIds: observations.get("supportingEvidenceId") ?? []
  });
}

/** Interprets a wire-level NodeGraphSnapshot as the domain-level GraphSnapshot the validator operates on. */
export function toDomainSnapshot(
  snapshot: NodeGraphSnapshot,
  schemeId: string,
  taxonomyVersion: string
): GraphSnapshot {
  const concepts: CanonicalConcept[] = [];
  const inferenceRecords: InferenceRecord[] = [];
  for (const entity of snapshot.entities) {
    const concept = entityToConcept(entity);
    if (concept) concepts.push(concept);
    const inferenceRecord = entityToInferenceRecord(entity);
    if (inferenceRecord) inferenceRecords.push(inferenceRecord);
  }

  const edges: TaxonomyEdge[] = [];
  for (const relation of snapshot.relations) {
    const edge = relationToEdge(relation);
    if (edge) edges.push(edge);
  }

  return GraphSnapshotSchema.parse({ schemeId, taxonomyVersion, concepts, edges, inferenceRecords });
}
