import { describe, it, expect } from "vitest";
import { getCreditBalance } from "./keywords-everywhere";

describe("Keywords Everywhere API", () => {
  const apiKey = process.env.KEYWORDS_EVERYWHERE_API_KEY ?? "";

  it("should have a valid API key configured", () => {
    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(0);
  });

  it("should return a credit balance (validates API key is working)", async () => {
    const credits = await getCreditBalance(apiKey);
    expect(typeof credits).toBe("number");
    expect(credits).toBeGreaterThanOrEqual(0);
  }, 15000);
});
