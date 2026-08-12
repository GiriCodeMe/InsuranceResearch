import type { FetchStatus } from "@insurance-kb/contracts";
import type { SeedDocument } from "./discovery.js";

export interface FetchResult {
  seedDoc: SeedDocument;
  status: FetchStatus;
  html?: string;
  retrievedDate: string;
  reason?: string;
}

/**
 * Fetches a seed document and evaluates whether it's usable — never throws (FR-009: a single
 * unreachable/failing source must not abort the run for the rest).
 */
export async function fetchAndEvaluate(seedDoc: SeedDocument, timeoutMs = 10_000): Promise<FetchResult> {
  const retrievedDate = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(seedDoc.url, {
      signal: controller.signal,
      headers: { "user-agent": "InsuranceResearchAgent/0.1 (+source-intelligence)" }
    });
    if (!response.ok) {
      return { seedDoc, status: "error", retrievedDate, reason: `HTTP ${response.status}` };
    }
    const html = await response.text();
    if (!html.trim()) {
      return { seedDoc, status: "error", retrievedDate, reason: "empty response body" };
    }
    return { seedDoc, status: "ok", html, retrievedDate };
  } catch (error) {
    return {
      seedDoc,
      status: "unreachable",
      retrievedDate,
      reason: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}
