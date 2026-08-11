import { z } from "zod";

/**
 * Wire-level entity/relation/observation model for the Graph API contract
 * (create_entities / create_relations / add_observations / read_graph / open_nodes / search_nodes).
 * This is the generic property-graph persistence format the mock (and any real) Graph API speaks.
 * Domain-level types (CanonicalConcept, TaxonomyEdge) are mapped to/from this shape by
 * packages/graph-client — the mock/real Graph API itself has no notion of taxonomy semantics.
 */
export const EntitySchema = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
  observations: z.array(z.string())
});
export type Entity = z.infer<typeof EntitySchema>;

export const RelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationType: z.string().min(1)
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
