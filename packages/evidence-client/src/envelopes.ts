import { MalformedEnvelopeError, unwrapEnvelope, unwrapMutationEnvelope } from "@insurance-kb/contracts";
import type { ZodType } from "zod";

export class EvidenceStoreHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`EvidenceStore responded with HTTP ${status} for ${url}`);
    this.name = "EvidenceStoreHttpError";
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

export async function getAndUnwrap<T>(url: string, schema: ZodType<T>): Promise<T | undefined> {
  const res = await fetch(url);
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    throw new EvidenceStoreHttpError(res.status, url);
  }
  return unwrapEnvelope(schema, await readJson(res, url));
}

export async function headExists(url: string): Promise<boolean> {
  const res = await fetch(url, { method: "HEAD" });
  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new EvidenceStoreHttpError(res.status, url);
  }
  return true;
}

export async function postAndUnwrapMutation(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new EvidenceStoreHttpError(res.status, url);
  }
  unwrapMutationEnvelope(await readJson(res, url));
}
