import type { FastifyInstance } from "fastify";
import { CreateRelationsRequestSchema } from "@insurance-kb/contracts";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerCreateRelations(app: FastifyInstance, store: GraphStore): void {
  app.post("/create_relations", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = CreateRelationsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    store.createRelations(parsed.data.relations);
    reply.send(buildEnvelope(mode, { ok: true }));
  });
}
