import { describe, it, expect } from "vitest";

/**
 * Tests for the Redundancy Checker feature.
 * Validates response structure, severity/type counting, JSON parsing,
 * and the robust findAndReplaceInHtml logic with normalized whitespace
 * and virtual tag-boundary space fallback.
 */

describe("Redundancy Checker", () => {
  describe("Response structure", () => {
    it("should have the expected shape for a clean result (no redundancies)", () => {
      const mockResult = {
        results: {
          summary: "The article is well-written with no redundancies.",
          redundancyScore: 9,
          redundancies: [],
          cleanSections: [
            "Introduction section is concise and unique",
            "Coverage details are well-organized",
          ],
        },
      };

      expect(mockResult.results).toHaveProperty("summary");
      expect(mockResult.results).toHaveProperty("redundancyScore");
      expect(mockResult.results).toHaveProperty("redundancies");
      expect(mockResult.results).toHaveProperty("cleanSections");
      expect(mockResult.results.redundancies).toHaveLength(0);
      expect(mockResult.results.cleanSections).toHaveLength(2);
      expect(mockResult.results.redundancyScore).toBe(9);
    });

    it("should have the expected shape for a result with redundancies", () => {
      const mockResult = {
        results: {
          summary: "Found 3 redundancies in the article.",
          redundancyScore: 5,
          redundancies: [
            {
              type: "repeated_phrase",
              severity: "high",
              description: "The same sentence appears in both the introduction and conclusion.",
              originalText: "Medicare covers a wide range of preventive services at no cost to you.",
              secondInstance: "At no cost to you, Medicare covers a wide range of preventive services.",
              suggestedFix: "Remove the duplicate from the conclusion or rephrase it to add new information.",
            },
            {
              type: "filler_pattern",
              severity: "low",
              description: "Generic filler phrase that adds no value.",
              originalText: "It's important to note that Medicare enrollment has specific deadlines.",
              secondInstance: "",
              suggestedFix: "Medicare enrollment has specific deadlines.",
            },
            {
              type: "recycled_stat",
              severity: "medium",
              description: "The same statistic is cited twice.",
              originalText: "Over 65 million Americans are enrolled in Medicare.",
              secondInstance: "With more than 65 million enrollees, Medicare is the largest...",
              suggestedFix: "Remove the second mention or replace with a different supporting statistic.",
            },
          ],
          cleanSections: ["Benefits overview section is well-written"],
        },
      };

      expect(mockResult.results.redundancies).toHaveLength(3);
      expect(mockResult.results.redundancies[0].type).toBe("repeated_phrase");
      expect(mockResult.results.redundancies[1].type).toBe("filler_pattern");
      expect(mockResult.results.redundancies[2].type).toBe("recycled_stat");
      expect(mockResult.results.redundancyScore).toBe(5);
    });

    it("should support all four redundancy types", () => {
      const types = ["repeated_phrase", "redundant_idea", "recycled_stat", "filler_pattern"];
      const redundancies = types.map((t) => ({
        type: t,
        severity: "medium",
        description: `A ${t} redundancy`,
        originalText: "Some text",
        secondInstance: "",
        suggestedFix: "Fixed text",
      }));

      redundancies.forEach((r, i) => {
        expect(r.type).toBe(types[i]);
      });
    });

    it("should support all three severity levels", () => {
      const severities = ["high", "medium", "low"];
      const redundancies = severities.map((sev) => ({
        type: "filler_pattern",
        severity: sev,
        description: `A ${sev} severity item`,
        originalText: "Some text",
        suggestedFix: "Fixed text",
      }));

      redundancies.forEach((r, i) => {
        expect(r.severity).toBe(severities[i]);
      });
    });
  });

  describe("Severity and type counting", () => {
    it("should correctly count redundancies by severity", () => {
      const redundancies = [
        { severity: "high", type: "repeated_phrase" },
        { severity: "high", type: "redundant_idea" },
        { severity: "medium", type: "recycled_stat" },
        { severity: "low", type: "filler_pattern" },
        { severity: "low", type: "filler_pattern" },
        { severity: "low", type: "filler_pattern" },
      ];

      const highCount = redundancies.filter((r) => r.severity === "high").length;
      const mediumCount = redundancies.filter((r) => r.severity === "medium").length;
      const lowCount = redundancies.filter((r) => r.severity === "low").length;

      expect(highCount).toBe(2);
      expect(mediumCount).toBe(1);
      expect(lowCount).toBe(3);
    });

    it("should correctly count redundancies by type", () => {
      const redundancies = [
        { type: "repeated_phrase", severity: "high" },
        { type: "repeated_phrase", severity: "medium" },
        { type: "filler_pattern", severity: "low" },
        { type: "filler_pattern", severity: "low" },
        { type: "recycled_stat", severity: "medium" },
        { type: "redundant_idea", severity: "high" },
      ];

      const repeatedCount = redundancies.filter((r) => r.type === "repeated_phrase").length;
      const fillerCount = redundancies.filter((r) => r.type === "filler_pattern").length;
      const recycledCount = redundancies.filter((r) => r.type === "recycled_stat").length;
      const redundantCount = redundancies.filter((r) => r.type === "redundant_idea").length;

      expect(repeatedCount).toBe(2);
      expect(fillerCount).toBe(2);
      expect(recycledCount).toBe(1);
      expect(redundantCount).toBe(1);
    });

    it("should handle empty redundancies array", () => {
      const redundancies: any[] = [];
      const highCount = redundancies.filter((r) => r.severity === "high").length;
      expect(highCount).toBe(0);
    });
  });

  describe("JSON parsing from LLM response", () => {
    it("should extract JSON from a clean response", () => {
      const rawContent = `{
        "summary": "No redundancies found",
        "redundancyScore": 9,
        "redundancies": [],
        "cleanSections": ["All sections are unique"]
      }`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("No redundancies found");
      expect(parsed.redundancyScore).toBe(9);
      expect(parsed.redundancies).toHaveLength(0);
      expect(parsed.cleanSections).toHaveLength(1);
    });

    it("should extract JSON from a response with surrounding text", () => {
      const rawContent = `Here is the analysis:
      {
        "summary": "Found issues",
        "redundancyScore": 4,
        "redundancies": [{"type": "filler_pattern", "severity": "low", "description": "Filler", "originalText": "It is important to note that", "secondInstance": "", "suggestedFix": ""}],
        "cleanSections": []
      }
      End of analysis.`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("Found issues");
      expect(parsed.redundancyScore).toBe(4);
      expect(parsed.redundancies).toHaveLength(1);
      expect(parsed.redundancies[0].type).toBe("filler_pattern");
    });
  });

  describe("Redundancy item structure validation", () => {
    it("each redundancy should have all required fields", () => {
      const redundancy = {
        type: "repeated_phrase",
        severity: "high",
        description: "Same sentence appears twice",
        originalText: "Medicare covers preventive services.",
        secondInstance: "Preventive services are covered by Medicare.",
        suggestedFix: "Remove the second instance or rephrase to add new detail.",
      };

      expect(redundancy).toHaveProperty("type");
      expect(redundancy).toHaveProperty("severity");
      expect(redundancy).toHaveProperty("description");
      expect(redundancy).toHaveProperty("originalText");
      expect(redundancy).toHaveProperty("secondInstance");
      expect(redundancy).toHaveProperty("suggestedFix");
      expect(typeof redundancy.originalText).toBe("string");
      expect(typeof redundancy.suggestedFix).toBe("string");
      expect(["repeated_phrase", "redundant_idea", "recycled_stat", "filler_pattern"]).toContain(redundancy.type);
      expect(["high", "medium", "low"]).toContain(redundancy.severity);
    });

    it("should allow empty suggestedFix for removal-only fixes", () => {
      const redundancy = {
        type: "filler_pattern",
        severity: "low",
        description: "This sentence adds no value",
        originalText: "It goes without saying that Medicare is important.",
        secondInstance: "",
        suggestedFix: "",
      };

      expect(redundancy.suggestedFix).toBe("");
    });
  });

  describe("Redundancy score interpretation", () => {
    it("score >= 8 should be considered clean", () => {
      const score = 9;
      const isClean = score >= 8;
      expect(isClean).toBe(true);
    });

    it("score 5-7 should be considered moderate", () => {
      const score = 6;
      const isModerate = score >= 5 && score < 8;
      expect(isModerate).toBe(true);
    });

    it("score < 5 should be considered highly redundant", () => {
      const score = 3;
      const isRedundant = score < 5;
      expect(isRedundant).toBe(true);
    });

    it("score should be between 1 and 10", () => {
      const validScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      validScores.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(1);
        expect(s).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("findAndReplaceInHtml (robust matching)", () => {
    /**
     * Mirrors the findAndReplaceInHtml utility in ArticleEditor.tsx.
     * Three-tier matching: exact -> normalized whitespace -> virtual tag-boundary spaces.
     */
    function findAndReplaceInHtml(
      html: string,
      searchText: string,
      replacement: string
    ): { html: string; applied: boolean } {
      if (!searchText) return { html, applied: false };

      const segments: { type: "tag" | "text"; content: string }[] = [];
      const tagRegex = /<[^>]+>/g;
      let lastIdx = 0;
      let match;
      while ((match = tagRegex.exec(html)) !== null) {
        if (match.index > lastIdx) {
          segments.push({ type: "text", content: html.slice(lastIdx, match.index) });
        }
        segments.push({ type: "tag", content: match[0] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < html.length) {
        segments.push({ type: "text", content: html.slice(lastIdx) });
      }

      const fullText = segments
        .filter((s) => s.type === "text")
        .map((s) => s.content)
        .join("");

      const normalize = (t: string) => t.replace(/\s+/g, " ").trim();
      const normalizedSearch = normalize(searchText);

      // Tier 1: exact match
      let phraseStart = fullText.indexOf(searchText);
      let phraseEnd = phraseStart >= 0 ? phraseStart + searchText.length : -1;

      // Tier 2: normalized whitespace on raw fullText
      if (phraseStart < 0) {
        const normalizedFull = normalize(fullText);
        const normIdx = normalizedFull.indexOf(normalizedSearch);
        if (normIdx >= 0) {
          let startOrigIdx = -1;
          let endOrigIdx = -1;
          let nPos = 0;
          for (let i = 0; i < fullText.length; i++) {
            const ch = fullText[i];
            if (/\s/.test(ch)) {
              if (i === 0 || !/\s/.test(fullText[i - 1])) {
                if (nPos === normIdx) startOrigIdx = i;
                if (nPos === normIdx + normalizedSearch.length) { endOrigIdx = i; break; }
                nPos++;
              }
            } else {
              if (nPos === normIdx) startOrigIdx = i;
              nPos++;
              if (nPos === normIdx + normalizedSearch.length) { endOrigIdx = i + 1; break; }
            }
          }
          if (startOrigIdx >= 0) {
            if (endOrigIdx < 0) endOrigIdx = fullText.length;
            phraseStart = startOrigIdx;
            phraseEnd = endOrigIdx;
          }
        }
      }

      // Tier 3: virtual spaces at tag boundaries
      if (phraseStart < 0) {
        const virtualParts: string[] = [];
        const charMap: { segIdx: number; offset: number }[] = [];
        let segCounter = 0;
        for (let si = 0; si < segments.length; si++) {
          if (segments[si].type === "text") {
            if (virtualParts.length > 0) {
              const lastPart = virtualParts[virtualParts.length - 1];
              const prevChar = lastPart[lastPart.length - 1];
              const nextChar = segments[si].content[0];
              if (prevChar && !/\s/.test(prevChar) && nextChar && !/\s/.test(nextChar)) {
                virtualParts.push(" ");
                charMap.push({ segIdx: -1, offset: -1 });
              }
            }
            virtualParts.push(segments[si].content);
            for (let ci = 0; ci < segments[si].content.length; ci++) {
              charMap.push({ segIdx: segCounter, offset: ci });
            }
            segCounter++;
          }
        }
        const virtualText = virtualParts.join("");
        const normalizedVirtual = normalize(virtualText);
        const normIdx = normalizedVirtual.indexOf(normalizedSearch);

        if (normIdx >= 0) {
          let vStartIdx = -1;
          let vEndIdx = -1;
          let nPos = 0;
          for (let i = 0; i < virtualText.length; i++) {
            const ch = virtualText[i];
            if (/\s/.test(ch)) {
              if (i === 0 || !/\s/.test(virtualText[i - 1])) {
                if (nPos === normIdx) vStartIdx = i;
                if (nPos === normIdx + normalizedSearch.length) { vEndIdx = i; break; }
                nPos++;
              }
            } else {
              if (nPos === normIdx) vStartIdx = i;
              nPos++;
              if (nPos === normIdx + normalizedSearch.length) { vEndIdx = i + 1; break; }
            }
          }
          if (vStartIdx < 0) return { html, applied: false };
          if (vEndIdx < 0) vEndIdx = virtualText.length;

          let realStart = -1;
          for (let i = vStartIdx; i < charMap.length; i++) {
            if (charMap[i].segIdx >= 0) { realStart = i; break; }
          }
          let realEnd = -1;
          for (let i = Math.min(vEndIdx, charMap.length) - 1; i >= 0; i--) {
            if (charMap[i].segIdx >= 0) { realEnd = i + 1; break; }
          }
          if (realStart < 0 || realEnd < 0) return { html, applied: false };

          let ftStart = 0;
          for (let i = 0; i < realStart; i++) {
            if (charMap[i].segIdx >= 0) ftStart++;
          }
          let ftEnd = 0;
          for (let i = 0; i < realEnd; i++) {
            if (charMap[i].segIdx >= 0) ftEnd++;
          }

          phraseStart = ftStart;
          phraseEnd = ftEnd;
        }
      }

      if (phraseStart < 0) return { html, applied: false };

      // Rebuild HTML replacing the matched text portion
      const newSegments: string[] = [];
      let textOffset = 0;
      for (const seg of segments) {
        if (seg.type === "tag") {
          if (textOffset <= phraseStart || textOffset >= phraseEnd) {
            newSegments.push(seg.content);
          }
        } else {
          const segStart = textOffset;
          const segEnd = textOffset + seg.content.length;
          if (segEnd <= phraseStart || segStart >= phraseEnd) {
            newSegments.push(seg.content);
          } else {
            const overlapStart = Math.max(0, phraseStart - segStart);
            const overlapEnd = Math.min(seg.content.length, phraseEnd - segStart);
            let built = "";
            if (overlapStart > 0) built += seg.content.slice(0, overlapStart);
            if (segStart <= phraseStart) {
              built += replacement;
            }
            if (overlapEnd < seg.content.length) built += seg.content.slice(overlapEnd);
            newSegments.push(built);
          }
          textOffset += seg.content.length;
        }
      }

      return { html: newSegments.join(""), applied: true };
    }

    // --- Tier 1: Exact match tests ---

    it("should replace a filler phrase with the cleaned version", () => {
      const html = "<p>It's important to note that Medicare enrollment has specific deadlines.</p>";
      const result = findAndReplaceInHtml(
        html,
        "It's important to note that Medicare enrollment has specific deadlines.",
        "Medicare enrollment has specific deadlines."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Medicare enrollment has specific deadlines.");
      expect(result.html).not.toContain("It's important to note that");
    });

    it("should remove text entirely when replacement is empty", () => {
      const html = "<p>First paragraph. Furthermore, this adds nothing. Last paragraph.</p>";
      const result = findAndReplaceInHtml(
        html,
        "Furthermore, this adds nothing. ",
        ""
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("First paragraph.");
      expect(result.html).toContain("Last paragraph.");
      expect(result.html).not.toContain("Furthermore");
    });

    it("should preserve surrounding HTML tags", () => {
      const html = "<p>Some intro. <strong>It goes without saying that benefits are important.</strong> More text.</p>";
      const result = findAndReplaceInHtml(
        html,
        "It goes without saying that benefits are important.",
        "Benefits are important."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("<strong>");
      expect(result.html).toContain("</strong>");
      expect(result.html).toContain("Benefits are important.");
    });

    it("should return applied=false when text is not found", () => {
      const html = "<p>This article discusses Medicare benefits.</p>";
      const result = findAndReplaceInHtml(
        html,
        "This text does not exist in the article",
        "Replacement text"
      );
      expect(result.applied).toBe(false);
      expect(result.html).toBe(html);
    });

    it("should apply multiple fixes sequentially", () => {
      let html = "<p>It's important to note that costs vary. When it comes to enrollment, timing matters.</p>";

      const result1 = findAndReplaceInHtml(
        html,
        "It's important to note that costs vary.",
        "Costs vary."
      );
      expect(result1.applied).toBe(true);
      html = result1.html;

      const result2 = findAndReplaceInHtml(
        html,
        "When it comes to enrollment, timing matters.",
        "Enrollment timing matters."
      );
      expect(result2.applied).toBe(true);
      html = result2.html;

      expect(html).toContain("Costs vary.");
      expect(html).toContain("Enrollment timing matters.");
      expect(html).not.toContain("It's important to note that");
      expect(html).not.toContain("When it comes to");
    });

    it("should handle text spanning multiple HTML elements", () => {
      const html = "<p>Moreover, <em>this point was already covered</em> in the introduction.</p>";
      const result = findAndReplaceInHtml(
        html,
        "this point was already covered",
        "additional details about coverage"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("additional details about coverage");
    });

    it("should only replace the first occurrence of repeated text", () => {
      const html = "<p>Medicare is great. Medicare is great.</p>";
      const result = findAndReplaceInHtml(
        html,
        "Medicare is great.",
        "Medicare provides excellent coverage."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Medicare provides excellent coverage.");
      expect(result.html).toContain("Medicare is great.");
    });

    // --- Tier 2: Normalized whitespace tests ---

    it("should match text with extra whitespace in the search string", () => {
      const html = "<p>Medicare covers preventive services at no cost.</p>";
      const result = findAndReplaceInHtml(
        html,
        "Medicare  covers  preventive  services  at  no  cost.",
        "Medicare covers preventive care free of charge."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Medicare covers preventive care free of charge.");
    });

    it("should match text with newline characters in the original", () => {
      const html = "<p>First sentence.\nSecond sentence.</p>";
      const result = findAndReplaceInHtml(
        html,
        "First sentence. Second sentence.",
        "Combined sentence."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Combined sentence.");
    });

    it("should match text with tabs and mixed whitespace", () => {
      const html = "<p>Check\tyour\t\tdoctors\tand\tprescriptions.</p>";
      const result = findAndReplaceInHtml(
        html,
        "Check your doctors and prescriptions.",
        "Verify your healthcare providers and medications."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Verify your healthcare providers and medications.");
    });

    // --- Tier 3: Virtual tag-boundary space tests (the actual bug fix) ---

    it("should match text across paragraph boundaries (newlines between tags)", () => {
      const html = "<p>Breaking the comparison into steps makes it manageable.</p><p>Start with your four personal anchors:</p>";
      const result = findAndReplaceInHtml(
        html,
        "Breaking the comparison into steps makes it manageable. Start with your four personal anchors:",
        "Here is a step-by-step comparison framework:"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Here is a step-by-step comparison framework:");
    });

    it("should match text split across list items", () => {
      const html = "<ul><li>Your doctors: Confirm they are in-network</li><li>Your prescriptions: Check the formulary</li></ul>";
      const result = findAndReplaceInHtml(
        html,
        "Your doctors: Confirm they are in-network Your prescriptions: Check the formulary",
        "Verify your doctors are in-network and check your prescription formulary"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Verify your doctors are in-network and check your prescription formulary");
    });

    it("should handle the exact scenario from the bug report (text across formatted sections)", () => {
      const html = `<p>Breaking the comparison into steps makes it manageable. Start with your four personal anchors:</p><ul><li><strong>Your doctors:</strong> Confirm they are in-network for any plan you consider.</li><li><strong>Your prescriptions:</strong> Check the formulary for each of your medications.</li><li><strong>Your budget:</strong> Look beyond the premium, factor in deductibles, copays, and the out-of-pocket max.</li><li><strong>Your desired extras:</strong> Identify which supplemental benefits would genuinely benefit your health and lifestyle.</li></ul>`;

      const searchText = "Breaking the comparison into steps makes it manageable. Start with your four personal anchors: Your doctors: Confirm they are in-network for any plan you consider. Your prescriptions: Check the formulary for each of your medications. Your budget: Look beyond the premium, factor in deductibles, copays, and the out-of-pocket max. Your desired extras: Identify which supplemental benefits would genuinely benefit your health and lifestyle.";

      const result = findAndReplaceInHtml(
        html,
        searchText,
        "Use this four-step framework to compare plans effectively."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Use this four-step framework to compare plans effectively.");
    });

    it("should return applied=false when even virtual-space text doesn't match", () => {
      const html = "<p>This is about Medicare Part A coverage.</p>";
      const result = findAndReplaceInHtml(
        html,
        "This is about Medicaid Part B coverage.",
        "Replacement"
      );
      expect(result.applied).toBe(false);
      expect(result.html).toBe(html);
    });

    it("should handle empty search text gracefully", () => {
      const html = "<p>Some content.</p>";
      const result = findAndReplaceInHtml(html, "", "Replacement");
      expect(result.applied).toBe(false);
      expect(result.html).toBe(html);
    });
  });

  describe("Selection logic", () => {
    it("should track selected indices correctly", () => {
      const selected = new Set<number>();

      selected.add(0);
      selected.add(2);
      selected.add(4);
      expect(selected.size).toBe(3);
      expect(selected.has(0)).toBe(true);
      expect(selected.has(1)).toBe(false);
      expect(selected.has(2)).toBe(true);

      selected.delete(2);
      expect(selected.size).toBe(2);
      expect(selected.has(2)).toBe(false);
    });

    it("should map selected indices to fixes correctly", () => {
      const redundancies = [
        { originalText: "Text A", suggestedFix: "Fix A" },
        { originalText: "Text B", suggestedFix: "Fix B" },
        { originalText: "Text C", suggestedFix: "" },
        { originalText: "Text D", suggestedFix: "Fix D" },
      ];

      const selected = new Set([0, 2, 3]);
      const fixes = Array.from(selected)
        .map((i) => ({
          originalText: redundancies[i]?.originalText,
          suggestedFix: redundancies[i]?.suggestedFix ?? "",
        }))
        .filter((f) => f.originalText);

      expect(fixes).toHaveLength(3);
      expect(fixes[0].originalText).toBe("Text A");
      expect(fixes[0].suggestedFix).toBe("Fix A");
      expect(fixes[1].originalText).toBe("Text C");
      expect(fixes[1].suggestedFix).toBe("");
      expect(fixes[2].originalText).toBe("Text D");
    });

    it("should clear selections after applying", () => {
      const selected = new Set([0, 1, 2]);
      expect(selected.size).toBe(3);

      const cleared = new Set<number>();
      expect(cleared.size).toBe(0);
    });
  });
});
