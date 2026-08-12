import type { FastifyInstance } from "fastify";
import type { GraphStore } from "../store/graph-store.js";
import { seedEntities, seedRelations } from "../seed/insurance-taxonomy.js";

export function registerReseed(app: FastifyInstance, store: GraphStore): void {
  app.post("/__admin/reseed", async (_request, reply) => {
    store.reset();
    store.createEntities(seedEntities);
    store.createRelations(seedRelations);
    reply.send({ ok: true });
  });
}
