import {
  AddObservationsRequestSchema,
  CreateEntitiesRequestSchema,
  CreateRelationsRequestSchema,
  type Entity,
  EntitySchema,
  NodeGraphSnapshotSchema,
  OpenNodesRequestSchema,
  SearchNodesRequestSchema,
  type Relation
} from "@insurance-kb/contracts";
import { z } from "zod";
import { postAndUnwrap, postAndUnwrapMutation } from "./envelopes.js";
import { DEFAULT_GRAPH_CLIENT_PATHS, type GraphClient, type GraphClientConfig, type GraphClientPaths } from "./types.js";

const EntityArraySchema = z.array(EntitySchema);

export class HttpGraphClient implements GraphClient {
  private readonly paths: GraphClientPaths;

  constructor(private readonly config: GraphClientConfig) {
    this.paths = { ...DEFAULT_GRAPH_CLIENT_PATHS, ...config.paths };
  }

  private url(path: string): string {
    return new URL(path, this.config.baseUrl).toString();
  }

  async readGraph() {
    return postAndUnwrap(this.url(this.paths.readGraph), {}, NodeGraphSnapshotSchema);
  }

  async openNodes(names: string[]): Promise<Entity[]> {
    const body = OpenNodesRequestSchema.parse({ names });
    return postAndUnwrap(this.url(this.paths.openNodes), body, EntityArraySchema);
  }

  async searchNodes(query: string): Promise<Entity[]> {
    const body = SearchNodesRequestSchema.parse({ query });
    return postAndUnwrap(this.url(this.paths.searchNodes), body, EntityArraySchema);
  }

  async createEntities(entities: Entity[]): Promise<void> {
    const body = CreateEntitiesRequestSchema.parse({ entities });
    return postAndUnwrapMutation(this.url(this.paths.createEntities), body);
  }

  async createRelations(relations: Relation[]): Promise<void> {
    const body = CreateRelationsRequestSchema.parse({ relations });
    return postAndUnwrapMutation(this.url(this.paths.createRelations), body);
  }

  async addObservations(
    observations: z.infer<typeof AddObservationsRequestSchema>["observations"]
  ): Promise<void> {
    const body = AddObservationsRequestSchema.parse({ observations });
    return postAndUnwrapMutation(this.url(this.paths.addObservations), body);
  }
}
