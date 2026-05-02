import { describe, expect, it } from "vitest";
import { extractRetryAfterFromMessage, parseRetryAfterSeconds } from "@search/app/services/rateLimitParser";

describe("rate-limit parser service", () => {
  it("parses retry-after header seconds", () => {
    expect(parseRetryAfterSeconds("59")).toBe(59);
    expect(parseRetryAfterSeconds("59.9")).toBe(59);
  });

  it("returns null for invalid retry-after values", () => {
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds("abc")).toBeNull();
    expect(parseRetryAfterSeconds("0")).toBeNull();
  });

  it("extracts retry delay from error message", () => {
    expect(extractRetryAfterFromMessage("Rate limited, retry in 42s")).toBe(42);
    expect(extractRetryAfterFromMessage("RETRY IN 7S")).toBe(7);
    expect(extractRetryAfterFromMessage("no retry info")).toBeNull();
  });
});
