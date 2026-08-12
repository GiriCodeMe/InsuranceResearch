import type { FastifyInstance } from "fastify";
import { EvidenceRecordSchema } from "@insurance-kb/contracts";
import type { EvidenceStore } from "../store/evidence-store.js";
import { buildEnvelope, resolveEnvelopeMode } from "../envelope.js";

export function registerPostEvidence(app: FastifyInstance, store: EvidenceStore): void {
  app.post("/evidence", async (request, reply) => {
    const mode = resolveEnvelopeMode(request.query);
    const parsed = EvidenceRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: "Invalid EvidenceRecord", issues: parsed.error.issues });
      return;
    }
    store.put(parsed.data);
    reply.status(201).send(buildEnvelope(mode, { ok: true }));
  });
}
