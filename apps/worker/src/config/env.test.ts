import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const baseEnv = {
  REDIS_URL: "redis://localhost:6379",
  POSTGRES_URL: "postgres://postgres:postgres@localhost:5432/insurance_taxonomy",
  GRAPH_API_BASE_URL: "http://localhost:4000",
  EVIDENCE_STORE_URL: "http://localhost:4001"
};

describe("loadEnv", () => {
  it("applies defaults for optional fields", () => {
    const env = loadEnv(baseEnv);
    expect(env.GRAPH_READ_PATH).toBe("/read_graph");
    expect(env.SCHEME_ID).toBe("insurance-taxonomy-us");
    expect(env.TAXONOMY_VERSION).toBe("0.1.0");
    expect(env.VALIDATED_MIN_CONFIDENCE).toBe(0.8);
  });

  it("coerces VALIDATED_MIN_CONFIDENCE from a string env var", () => {
    const env = loadEnv({ ...baseEnv, VALIDATED_MIN_CONFIDENCE: "0.95" });
    expect(env.VALIDATED_MIN_CONFIDENCE).toBe(0.95);
  });

  it("throws when a required URL is missing", () => {
    const { REDIS_URL: _REDIS_URL, ...withoutRedis } = baseEnv;
    expect(() => loadEnv(withoutRedis)).toThrow();
  });

  it("throws when VALIDATED_MIN_CONFIDENCE is out of range", () => {
    expect(() => loadEnv({ ...baseEnv, VALIDATED_MIN_CONFIDENCE: "1.5" })).toThrow();
  });
});
