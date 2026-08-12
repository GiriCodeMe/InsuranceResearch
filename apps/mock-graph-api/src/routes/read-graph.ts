import type { FastifyInstance } from "fastify";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerReadGraph(app: FastifyInstance, store: GraphStore): void {
  app.post("/read_graph", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    reply.send(buildEnvelope(mode, store.readGraph()));
  });
}
