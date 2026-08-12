import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { createHash } from "node:crypto";
import { EvidenceRecordSchema, type Chunk, type ConceptCandidate, type EvidenceRecord, type ProductLineTerm } from "@insurance-kb/contracts";

const HEADING_SELECTOR = "h1, h2, h3";
const PARENTHETICAL_ACRONYM = /\(([A-Z]{2,6})\)/;
const IDENTIFIER_PATTERN = /ACORD\s+Line of Business Code:\s*([A-Z0-9-]+)/i;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "chunk"
  );
}

/**
 * Collects the `<p>` text immediately following `startNode`, stopping at the next heading.
 * Real content pages sometimes wrap the heading itself in a container div (seen on NAIC's
 * consumer pages), so the caller retries one level up when the heading's own siblings yield nothing.
 */
function collectFollowingParagraphs($: cheerio.CheerioAPI, startNode: cheerio.Cheerio<AnyNode>): string[] {
  const paragraphs: string[] = [];
  let node = startNode.next();
  while (node.length && !node.is(HEADING_SELECTOR)) {
    if (node.is("p")) {
      const text = node.text().trim();
      if (text) paragraphs.push(text);
    }
    node = node.next();
  }
  return paragraphs;
}

/** One Chunk per heading, pairing the heading text with the paragraph(s) that describe it. */
export function chunkByHeading(html: string, documentId: string): Chunk[] {
  const $ = cheerio.load(html);
  const chunks: Chunk[] = [];

  $(HEADING_SELECTOR).each((index, element) => {
    const heading = $(element);
    const headingText = heading.text().trim();
    if (!headingText) return;

    let paragraphs = collectFollowingParagraphs($, heading);
    if (paragraphs.length === 0) {
      paragraphs = collectFollowingParagraphs($, heading.parent());
    }
    if (paragraphs.length === 0) return;

    const anchor = heading.attr("id") ? `#${heading.attr("id")}` : `#heading-${index}-${slugify(headingText)}`;
    chunks.push({
      chunkId: `${documentId}:${anchor}`,
      documentId,
      anchor,
      text: `${headingText}\n${paragraphs.join("\n")}`
    });
  });

  return chunks;
}

function headingAndBody(chunk: Chunk): { headingLine: string; body: string } {
  const [headingLine, ...rest] = chunk.text.split("\n");
  return { headingLine, body: rest.join(" ") };
}

function normalizeHeading(text: string): string {
  return text.replace(PARENTHETICAL_ACRONYM, "").trim().toLowerCase();
}

function headingMatchesTerm(headingLine: string, term: ProductLineTerm): boolean {
  const normalized = normalizeHeading(headingLine);
  return [term.canonicalLabel, ...term.aliases].some((label) => label.toLowerCase() === normalized);
}

/** Explicit only: fires solely when the heading is a name/alias of `term` — never on implied mentions. */
export function extractDefinitionCandidates(chunk: Chunk, term: ProductLineTerm): ConceptCandidate[] {
  const { headingLine, body } = headingAndBody(chunk);
  if (!headingMatchesTerm(headingLine, term) || !body) return [];
  return [{ termId: term.termId, predicate: "definition", rawValue: body, chunkId: chunk.chunkId, explicit: true }];
}

/** Explicit only: fires solely when the heading itself states a parenthetical acronym, e.g. "X (CGL)". */
export function extractAltLabelCandidates(chunk: Chunk, term: ProductLineTerm): ConceptCandidate[] {
  const { headingLine } = headingAndBody(chunk);
  if (!headingMatchesTerm(headingLine, term)) return [];
  const match = headingLine.match(PARENTHETICAL_ACRONYM);
  if (!match) return [];
  return [{ termId: term.termId, predicate: "altLabel", rawValue: match[1], chunkId: chunk.chunkId, explicit: true }];
}

/** Explicit only: fires solely when the body text states a standard identifier code verbatim. */
export function extractIdentifierCandidates(chunk: Chunk, term: ProductLineTerm): ConceptCandidate[] {
  const { headingLine, body } = headingAndBody(chunk);
  if (!headingMatchesTerm(headingLine, term)) return [];
  const match = body.match(IDENTIFIER_PATTERN);
  if (!match) return [];
  return [{ termId: term.termId, predicate: "identifier", rawValue: match[1], chunkId: chunk.chunkId, explicit: true }];
}

export interface DocumentProvenanceMeta {
  sourceId: string;
  documentId: string;
  url: string;
  retrievedDate: string;
}

/** Short, stable digest of arbitrary text — keeps evidenceId compact regardless of value length. */
function shortHash(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

/**
 * evidenceId is derived entirely from stable content (term/predicate/document/anchor/value), so
 * re-running over an unchanged document naturally produces the same id rather than a duplicate
 * (FR-010) — the mock EvidenceStore's PUT-by-id semantics make this idempotent by construction.
 * The value contributes only a short hash, not its full (slugified) text, so evidenceId stays
 * well within typical router param-length limits regardless of how long a quoted definition is.
 */
export function buildEvidenceRecord(candidate: ConceptCandidate, chunk: Chunk, meta: DocumentProvenanceMeta): EvidenceRecord {
  const evidenceId = `${candidate.termId}-${candidate.predicate}-${meta.documentId}-${slugify(chunk.anchor)}-${shortHash(candidate.rawValue)}`.slice(
    0,
    90
  );
  return EvidenceRecordSchema.parse({
    evidenceId,
    termId: candidate.termId,
    predicate: candidate.predicate,
    value: candidate.rawValue,
    assertionMode: "explicit",
    provenance: {
      sourceId: meta.sourceId,
      documentId: meta.documentId,
      url: meta.url,
      retrievedDate: meta.retrievedDate,
      location: { anchor: chunk.anchor },
      quote: candidate.rawValue
    }
  });
}
