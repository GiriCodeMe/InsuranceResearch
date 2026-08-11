import type { FastifyInstance } from "fastify";
import type { EvidenceStore } from "../store/evidence-store.js";

export function registerReset(app: FastifyInstance, store: EvidenceStore): void {
  app.post("/__admin/reset", async (_request, reply) => {
    store.reset();
    reply.send({ ok: true });
  });
}
