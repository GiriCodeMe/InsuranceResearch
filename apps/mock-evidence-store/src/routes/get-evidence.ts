import type { FastifyInstance } from "fastify";
import type { EvidenceStore } from "../store/evidence-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerGetEvidence(app: FastifyInstance, store: EvidenceStore): void {
  app.get("/evidence/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const mode = resolveEnvelopeMode(request.query);
    const record = store.get(id);
    if (!record) {
      reply.status(404).send({ error: `No evidence record with id ${id}` });
      return;
    }
    reply.send(buildEnvelope(mode, record));
  });
}
