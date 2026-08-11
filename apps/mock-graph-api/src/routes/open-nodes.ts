import type { FastifyInstance } from "fastify";
import { OpenNodesRequestSchema } from "@insurance-kb/contracts";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerOpenNodes(app: FastifyInstance, store: GraphStore): void {
  app.post("/open_nodes", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = OpenNodesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    reply.send(buildEnvelope(mode, store.openNodes(parsed.data.names)));
  });
}
