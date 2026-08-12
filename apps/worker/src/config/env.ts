import { z } from "zod";

const EnvSchema = z.object({
  REDIS_URL: z.string().url(),
  POSTGRES_URL: z.string().url(),

  GRAPH_API_BASE_URL: z.string().url(),
  GRAPH_READ_PATH: z.string().default("/read_graph"),
  GRAPH_OPEN_NODES_PATH: z.string().default("/open_nodes"),
  GRAPH_SEARCH_NODES_PATH: z.string().default("/search_nodes"),
  GRAPH_CREATE_ENTITIES_PATH: z.string().default("/create_entities"),
  GRAPH_CREATE_RELATIONS_PATH: z.string().default("/create_relations"),
  GRAPH_ADD_OBSERVATIONS_PATH: z.string().default("/add_observations"),

  EVIDENCE_STORE_URL: z.string().url(),

  SCHEME_ID: z.string().min(1).default("insurance-taxonomy-us"),
  TAXONOMY_VERSION: z.string().min(1).default("0.1.0"),
  VALIDATED_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.8)
});

export type Env = z.infer<typeof EnvSchema>;

/** Pass a plain object (not process.env) in tests to validate parsing without touching real env vars. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return EnvSchema.parse(source);
}
