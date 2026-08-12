import Fastify from "fastify";
import { GraphStore } from "./store/graph-store.js";
import { registerReadGraph } from "./routes/read-graph.js";
import { registerOpenNodes } from "./routes/open-nodes.js";
import { registerSearchNodes } from "./routes/search-nodes.js";
import { registerCreateEntities } from "./routes/create-entities.js";
import { registerCreateRelations } from "./routes/create-relations.js";
import { registerAddObservations } from "./routes/add-observations.js";
import { registerReset } from "./admin/reset.js";
import { registerReseed } from "./admin/reseed.js";

export function buildServer(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const store = new GraphStore();

  registerReadGraph(app, store);
  registerOpenNodes(app, store);
  registerSearchNodes(app, store);
  registerCreateEntities(app, store);
  registerCreateRelations(app, store);
  registerAddObservations(app, store);
  registerReset(app, store);
  registerReseed(app, store);

  return app;
}

async function main(): Promise<void> {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
