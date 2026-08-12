import type { FastifyInstance } from "fastify";
import type { GraphStore } from "../store/graph-store.js";

export function registerReset(app: FastifyInstance, store: GraphStore): void {
  app.post("/__admin/reset", async (_request, reply) => {
    store.reset();
    reply.send({ ok: true });
  });
}
