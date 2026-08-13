import { describe, it, expect, vi } from "vitest";
import type { InvokeParams, InvokeResult } from "./_core/llm";

// Test the Claude module's message conversion and response format handling
describe("Claude LLM Integration", () => {
  describe("Module structure", () => {
    it("should export invokeClaudeLLM function", async () => {
      const mod = await import("./claude");
      expect(typeof mod.invokeClaudeLLM).toBe("function");
    });

    it("should export AVAILABLE_CLAUDE_MODELS", async () => {
      const mod = await import("./claude");
      expect(Array.isArray(mod.AVAILABLE_CLAUDE_MODELS)).toBe(true);
      expect(mod.AVAILABLE_CLAUDE_MODELS.length).toBeGreaterThan(0);
    });

    it("should include Claude Sonnet 5 as a model option", async () => {
      const mod = await import("./claude");
      const sonnet5 = mod.AVAILABLE_CLAUDE_MODELS.find(
        (m) => m.id === "claude-sonnet-5"
      );
      expect(sonnet5).toBeDefined();
      expect(sonnet5!.label).toContain("Sonnet 5");
    });

    it("should include Claude Sonnet 4.6 as a model option", async () => {
      const mod = await import("./claude");
      const sonnet46 = mod.AVAILABLE_CLAUDE_MODELS.find(
        (m) => m.id === "claude-sonnet-4-6"
      );
      expect(sonnet46).toBeDefined();
      expect(sonnet46!.label).toContain("Sonnet 4.6");
    });

    it("should include Claude Haiku 4.5 as a fast model option", async () => {
      const mod = await import("./claude");
      const haiku = mod.AVAILABLE_CLAUDE_MODELS.find(
        (m) => m.id === "claude-haiku-4-5"
      );
      expect(haiku).toBeDefined();
      expect(haiku!.label).toContain("Haiku");
    });
  });

  describe("callLLM routing", () => {
    it("should have ANTHROPIC_API_KEY in environment", () => {
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY!.length).toBeGreaterThan(0);
    });
  });

  describe("Claude API call with real key", () => {
    it("should successfully call Claude API and return InvokeResult format", async () => {
      const { invokeClaudeLLM } = await import("./claude");

      const result = await invokeClaudeLLM({
        messages: [
          { role: "system", content: "Respond with exactly: OK" },
          { role: "user", content: "Say OK" },
        ],
        max_tokens: 10,
      });

      // Verify InvokeResult structure
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("choices");
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0]).toHaveProperty("message");
      expect(result.choices[0].message).toHaveProperty("role", "assistant");
      expect(typeof result.choices[0].message.content).toBe("string");
      expect(result).toHaveProperty("usage");
      expect(result.usage!.prompt_tokens).toBeGreaterThan(0);
      expect(result.usage!.completion_tokens).toBeGreaterThan(0);
    }, 30000);

    it("should handle JSON response format by injecting schema into system prompt", async () => {
      const { invokeClaudeLLM } = await import("./claude");

      const result = await invokeClaudeLLM({
        messages: [
          { role: "system", content: "You extract names from text." },
          { role: "user", content: "My name is Alice." },
        ],
        max_tokens: 100,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "name_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0].message.content as string;
      // Should be parseable JSON
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("name");
      expect(parsed.name.toLowerCase()).toContain("alice");
    }, 30000);

    it("should use specified model when provided", async () => {
      const { invokeClaudeLLM } = await import("./claude");

      const result = await invokeClaudeLLM(
        {
          messages: [
            { role: "user", content: "Say hi" },
          ],
          max_tokens: 10,
        },
        "claude-haiku-4-5"
      );

      expect(result.model).toContain("haiku");
    }, 30000);
  });
});
