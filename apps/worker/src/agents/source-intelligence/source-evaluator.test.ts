import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchAndEvaluate } from "./source-evaluator.js";

const source = { sourceId: "test-source", organizationName: "Test Org", sourceType: "regulator" as const };

describe("fetchAndEvaluate (against a local fixture server — no live network dependency)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/ok") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html><body><h1>OK</h1></body></html>");
      } else if (req.url === "/not-found") {
        res.writeHead(404).end("not found");
      } else if (req.url === "/empty") {
        res.writeHead(200).end("");
      } else {
        res.writeHead(500).end("error");
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address !== "object" || address === null) throw new Error("failed to bind test server");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns status=ok with the response body for a successful fetch", async () => {
    const result = await fetchAndEvaluate({ source, documentId: "doc-ok", url: `${baseUrl}/ok`, termIds: [] });
    expect(result.status).toBe("ok");
    expect(result.html).toContain("<h1>OK</h1>");
  });

  it("returns status=error for a non-2xx response, without throwing", async () => {
    const result = await fetchAndEvaluate({ source, documentId: "doc-404", url: `${baseUrl}/not-found`, termIds: [] });
    expect(result.status).toBe("error");
    expect(result.reason).toContain("404");
  });

  it("returns status=error for an empty response body", async () => {
    const result = await fetchAndEvaluate({ source, documentId: "doc-empty", url: `${baseUrl}/empty`, termIds: [] });
    expect(result.status).toBe("error");
    expect(result.reason).toContain("empty");
  });

  it("returns status=unreachable for a connection that can't be made, without throwing", async () => {
    const result = await fetchAndEvaluate({
      source,
      documentId: "doc-unreachable",
      url: "http://127.0.0.1:1",
      termIds: []
    });
    expect(result.status).toBe("unreachable");
    expect(result.reason).toBeTruthy();
  });
});
