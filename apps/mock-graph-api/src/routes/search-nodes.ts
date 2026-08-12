import type { FastifyInstance } from "fastify";
import { SearchNodesRequestSchema } from "@insurance-kb/contracts";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerSearchNodes(app: FastifyInstance, store: GraphStore): void {
  app.post("/search_nodes", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = SearchNodesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    reply.send(buildEnvelope(mode, store.searchNodes(parsed.data.query)));
  });
}
