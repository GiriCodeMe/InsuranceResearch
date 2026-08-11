import { z } from "zod";
import { AssertionModeSchema } from "./taxonomy-edge.js";

/**
 * Wire-level entity/relation/observation model for the Graph API contract
 * (create_entities / create_relations / add_observations / read_graph / open_nodes / search_nodes).
 * This is the generic property-graph persistence format the mock (and any real) Graph API speaks —
 * it has no notion of taxonomy semantics. Domain-level types (CanonicalConcept, TaxonomyEdge,
 * InferenceRecord) are mapped to/from this shape by packages/taxonomy-core's graph-mapping module,
 * which is where governance-rule-aware interpretation of the graph belongs.
 */
export const EntitySchema = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
  observations: z.array(z.string())
});
export type Entity = z.infer<typeof EntitySchema>;

/**
 * `from`/`to`/`relationType` are the generic property-graph edge; the remaining fields are
 * optional edge properties used only when this Relation represents a TaxonomyEdge — a plain
 * generic relation (e.g. produced outside the taxonomy domain) simply omits them.
 */
export const RelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationType: z.string().min(1),
  edgeId: z.string().min(1).optional(),
  schemeId: z.string().min(1).optional(),
  assertionMode: AssertionModeSchema.optional(),
  supportingEvidenceIds: z.array(z.string().min(1)).optional()
});
export type Relation = z.infer<typeof RelationSchema>;

export const NodeGraphSnapshotSchema = z.object({
  entities: z.array(EntitySchema),
  relations: z.array(RelationSchema)
});
export type NodeGraphSnapshot = z.infer<typeof NodeGraphSnapshotSchema>;

export const CreateEntitiesRequestSchema = z.object({ entities: z.array(EntitySchema) });
export const CreateRelationsRequestSchema = z.object({ relations: z.array(RelationSchema) });

export const AddObservationsRequestSchema = z.object({
  observations: z.array(
    z.object({
      entityName: z.string().min(1),
      contents: z.array(z.string())
    })
  )
});

export const OpenNodesRequestSchema = z.object({ names: z.array(z.string().min(1)) });
export const SearchNodesRequestSchema = z.object({ query: z.string().min(1) });
