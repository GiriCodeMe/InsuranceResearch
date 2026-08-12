import type { FastifyInstance } from "fastify";
import type { EvidenceStore } from "../store/evidence-store.js";
import { seedEvidenceRecords } from "../seed/insurance-evidence.js";

export function registerReseed(app: FastifyInstance, store: EvidenceStore): void {
  app.post("/__admin/reseed", async (_request, reply) => {
    store.reset();
    for (const record of seedEvidenceRecords) {
      store.put(record);
    }
    reply.send({ ok: true });
  });
}
