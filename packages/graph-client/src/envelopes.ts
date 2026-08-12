import { MalformedEnvelopeError, unwrapEnvelope, unwrapMutationEnvelope } from "@insurance-kb/contracts";
import type { ZodType } from "zod";

export class GraphApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`Graph API responded with HTTP ${status} for ${url}`);
    this.name = "GraphApiHttpError";
  }
}

async function readJson(res: Response, url: string): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new MalformedEnvelopeError(`response from ${url} was not valid JSON: ${String(cause)}`);
  }
}

/** Posts `body` to `url`, then unwraps the strict raw/data/result envelope and validates it against `schema`. */
export async function postAndUnwrap<T>(url: string, body: unknown, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new GraphApiHttpError(res.status, url);
  }
  return unwrapEnvelope(schema, await readJson(res, url));
}

/** Posts `body` to `url` and expects a mutation-success envelope (`{ ok: true }` in any envelope form). */
export async function postAndUnwrapMutation(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new GraphApiHttpError(res.status, url);
  }
  unwrapMutationEnvelope(await readJson(res, url));
}
