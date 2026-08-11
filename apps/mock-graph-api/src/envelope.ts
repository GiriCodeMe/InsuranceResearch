export type EnvelopeMode = "raw" | "data" | "result" | "ambiguous" | "malformed";

const VALID_MODES: readonly string[] = ["raw", "data", "result", "ambiguous", "malformed"];

export function resolveEnvelopeMode(query: unknown): EnvelopeMode {
  const requested = isRecord(query) ? query.envelope : undefined;
  if (typeof requested === "string" && VALID_MODES.includes(requested)) {
    return requested as EnvelopeMode;
  }
  const envDefault = process.env.MOCK_RESPONSE_ENVELOPE;
  if (envDefault && VALID_MODES.includes(envDefault)) {
    return envDefault as EnvelopeMode;
  }
  return "raw";
}

export function buildEnvelope(mode: EnvelopeMode, payload: unknown): unknown {
  switch (mode) {
    case "raw":
      return payload;
    case "data":
      return { data: payload };
    case "result":
      return { result: payload };
    case "ambiguous":
      return { data: payload, result: payload };
    case "malformed":
      return { data: { __malformed: true, unexpectedShape: payload === null } };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
