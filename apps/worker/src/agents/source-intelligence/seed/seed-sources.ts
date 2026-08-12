import type { Source } from "@insurance-kb/contracts";
import type { SeedDocument } from "../discovery.js";

const NAIC: Source = { sourceId: "naic", organizationName: "National Association of Insurance Commissioners", sourceType: "regulator" };

/**
 * Verified against the live pages on 2026-08-11 (see __fixtures__ for the trimmed structure this
 * extractor is built against). Coverage is intentionally partial: NAIC's public consumer pages only
 * cover personal-lines topics in the term backbone (Homeowners, Auto) — there is no equivalent public
 * consumer glossary entry for the commercial-lines terms (GL/CGL/CommercialProperty/CommercialAuto)
 * at this source. Widening coverage to the rest of the 10-concept backbone means adding more seed
 * sources (e.g. an ACORD or state DOI glossary) — tracked as follow-up, not fabricated here.
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
  }
];
