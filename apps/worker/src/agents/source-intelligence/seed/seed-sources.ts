import type { Source } from "@insurance-kb/contracts";
import type { SeedDocument } from "../discovery.js";

const NAIC: Source = { sourceId: "naic", organizationName: "National Association of Insurance Commissioners", sourceType: "regulator" };
const NAPHIA: Source = {
  sourceId: "naphia",
  organizationName: "North American Pet Health Insurance Association",
  sourceType: "industry-publication"
};

/**
 * Every document here was verified against the live page on the date noted (see __fixtures__ for
 * the trimmed structure the extractor is built against). Coverage is intentionally partial —
 * every concept without a document here is a tracked coverage gap, not evidence that concept is
 * invalid. See coverage-gaps.ts for the full per-concept status and next action (searching a
 * specific authoritative body vs. an extractor limitation), enforced against drift by
 * coverage-gaps.test.ts.
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
  },
  {
    source: NAPHIA,
    documentId: "naphia-pet-insurance-buying-guide",
    url: "https://naphia.org/find-pet-insurance/naphias-pet-insurance-buying-guide/",
    termIds: ["PetInsurance"]
  }
];
