import type { AddObservationsRequestSchema, Entity, NodeGraphSnapshot, Relation } from "@insurance-kb/contracts";
import type { z } from "zod";

export interface GraphClientConfig {
  baseUrl: string;
  paths?: Partial<GraphClientPaths>;
}

export interface GraphClientPaths {
  readGraph: string;
  openNodes: string;
  searchNodes: string;
  createEntities: string;
  createRelations: string;
  addObservations: string;
}

export const DEFAULT_GRAPH_CLIENT_PATHS: GraphClientPaths = {
  readGraph: "/read_graph",
  openNodes: "/open_nodes",
  searchNodes: "/search_nodes",
  createEntities: "/create_entities",
  createRelations: "/create_relations",
  addObservations: "/add_observations"
};

/** Interface, not implementation — a real Graph API can implement this without touching callers. */
export interface GraphClient {
  readGraph(): Promise<NodeGraphSnapshot>;
  openNodes(names: string[]): Promise<Entity[]>;
  searchNodes(query: string): Promise<Entity[]>;
  createEntities(entities: Entity[]): Promise<void>;
  createRelations(relations: Relation[]): Promise<void>;
  addObservations(observations: z.infer<typeof AddObservationsRequestSchema>["observations"]): Promise<void>;
}
