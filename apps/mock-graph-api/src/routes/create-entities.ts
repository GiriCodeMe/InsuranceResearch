import type { FastifyInstance } from "fastify";
import { CreateEntitiesRequestSchema } from "@insurance-kb/contracts";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerCreateEntities(app: FastifyInstance, store: GraphStore): void {
  app.post("/create_entities", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = CreateEntitiesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    store.createEntities(parsed.data.entities);
    reply.send(buildEnvelope(mode, { ok: true }));
  });
}
