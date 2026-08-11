# Feature Specification: Insurance Research Agent (Source Intelligence)

**Feature Branch**: `001-insurance-research-agent`
**Created**: 2026-08-11
**Status**: Draft
**Input**: User description: "Insurance Research Agent (Source Intelligence Agent): discovers authoritative US insurance sources and extracts explicit evidence with full provenance for the taxonomy pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture verbatim, provenance-complete evidence for a product line (Priority: P1)

As the taxonomy pipeline, I need authoritative documents about a specific US insurance product line (e.g., "Commercial General Liability") turned into evidence records that quote the source exactly and record where the claim came from, so that every fact used to build the taxonomy can be audited back to its origin.

**Why this priority**: Without provenance-complete, verbatim evidence, nothing downstream (taxonomy reasoning, validation, governance reporting) can be trusted or audited. This is the foundation the entire pipeline depends on.

**Independent Test**: Can be fully tested by pointing the agent at a known authoritative document (e.g., a NAIC glossary page) and confirming it produces one or more evidence records, each carrying a verbatim quote and complete source location/timestamp, without needing any other pipeline component to run.

**Acceptance Scenarios**:

1. **Given** an authoritative public document that defines "Commercial General Liability", **When** the agent processes it, **Then** it produces an evidence record containing the verbatim definition, the source organization, the document identifier, the exact location within the document, and the retrieval timestamp.
2. **Given** a document with no relevant content about any in-scope product line, **When** the agent processes it, **Then** it produces no evidence records for that document and does not fail the run.

---

### User Story 2 - Extract explicit relationships and context signals without inferring hierarchy (Priority: P2)

As the taxonomy pipeline, I need the agent to record only what a source explicitly states about how product lines relate to each other and whether they apply to businesses or individuals, so the taxonomy reasoning step can distinguish "the source said this directly" from "this was inferred."

**Why this priority**: The governed pipeline design requires a hard separation between evidence collection and taxonomy reasoning. If this agent silently infers relationships, it breaks the audit guarantee that is the project's core objective.

**Independent Test**: Can be tested by feeding the agent a document that explicitly states a broader/narrower relationship (e.g., "CGL is a form of General Liability insurance") alongside a document that only implies a relationship without stating it, and confirming an evidence record is produced only for the explicit case.

**Acceptance Scenarios**:

1. **Given** a source that explicitly states "X is a type of Y", **When** the agent processes it, **Then** it produces an evidence record capturing that explicit broader/narrower relationship with the verbatim supporting text.
2. **Given** a source that discusses two product lines together without ever explicitly stating a relationship between them, **When** the agent processes it, **Then** no relationship evidence record is created for that pair.
3. **Given** a source that describes a product line as applying to businesses or to individuals, **When** the agent processes it, **Then** it produces evidence capturing that commercial/personal context signal.

---

### User Story 3 - Capture aliases, identifiers, and regulatory attribution (Priority: P3)

As the taxonomy pipeline, I need known synonyms, acronyms, standard identifiers (e.g., ACORD/NAIC codes), and the regulatory or defining authority for a product line captured as evidence, so the taxonomy can present recognizable labels and cite its regulatory basis.

**Why this priority**: This enriches the taxonomy's usability (recognizable labels, regulatory grounding) but the pipeline is still viable without it — definitions and hierarchy evidence (P1/P2) alone can produce a usable MVP taxonomy.

**Independent Test**: Can be tested by feeding the agent a document that lists an acronym (e.g., "CGL") alongside its full name and an ACORD line-of-business code, and confirming the alias and identifier are each captured as separate evidence records tied back to the same source location.

**Acceptance Scenarios**:

1. **Given** a source that states an acronym or alternate name for a product line, **When** the agent processes it, **Then** it produces an evidence record capturing that alias.
2. **Given** a source that cites a standard identifier (e.g., ACORD or NAIC code) for a product line, **When** the agent processes it, **Then** it produces an evidence record capturing that identifier.
3. **Given** a source that names the regulatory body or standard that defines a product line, **When** the agent processes it, **Then** it produces an evidence record capturing that attribution.

---

### Edge Cases

