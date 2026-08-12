/**
 * Manual demo entrypoint — not part of the queue-driven production path (that's
 * apps/worker/src/workers/source-intelligence.worker.ts, which needs a live Redis this
 * environment doesn't have). Spins up the mock EvidenceStore in-process, runs the agent against
 * the real seed URLs (live internet), and prints what it found.
 *
 * Run with: npx tsx scripts/run-source-intelligence-demo.ts
 */
import { buildServer } from "../apps/mock-evidence-store/src/server.js";
import { HttpEvidenceClient } from "../packages/evidence-client/src/evidence-client.js";
import { runSourceIntelligenceAgent } from "../apps/worker/src/agents/source-intelligence/agent.js";
import { SEED_PRODUCT_LINE_TERMS } from "../apps/worker/src/agents/source-intelligence/seed/product-line-terms.js";
import { DEFAULT_SEED_DOCUMENTS } from "../apps/worker/src/agents/source-intelligence/seed/seed-sources.js";
import { planSourceIntelligenceRun } from "../apps/worker/src/agents/source-intelligence/planner.js";
import { fetchAndEvaluate } from "../apps/worker/src/agents/source-intelligence/source-evaluator.js";
import {
  buildEvidenceRecord,
  chunkByHeading,
  extractAltLabelCandidates,
  extractDefinitionCandidates,
  extractIdentifierCandidates
} from "../apps/worker/src/agents/source-intelligence/extractor.js";

async function main(): Promise<void> {
  const evidenceApp = buildServer();
  const evidenceBaseUrl = await evidenceApp.listen({ port: 0, host: "127.0.0.1" });
  const evidenceClient = new HttpEvidenceClient({ baseUrl: evidenceBaseUrl });

  console.log(`Mock EvidenceStore listening at ${evidenceBaseUrl}\n`);
  console.log("Running Source Intelligence Agent against the live seed sources...\n");

  const result = await runSourceIntelligenceAgent(evidenceClient);

  console.log("=== Run summary ===");
  console.log(JSON.stringify(result, null, 2));

  if (result.failures.length > 0) {
    console.log("\n=== Failures (isolated, did not stop the run — FR-009) ===");
    for (const failure of result.failures) {
      console.log(`- ${failure.documentId} (${failure.url}): ${failure.reason}`);
    }
  }

  console.log("\n=== Evidence written ===");
  // The mock store has no "list all" endpoint (matches the real EvidenceStore contract in
  // requirements.MD); re-derive the ids the same way the agent did so we can display them.
  const plan = planSourceIntelligenceRun(DEFAULT_SEED_DOCUMENTS, SEED_PRODUCT_LINE_TERMS);
  for (const item of plan) {
    const fetchResult = await fetchAndEvaluate(item.seedDoc);
    if (fetchResult.status !== "ok" || !fetchResult.html) continue;
    const chunks = chunkByHeading(fetchResult.html, item.seedDoc.documentId);
    for (const term of item.terms) {
      for (const chunk of chunks) {
        const candidates = [
          ...extractDefinitionCandidates(chunk, term),
          ...extractAltLabelCandidates(chunk, term),
          ...extractIdentifierCandidates(chunk, term)
        ];
        for (const candidate of candidates) {
          const record = buildEvidenceRecord(candidate, chunk, {
            sourceId: item.seedDoc.source.sourceId,
            documentId: item.seedDoc.documentId,
            url: item.seedDoc.url,
            retrievedDate: fetchResult.retrievedDate
          });
          const stored = await evidenceClient.getEvidence(record.evidenceId);
          console.log(`\n[${stored?.predicate}] ${stored?.termId}`);
          console.log(`  value: ${stored?.value}`);
          console.log(`  source: ${stored?.provenance.url}${stored?.provenance.location.anchor}`);
        }
      }
    }
  }

  await evidenceApp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
