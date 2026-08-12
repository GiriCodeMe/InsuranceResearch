/**
 * Manual demo entrypoint — runs the full pipeline in-process end to end, live:
 *   Source Intelligence Agent -> EvidenceStore -> Taxonomy Reasoning Agent
 *   -> Graph API (create_entities/create_relations) -> Validator -> report
 * Skips BullMQ (no Redis in this environment) and calls each stage directly instead.
 *
 * Run with: npx tsx scripts/run-taxonomy-pipeline-demo.ts
 */
import { buildServer as buildGraphServer } from "../apps/mock-graph-api/src/server.js";
import { buildServer as buildEvidenceServer } from "../apps/mock-evidence-store/src/server.js";
import { HttpGraphClient } from "../packages/graph-client/src/graph-client.js";
import { HttpEvidenceClient } from "../packages/evidence-client/src/evidence-client.js";
import { validateTaxonomy } from "../packages/taxonomy-core/src/taxonomy-validator.js";
import { runSourceIntelligenceAgent } from "../apps/worker/src/agents/source-intelligence/agent.js";
import { runTaxonomyReasoningAgent } from "../apps/worker/src/agents/taxonomy-reasoning/agent.js";
import { SEED_PRODUCT_LINE_TERMS } from "../apps/worker/src/agents/source-intelligence/seed/product-line-terms.js";

const SCHEME_ID = "insurance-taxonomy-us";
const TAXONOMY_VERSION = "0.1.0";

async function main(): Promise<void> {
  const graphApp = buildGraphServer();
  const evidenceApp = buildEvidenceServer();
  const graphBaseUrl = await graphApp.listen({ port: 0, host: "127.0.0.1" });
  const evidenceBaseUrl = await evidenceApp.listen({ port: 0, host: "127.0.0.1" });
  await graphApp.inject({ method: "POST", url: "/__admin/reseed" });

  const graphClient = new HttpGraphClient({ baseUrl: graphBaseUrl });
  const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

  console.log("=== Step 1: Source Intelligence Agent (live fetch) ===");
  const sourceResult = await runSourceIntelligenceAgent(evidenceClient);
  console.log(JSON.stringify(sourceResult, null, 2));

  console.log("\n=== Step 2: Taxonomy Reasoning Agent ===");
  const reasoningResult = await runTaxonomyReasoningAgent(graphClient, evidenceClient, {
    evidenceIds: sourceResult.evidenceIds,
    terms: SEED_PRODUCT_LINE_TERMS,
    schemeId: SCHEME_ID,
    taxonomyVersion: TAXONOMY_VERSION
  });
  console.log(JSON.stringify(reasoningResult, null, 2));

  console.log("\n=== Step 3: enriched concepts in the graph ===");
  const snapshot = await graphClient.readGraph();
  for (const conceptId of reasoningResult.conceptsEnriched) {
    const entity = snapshot.entities.find((e) => e.name === conceptId);
    console.log(`- ${conceptId}: ${JSON.stringify(entity?.observations)}`);
  }

  console.log("\n=== Step 4: Validator ===");
  const report = await validateTaxonomy(graphClient, evidenceClient, {
    requestId: "pipeline-demo",
    schemeId: SCHEME_ID,
    taxonomyVersion: TAXONOMY_VERSION
  });
  console.log(JSON.stringify(report, null, 2));

  await graphApp.close();
  await evidenceApp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
