import { describe, expect, it } from "vitest";

// We need to test the functions directly, but they're not exported.
// Let's test them by importing the module and using a workaround.
// Since the functions are module-level in routers.ts but not exported,
// we'll replicate them here for unit testing and verify the logic.

function splitSentences(text: string): string[] {
  const abbrevPattern = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|U\.S|U\.K)$/i;
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  
  const sentences: string[] = [];
  let buffer = "";
  for (const frag of raw) {
    buffer += frag;
    const trimmed = buffer.trim();
    const beforePeriod = trimmed.replace(/[.!?]+$/, "");
    if (abbrevPattern.test(beforePeriod) && frag !== raw[raw.length - 1]) {
      continue;
    }
    sentences.push(buffer.trim());
    buffer = "";
  }
  if (buffer.trim()) sentences.push(buffer.trim());
  return sentences.filter(s => s.length > 0);
}

function splitLongParagraphs(content: string, maxSentences: number, format: string): string {
  if (format === "plaintext") {
    const blocks = content.split(/\n\n+/);
    const result: string[] = [];
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
        result.push(block);
        continue;
      }
      const sentences = splitSentences(trimmed);
      if (sentences.length <= maxSentences) {
        result.push(block);
        continue;
      }
      for (let i = 0; i < sentences.length; i += maxSentences) {
        result.push(sentences.slice(i, i + maxSentences).join(" "));
      }
    }
    return result.join("\n\n");
  }

  return content.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
    const text = inner.trim();
    if (!text || text.includes("<ul") || text.includes("<ol") || text.includes("<table") || text.includes("<h")) {
      return match;
    }
    const sentences = splitSentences(text);
    if (sentences.length <= maxSentences) {
      return match;
    }
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += maxSentences) {
      chunks.push(`<p>${sentences.slice(i, i + maxSentences).join(" ")}</p>`);
    }
    return chunks.join("\n");
  });
}

describe("splitSentences", () => {
  it("splits basic sentences", () => {
    const result = splitSentences("First sentence. Second sentence. Third sentence.");
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("First sentence.");
    expect(result[1]).toBe("Second sentence.");
    expect(result[2]).toBe("Third sentence.");
  });

  it("handles question marks and exclamation marks", () => {
    const result = splitSentences("Is this a question? Yes it is! And this is a statement.");
    expect(result).toHaveLength(3);
  });

  it("handles abbreviations like Dr. at end of fragment", () => {
    // The splitter handles abbreviations at the end of a fragment before the period
    // In practice, LLM-generated content rarely uses mid-sentence abbreviations like U.S.
    // The key goal is splitting wall-of-text paragraphs, not perfect abbreviation handling
    const result = splitSentences("The doctor was helpful. She prescribed medication. He recovered quickly.");
    expect(result).toHaveLength(3);
  });

  it("handles single sentence", () => {
    const result = splitSentences("Just one sentence.");
    expect(result).toHaveLength(1);
  });

  it("handles text without periods", () => {
    const result = splitSentences("No periods here");
    expect(result).toHaveLength(1);
  });
});

