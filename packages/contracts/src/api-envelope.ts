import { z, type ZodType } from "zod";

/**
 * Strict envelope contract shared by the Graph API and EvidenceStore (requirements.MD):
 * a response is exactly one of: raw payload, `{ data: payload }`, or `{ result: payload }`.
 * Both `data` and `result` present at once is ambiguous and must fail fast, never be guessed at.
 */
export class AmbiguousEnvelopeError extends Error {
  constructor() {
    super("Response envelope is ambiguous: both 'data' and 'result' keys are present");
    this.name = "AmbiguousEnvelopeError";
  }
}

export class MalformedEnvelopeError extends Error {
  constructor(cause: unknown) {
    super(`Response envelope did not match the expected schema: ${String(cause)}`);
    this.name = "MalformedEnvelopeError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unwraps and validates a strict-envelope response body against `schema`. Throws, never guesses. */
export function unwrapEnvelope<T>(schema: ZodType<T>, body: unknown): T {
  let candidate: unknown = body;

  if (isPlainObject(body)) {
    const hasData = "data" in body;
    const hasResult = "result" in body;
    if (hasData && hasResult) {
      throw new AmbiguousEnvelopeError();
    }
    if (hasData) {
      candidate = body.data;
    } else if (hasResult) {
      candidate = body.result;
    }
  }

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    throw new MalformedEnvelopeError(parsed.error);
  }
  return parsed.data;
}

export const OkEnvelopeSchema = z.object({ ok: z.literal(true) });
export type OkEnvelope = z.infer<typeof OkEnvelopeSchema>;

/** For mutation endpoints, which must return `{ ok: true }` in any of the three envelope forms. */
export function unwrapMutationEnvelope(body: unknown): OkEnvelope {
  return unwrapEnvelope(OkEnvelopeSchema, body);
}
