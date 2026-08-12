import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AmbiguousEnvelopeError, MalformedEnvelopeError, unwrapEnvelope, unwrapMutationEnvelope } from "./api-envelope.js";

const PayloadSchema = z.object({ id: z.string() });

describe("unwrapEnvelope", () => {
  it("accepts a raw payload", () => {
    expect(unwrapEnvelope(PayloadSchema, { id: "a" })).toEqual({ id: "a" });
  });

  it("accepts a { data } envelope", () => {
    expect(unwrapEnvelope(PayloadSchema, { data: { id: "a" } })).toEqual({ id: "a" });
  });

  it("accepts a { result } envelope", () => {
    expect(unwrapEnvelope(PayloadSchema, { result: { id: "a" } })).toEqual({ id: "a" });
  });

  it("throws AmbiguousEnvelopeError when both data and result are present", () => {
    expect(() => unwrapEnvelope(PayloadSchema, { data: { id: "a" }, result: { id: "b" } })).toThrow(
      AmbiguousEnvelopeError
    );
  });

  it("throws MalformedEnvelopeError when the payload doesn't match the schema", () => {
    expect(() => unwrapEnvelope(PayloadSchema, { data: { wrong: true } })).toThrow(MalformedEnvelopeError);
  });

  it("throws MalformedEnvelopeError for a non-object, non-matching body", () => {
    expect(() => unwrapEnvelope(PayloadSchema, "not-an-object")).toThrow(MalformedEnvelopeError);
  });
});

describe("unwrapMutationEnvelope", () => {
  it("accepts { ok: true } raw", () => {
    expect(unwrapMutationEnvelope({ ok: true })).toEqual({ ok: true });
  });

  it("accepts { data: { ok: true } }", () => {
    expect(unwrapMutationEnvelope({ data: { ok: true } })).toEqual({ ok: true });
  });

  it("rejects ambiguous mutation envelopes", () => {
    expect(() => unwrapMutationEnvelope({ data: { ok: true }, result: { ok: true } })).toThrow(
      AmbiguousEnvelopeError
    );
  });
});