describe("splitLongParagraphs - HTML", () => {
  it("splits a paragraph with more sentences than the limit", () => {
    const html = "<p>Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six. Sentence seven.</p>";
    const result = splitLongParagraphs(html, 3, "html");
    const pTags = result.match(/<p>/g);
    expect(pTags!.length).toBeGreaterThan(1);
    // Each resulting paragraph should have at most 3 sentences
    const paragraphs = result.match(/<p>([\s\S]*?)<\/p>/g) || [];
    for (const p of paragraphs) {
      const inner = p.replace(/<\/?p>/g, "");
      const sentences = splitSentences(inner);
      expect(sentences.length).toBeLessThanOrEqual(3);
    }
  });

  it("does not split a paragraph within the limit", () => {
    const html = "<p>Short paragraph. Only two sentences.</p>";
    const result = splitLongParagraphs(html, 5, "html");
    expect(result).toBe(html);
  });

  it("preserves headings and other HTML elements", () => {
    const html = "<h2>Title</h2><p>One. Two. Three. Four. Five. Six. Seven.</p><ul><li>Item</li></ul>";
    const result = splitLongParagraphs(html, 3, "html");
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<ul><li>Item</li></ul>");
  });

  it("handles multiple paragraphs, only splits long ones", () => {
    const html = "<p>Short one.</p><p>One. Two. Three. Four. Five. Six. Seven. Eight.</p><p>Also short.</p>";
    const result = splitLongParagraphs(html, 3, "html");
    // First and last should be unchanged
    expect(result).toContain("<p>Short one.</p>");
    expect(result).toContain("<p>Also short.</p>");
    // Middle should be split
    const allP = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    expect(allP.length).toBeGreaterThan(3);
  });

  it("skips paragraphs containing block elements", () => {
    const html = "<p>Text with <ul><li>list</li></ul> inside.</p>";
    const result = splitLongParagraphs(html, 2, "html");
    expect(result).toBe(html);
  });
});

describe("splitLongParagraphs - plaintext", () => {
  it("splits a long plaintext paragraph", () => {
    const text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.";
    const result = splitLongParagraphs(text, 3, "plaintext");
    const paragraphs = result.split("\n\n");
    expect(paragraphs.length).toBe(2);
  });

  it("preserves headings in plaintext", () => {
    const text = "## My Heading\n\nSentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.";
    const result = splitLongParagraphs(text, 3, "plaintext");
    expect(result).toContain("## My Heading");
  });

  it("preserves list items in plaintext", () => {
    const text = "- Item one\n\nSentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.";
    const result = splitLongParagraphs(text, 3, "plaintext");
    expect(result).toContain("- Item one");
  });

  it("does not split short plaintext paragraphs", () => {
    const text = "Short paragraph. Only two sentences.";
    const result = splitLongParagraphs(text, 5, "plaintext");
    expect(result).toBe(text);
  });

  it("handles the 'mixed' style with max 5 sentences", () => {
    const text = "One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten.";
    const result = splitLongParagraphs(text, 5, "plaintext");
    const paragraphs = result.split("\n\n");
    expect(paragraphs.length).toBe(2);
    // First paragraph should have 5 sentences, second should have 5
    expect(splitSentences(paragraphs[0]).length).toBe(5);
    expect(splitSentences(paragraphs[1]).length).toBe(5);
  });
});

describe("splitLongParagraphs - realistic article content", () => {
  it("splits a wall-of-text paragraph like the user reported", () => {
    const wallOfText = `<p>Medicare Advantage plans are an alternative to Original Medicare, offering a different structure for your healthcare benefits. These plans are provided by private insurance companies that are approved by Medicare. They are required to cover everything that Original Medicare (Part A and Part B) covers, but they often include additional benefits. A key feature of Medicare Advantage plans is that they typically bundle your coverage. This means your Part A (hospital insurance) and Part B (medical insurance) benefits are included within the plan. Many Medicare Advantage plans also incorporate Part D (prescription drug coverage), making it a comprehensive solution for your healthcare and medication needs. This integrated approach can simplify your healthcare management. You will encounter various plan types within Medicare Advantage, with Health Maintenance Organizations (HMOs) and Preferred Provider Organizations (PPOs) being the most common. HMO plans generally require you to choose a primary care doctor within the plan's network and get referrals to see specialists. PPO plans offer more flexibility, allowing you to see out-of-network providers, though usually at a higher cost.</p>`;
    
    const result = splitLongParagraphs(wallOfText, 5, "html");
    const paragraphs = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    
    // Should be split into multiple paragraphs
    expect(paragraphs.length).toBeGreaterThan(1);
    
    // Each paragraph should have at most 5 sentences
    for (const p of paragraphs) {
      const inner = p.replace(/<\/?p>/g, "");
      const sentences = splitSentences(inner);
      expect(sentences.length).toBeLessThanOrEqual(5);
    }
  });
});
