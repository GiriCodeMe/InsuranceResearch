import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../apps/mock-graph-api/src/server.js";
import { HttpGraphClient } from "../../packages/graph-client/src/graph-client.js";

describe("HttpGraphClient against a live mock-graph-api", () => {
  const app = buildServer();
  let baseUrl: string;

  beforeEach(async () => {
    if (!baseUrl) {
      const address = await app.listen({ port: 0, host: "127.0.0.1" });
      baseUrl = address;
    }
    await app.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates entities and relations, then reads them back", async () => {
    const client = new HttpGraphClient({ baseUrl });
    await client.createEntities([{ name: "CGL", entityType: "ProductLine", observations: ["prefLabel: CGL"] }]);
    await client.createEntities([{ name: "GL", entityType: "ProductLine", observations: [] }]);
    await client.createRelations([{ from: "CGL", to: "GL", relationType: "broader" }]);

    const snapshot = await client.readGraph();
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.relations).toHaveLength(1);
  });

  it("openNodes returns only the requested, existing entities", async () => {
    const client = new HttpGraphClient({ baseUrl });
    await client.createEntities([{ name: "A", entityType: "ProductLine", observations: [] }]);
    const found = await client.openNodes(["A", "missing"]);
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("A");
  });

  it("searchNodes matches on observations", async () => {
    const client = new HttpGraphClient({ baseUrl });
    await client.createEntities([{ name: "Homeowners", entityType: "ProductLine", observations: ["prefLabel: Homeowners Insurance"] }]);
    const found = await client.searchNodes("Homeowners");
    expect(found.map((e) => e.name)).toContain("Homeowners");
  });

  it("addObservations appends to an existing entity", async () => {
    const client = new HttpGraphClient({ baseUrl });
    await client.createEntities([{ name: "PAP", entityType: "ProductLine", observations: [] }]);
    await client.addObservations([{ entityName: "PAP", contents: ["altLabel: Personal Auto Policy"] }]);
    const [entity] = await client.openNodes(["PAP"]);
    expect(entity.observations).toContain("altLabel: Personal Auto Policy");
  });

  it("throws GraphApiHttpError on a non-2xx response", async () => {
    const client = new HttpGraphClient({ baseUrl });
    await expect(client.addObservations([{ entityName: "does-not-exist", contents: ["x"] }])).rejects.toThrow();
  });

  it("throws on an ambiguous envelope response", async () => {
    const client = new HttpGraphClient({ baseUrl, paths: { readGraph: "/read_graph?envelope=ambiguous" } });
    await expect(client.readGraph()).rejects.toThrow();
  });
});
