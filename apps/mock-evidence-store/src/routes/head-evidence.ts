import type { FastifyInstance } from "fastify";
import type { EvidenceStore } from "../store/evidence-store.js";

export function registerHeadEvidence(app: FastifyInstance, store: EvidenceStore): void {
  app.head("/evidence/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    reply.status(store.has(id) ? 200 : 404).send();
  });
}