- What happens when a source is unreachable, paywalled, or returns an error at retrieval time? The run must continue processing other sources and must report which sources failed rather than silently dropping them.
- What happens when two authoritative sources give conflicting definitions or aliases for the same product line? Both must be captured as separate evidence records — the agent does not resolve conflicts; that is a downstream concern.
- What happens when a source discusses a product line outside the in-scope backbone (e.g., "Workers Compensation")? It is out of scope for this MVP and should not produce evidence records, since it is not part of the seeded product-line list.
- What happens when the same claim appears verbatim in two different documents (or the same document is reprocessed on a later run)? The agent must not silently duplicate an identical evidence record for the same source location.
- What happens when a source is ambiguous about whether a statement refers to the commercial or personal context? No context-signal evidence is recorded for that statement; only what is explicit is captured.
- What happens when a source updates or is revised after its first retrieval? The new retrieval must be captured as a separate evidence record with its own retrieval timestamp, preserving the prior version rather than overwriting it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST discover publicly accessible documents from authoritative sources (standards bodies such as ACORD, US regulators/agencies such as NAIC, and established industry publications) that are relevant to the in-scope US insurance product lines.
- **FR-002**: System MUST limit discovery and extraction to the in-scope product lines: Commercial Insurance, Personal Insurance, and their seeded sub-lines (Property, Auto, General Liability/CGL, Homeowners, Personal Auto/PAP), including recognized aliases of these terms.
- **FR-003**: System MUST extract only claims explicitly stated in a source. It MUST NOT create evidence for relationships, categorizations, or context signals that are implied but not directly stated.
- **FR-004**: System MUST be able to capture evidence for each of the following claim types whenever a source explicitly states them: definition, alias/synonym/acronym, broader/narrower relationship, commercial-vs-personal context signal, applicability scope (e.g., businesses, individuals, vehicles, property), coverage/peril references (captured as descriptive text, not as new taxonomy concepts), standard identifiers (e.g., ACORD/NAIC codes), and the regulatory or defining authority.
- **FR-005**: Every evidence record System produces MUST be marked as an explicit claim (never as an inferred one).
- **FR-006**: Every evidence record MUST include: the source organization, a document identifier, the exact location within the document (e.g., page/section/anchor), the verbatim quoted text supporting the claim, and the timestamp at which the system retrieved it.
- **FR-007**: System MUST record a source document's publication date separately from the date/time it was retrieved by the system.
- **FR-008**: System MUST make each evidence record uniquely identifiable and retrievable by downstream consumers.
- **FR-009**: System MUST continue processing remaining sources when an individual source is unreachable or fails, and MUST report which sources failed rather than aborting the entire run.
- **FR-010**: System MUST avoid producing duplicate evidence records for the same verbatim claim at the same source location within a single run.
- **FR-011**: System MUST preserve prior evidence when a previously retrieved source is revised, rather than overwriting or discarding it.

### Key Entities

- **Evidence Record**: A single explicit claim extracted from one source location. Carries the claim type (definition, alias, relationship, context signal, applicability, coverage reference, identifier, or regulatory attribution), the verbatim quote, and complete provenance.
- **Provenance**: The audit trail attached to an evidence record — source organization, document identifier, exact location within the document, publication date, and retrieval timestamp.
- **Source**: An authoritative organization or publication (e.g., a standards body, regulator, or industry publisher) from which documents are discovered.
- **Document**: A specific publication or page belonging to a Source, which may yield zero or more evidence records.
- **Target Product-Line Term**: One of the in-scope product lines (and its known aliases) that discovery and extraction are scoped to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For each of the 10 seeded product-line concepts, at least one evidence record containing a verbatim definition is captured from an authoritative source.
- **SC-002**: 100% of produced evidence records contain complete provenance (source organization, document identifier, exact location, verbatim quote, retrieval timestamp) — none are missing a required provenance field.
- **SC-003**: 0% of produced evidence records represent an inferred or implied claim as explicit.
- **SC-004**: Every evidence-backed claim can be traced back to its exact originating source location by a reviewer without needing to re-visit the original source or consult any other system.
- **SC-005**: When one or more sources are unreachable during a run, the run still completes and produces a report identifying exactly which sources failed, with zero loss of evidence from the sources that succeeded.
- **SC-006**: Re-running discovery over an unchanged set of sources produces zero net-new duplicate evidence records for claims already captured.

## Assumptions

- Discovery is limited to publicly accessible, non-paywalled documents for this MVP; sources requiring authentication or payment are out of scope.
- Sources are assumed to be in English for this MVP.
- The set of target product-line terms is the 10-concept seed backbone from the taxonomy MVP (Commercial Insurance, Personal Insurance, and their sub-lines) plus their known aliases; expanding this list is a future evolution, not part of this feature.
- The Evidence Store that receives these records is a separate, already-defined dependency of this pipeline; this feature is only responsible for producing records that satisfy its contract, not for building the store itself.
- Coverage and peril references are captured only as descriptive text evidence, never as new canonical taxonomy concepts — that boundary is fixed by the overall project scope.
- This agent runs as an automated backend process triggered by the pipeline; no end-user-facing interface is required.
- Standard, industry-typical politeness/rate-limit behavior when retrieving from external public sites is sufficient; no specific throughput target is mandated for this MVP.
