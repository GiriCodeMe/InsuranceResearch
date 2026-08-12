import type { FastifyInstance } from "fastify";
import { AddObservationsRequestSchema } from "@insurance-kb/contracts";
import type { GraphStore } from "../store/graph-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerAddObservations(app: FastifyInstance, store: GraphStore): void {
  app.post("/add_observations", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = AddObservationsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    try {
      store.addObservations(parsed.data.observations);
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : "Unknown error" });
      return;
    }
    reply.send(buildEnvelope(mode, { ok: true }));
  });
}
