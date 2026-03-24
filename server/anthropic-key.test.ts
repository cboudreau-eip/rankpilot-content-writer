import { describe, it, expect } from "vitest";

describe("Anthropic API Key Validation", () => {
  it("should have ANTHROPIC_API_KEY set in environment", () => {
    const key = process.env.ANTHROPIC_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
    expect(key!.startsWith("sk-ant-")).toBe(true);
  });

  it("should successfully authenticate with Anthropic API", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    // Lightweight call: send a minimal message to validate the key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      }),
    });

    // 200 = success, 429 = rate limited (but key is valid)
    expect([200, 429]).toContain(response.status);
  }, 30000);
});
