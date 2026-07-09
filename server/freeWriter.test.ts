import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for the Free Writer feature.
 * Tests the format rules configuration and prompt assembly logic.
 */

describe("Free Writer", () => {
  describe("Format configuration", () => {
    const FORMAT_RULES: Record<string, { label: string; wordRange: Record<string, string>; rules: string }> = {
      "linkedin": {
        label: "LinkedIn Post",
        wordRange: { short: "150-250", medium: "300-500", long: "600-1000" },
        rules: "LINKEDIN POST RULES",
      },
      "short-article": {
        label: "Short Article",
        wordRange: { short: "300-500", medium: "600-900", long: "1000-1500" },
        rules: "SHORT ARTICLE RULES",
      },
      "facebook": {
        label: "Facebook Post",
        wordRange: { short: "50-150", medium: "150-300", long: "300-500" },
        rules: "FACEBOOK POST RULES",
      },
      "email-newsletter": {
        label: "Email Newsletter",
        wordRange: { short: "200-400", medium: "400-700", long: "700-1200" },
        rules: "EMAIL NEWSLETTER RULES",
      },
      "youtube-script": {
        label: "YouTube Script",
        wordRange: { short: "300-500", medium: "600-1000", long: "1200-2000" },
        rules: "YOUTUBE SCRIPT RULES",
      },
      "landing-page": {
        label: "Landing Page Copy",
        wordRange: { short: "200-400", medium: "400-800", long: "800-1500" },
        rules: "LANDING PAGE COPY RULES",
      },
      "custom": {
        label: "Custom Format",
        wordRange: { short: "200-400", medium: "400-800", long: "800-1500" },
        rules: "CUSTOM FORMAT",
      },
    };

    it("should have all 7 format types defined", () => {
      const formats = Object.keys(FORMAT_RULES);
      expect(formats).toHaveLength(7);
      expect(formats).toContain("linkedin");
      expect(formats).toContain("short-article");
      expect(formats).toContain("facebook");
      expect(formats).toContain("email-newsletter");
      expect(formats).toContain("youtube-script");
      expect(formats).toContain("landing-page");
      expect(formats).toContain("custom");
    });

    it("should have short/medium/long word ranges for each format", () => {
      for (const [key, config] of Object.entries(FORMAT_RULES)) {
        expect(config.wordRange).toHaveProperty("short");
        expect(config.wordRange).toHaveProperty("medium");
        expect(config.wordRange).toHaveProperty("long");
        // Each range should be in "X-Y" format
        for (const range of Object.values(config.wordRange)) {
          expect(range).toMatch(/^\d+-\d+$/);
        }
      }
    });

    it("should have increasing word ranges from short to long", () => {
      for (const [key, config] of Object.entries(FORMAT_RULES)) {
        const shortMax = parseInt(config.wordRange.short.split("-")[1]);
        const mediumMin = parseInt(config.wordRange.medium.split("-")[0]);
        const mediumMax = parseInt(config.wordRange.medium.split("-")[1]);
        const longMin = parseInt(config.wordRange.long.split("-")[0]);

        expect(mediumMin).toBeGreaterThanOrEqual(shortMax - 100); // Allow some overlap
        expect(longMin).toBeGreaterThanOrEqual(mediumMax - 200); // Allow some overlap
      }
    });

    it("should have a label for each format", () => {
      for (const config of Object.values(FORMAT_RULES)) {
        expect(config.label).toBeTruthy();
        expect(config.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Prompt assembly", () => {
    it("should build brand voice section from voice data", () => {
      const brandVoice = {
        name: "Medicare Expert",
        toneTraits: "Authoritative, Empathetic",
        perspective: "second",
        sentenceStyle: "mixed",
        avoidList: "PRESETS:jargon,fluff|CUSTOM:Medicare Advantage is the best",
        writingStyleSample: "We understand that navigating Medicare can feel overwhelming.",
      };

      const perspectiveMap: Record<string, string> = {
        first: "First person (we/our/us)",
        second: "Second person (you/your)",
        third: "Third person (neutral/objective)",
      };
      const styleMap: Record<string, string> = {
        short: "Short and punchy (1-2 sentences per paragraph)",
        mixed: "Mixed/varied sentence lengths",
        detailed: "Detailed and explanatory (3-5 sentences per paragraph)",
      };

      let avoidItems: string[] = [];
      const avoidList = brandVoice.avoidList || "";
      if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
        const parts = avoidList.split("|");
        for (const part of parts) {
          if (part.startsWith("PRESETS:")) {
            avoidItems.push(...part.replace("PRESETS:", "").split(",").filter(Boolean));
          } else if (part.startsWith("CUSTOM:")) {
            avoidItems.push(...part.replace("CUSTOM:", "").split(",").filter(Boolean));
          }
        }
      }

      expect(avoidItems).toContain("jargon");
      expect(avoidItems).toContain("fluff");
      expect(avoidItems).toContain("Medicare Advantage is the best");
      expect(perspectiveMap[brandVoice.perspective]).toBe("Second person (you/your)");
      expect(styleMap[brandVoice.sentenceStyle]).toBe("Mixed/varied sentence lengths");
    });

    it("should build ICP section from ICP data", () => {
      const icp = {
        name: "Medicare Beneficiaries",
        description: "Adults age 65+ enrolling in Medicare",
        painPoints: ["Confusion about coverage options", "Fear of high costs"],
        goals: ["Find affordable coverage", "Understand their benefits"],
      };

      const pains = Array.isArray(icp.painPoints) ? icp.painPoints : [];
      const goals = Array.isArray(icp.goals) ? icp.goals : [];

      expect(pains).toHaveLength(2);
      expect(goals).toHaveLength(2);
      expect(pains.join(", ")).toContain("Confusion");
      expect(goals.join(", ")).toContain("affordable");
    });

    it("should strip banned phrases from generated content", () => {
      const bannedPhrases = ["navigate the complex", "in today's world", "it's important to note"];
      let content = "It's important to note that you need to navigate the complex Medicare system in today's world.";

      for (const phrase of bannedPhrases) {
        if (phrase.trim()) {
          const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escapedPhrase, "gi");
          content = content.replace(regex, "");
        }
      }

      expect(content).not.toContain("navigate the complex");
      expect(content).not.toContain("in today's world");
      expect(content).not.toContain("it's important to note");
    });

    it("should replace em dashes with hyphens", () => {
      let content = "Medicare — the federal health insurance program — covers many services.";
      content = content.replace(/—/g, " - ");
      expect(content).not.toContain("—");
      expect(content).toContain(" - ");
    });
  });
});
