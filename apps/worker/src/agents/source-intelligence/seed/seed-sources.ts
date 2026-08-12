import type { Source } from "@insurance-kb/contracts";
import type { SeedDocument } from "../discovery.js";

const NAIC: Source = { sourceId: "naic", organizationName: "National Association of Insurance Commissioners", sourceType: "regulator" };

/**
 * Verified against the live pages on 2026-08-11/2026-08-12 (see __fixtures__ for the trimmed
 * structure this extractor is built against). Coverage is intentionally partial:
 *
 * - NAIC's public consumer pages only cover personal-lines topics in the P&C backbone
 *   (Homeowners, Auto) — there is no equivalent public consumer glossary entry for the
 *   commercial-lines terms (GL/CGL/CommercialProperty/CommercialAuto) at this source.
 * - Of the 4 new lines of business, only Life Insurance has a verified, structurally-compatible
 *   NAIC consumer page. Pet Insurance has no dedicated NAIC consumer page at all (checked).
 *   Crop Insurance's authoritative source (USDA RMA) uses a deeply-nested Drupal page structure
 *   this extractor's heading+paragraph heuristic doesn't handle — verified unreachable-by-heuristic,
 *   not merely unchecked. Group Benefits has no single clear authoritative consumer source
 *   identified yet (it spans ERISA/DOL and NAIC group-health/group-life material).
 *
 * Widening coverage further means adding more seed sources and, for Crop Insurance, extending the
 * extractor to handle nested content structures — tracked as follow-up, not fabricated here.
 */
export const DEFAULT_SEED_DOCUMENTS: SeedDocument[] = [
  {
    source: NAIC,
    documentId: "naic-consumer-homeowners-insurance",
    url: "https://content.naic.org/consumer/homeowners-insurance.htm",
    termIds: ["HomeownersInsurance"]
  },
  {
    source: NAIC,
    documentId: "naic-consumer-auto-insurance",
    url: "https://content.naic.org/consumer/auto-insurance.htm",
    // NAIC's consumer auto page is personal-lines content; not attributed to CommercialAutoInsurance
    // even though its heading text ("Auto Insurance") would otherwise text-match that term too.
    termIds: ["PersonalAutoInsurance"]
  },
  {
    source: NAIC,
    documentId: "naic-consumer-life-insurance",
    url: "https://content.naic.org/consumer/life-insurance.htm",
    termIds: ["LifeInsurance"]
  }
];
