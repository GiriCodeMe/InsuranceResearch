import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../apps/mock-graph-api/src/server.js";

describe("mock-graph-api", () => {
  const app = buildServer();

  beforeEach(async () => {
    await app.inject({ method: "POST", url: "/__admin/reset" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates entities and reads them back via read_graph (raw envelope)", async () => {
    await app.inject({
      method: "POST",
      url: "/create_entities?envelope=raw",
      payload: { entities: [{ name: "CGL", entityType: "ProductLine", observations: ["prefLabel: CGL"] }] }
    });

    const res = await app.inject({ method: "POST", url: "/read_graph?envelope=raw" });
    const body = JSON.parse(res.body);
    expect(body.entities).toHaveLength(1);
    expect(body.entities[0].name).toBe("CGL");
  });

  it("supports the { data } envelope for a mutation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/create_entities?envelope=data",
      payload: { entities: [{ name: "GL", entityType: "ProductLine", observations: [] }] }
    });
    expect(JSON.parse(res.body)).toEqual({ data: { ok: true } });
  });

  it("supports the { result } envelope for a mutation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/create_entities?envelope=result",
      payload: { entities: [{ name: "PAP", entityType: "ProductLine", observations: [] }] }
    });
    expect(JSON.parse(res.body)).toEqual({ result: { ok: true } });
  });

  it("open_nodes returns only requested, existing entities", async () => {
    await app.inject({
      method: "POST",
      url: "/create_entities",
      payload: {
        entities: [
          { name: "A", entityType: "ProductLine", observations: [] },
          { name: "B", entityType: "ProductLine", observations: [] }
        ]
      }
    });
    const res = await app.inject({ method: "POST", url: "/open_nodes", payload: { names: ["A", "missing"] } });
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("A");
  });

  it("reseed loads the 10-concept MVP taxonomy backbone with its 8 seed_skeleton inference records", async () => {
    await app.inject({ method: "POST", url: "/__admin/reseed" });
    const res = await app.inject({ method: "POST", url: "/read_graph" });
    const body = JSON.parse(res.body);
    const concepts = body.entities.filter((e: { entityType: string }) => e.entityType === "ProductLine");
    const inferenceRecords = body.entities.filter((e: { entityType: string }) => e.entityType === "InferenceRecord");
    expect(concepts).toHaveLength(10);
    expect(inferenceRecords).toHaveLength(8);
    expect(body.relations).toHaveLength(8);
  });

  it("negative test: an ambiguous envelope response is itself a valid mock behavior for fault injection", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/create_entities?envelope=ambiguous",
      payload: { entities: [{ name: "Ambig", entityType: "ProductLine", observations: [] }] }
    });
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("result");
  });
});
