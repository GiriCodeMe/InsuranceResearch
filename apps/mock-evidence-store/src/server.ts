import Fastify from "fastify";
import { EvidenceStore } from "./store/evidence-store.js";
import { registerGetEvidence } from "./routes/get-evidence.js";
import { registerHeadEvidence } from "./routes/head-evidence.js";
import { registerPostEvidence } from "./routes/post-evidence.js";
import { registerReset } from "./admin/reset.js";
import { registerReseed } from "./admin/reseed.js";

export function buildServer(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const store = new EvidenceStore();

  registerGetEvidence(app, store);
  registerHeadEvidence(app, store);
  registerPostEvidence(app, store);
  registerReset(app, store);
  registerReseed(app, store);

  return app;
}

async function main(): Promise<void> {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4001);
  await app.listen({ port, host: "0.0.0.0" });
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
