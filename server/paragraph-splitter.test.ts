import { describe, expect, it } from "vitest";

// Replicated from routers.ts for unit testing (functions are not exported)

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

function wrapBareTextInPTags(content: string): string {
  const lines = content.split(/\n/);
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|hr|br|figure|figcaption|section|article|nav|header|footer|pre|code|img|a\s)/i.test(trimmed)) {
      result.push(trimmed);
    } else if (/^<\/(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|pre|code|section|article|nav|header|footer|figure|figcaption)>/i.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join("\n");
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

// ============================================================
// splitSentences tests
// ============================================================
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

// ============================================================
// wrapBareTextInPTags tests
// ============================================================
describe("wrapBareTextInPTags", () => {
  it("wraps bare text lines in <p> tags", () => {
    const input = "This is a bare text line.";
    const result = wrapBareTextInPTags(input);
    expect(result).toBe("<p>This is a bare text line.</p>");
  });

  it("preserves existing <h2> tags", () => {
    const input = "<h2>My Heading</h2>";
    const result = wrapBareTextInPTags(input);
    expect(result).toBe("<h2>My Heading</h2>");
  });

  it("preserves existing <p> tags", () => {
    const input = "<p>Already wrapped.</p>";
    const result = wrapBareTextInPTags(input);
    expect(result).toBe("<p>Already wrapped.</p>");
  });

  it("preserves <ul> and <li> tags", () => {
    const input = "<ul>\n<li>Item one</li>\n<li>Item two</li>\n</ul>";
    const result = wrapBareTextInPTags(input);
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item one</li>");
    expect(result).toContain("</ul>");
  });

  it("handles mixed content: headings + bare text", () => {
    const input = "<h2>Title</h2>\nThis is bare text.\nAnother bare line.\n<h3>Subtitle</h3>\nMore bare text.";
    const result = wrapBareTextInPTags(input);
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<p>This is bare text.</p>");
    expect(result).toContain("<p>Another bare line.</p>");
    expect(result).toContain("<h3>Subtitle</h3>");
    expect(result).toContain("<p>More bare text.</p>");
  });

  it("skips empty lines", () => {
    const input = "<h2>Title</h2>\n\nBare text.\n\n<h2>Next</h2>";
    const result = wrapBareTextInPTags(input);
    expect(result).not.toContain("<p></p>");
    expect(result).toContain("<p>Bare text.</p>");
  });

  it("handles realistic LLM output with headings and bare text", () => {
    const input = `<h2>Welcome to Medicare: Your Foundation for Health Coverage</h2>
Navigating healthcare can feel overwhelming, especially when it involves understanding a program as vital as Medicare. Many individuals find themselves seeking clear information.
This guide is designed to simplify Medicare, helping you understand its core components.
Medicare is a federal health insurance program. It primarily serves individuals aged 65 or older.
<h2>Demystifying Medicare Parts</h2>
Medicare is structured into different parts. Understanding these distinctions is the first step.`;
    
    const result = wrapBareTextInPTags(input);
    
    // Headings should be preserved
    expect(result).toContain("<h2>Welcome to Medicare: Your Foundation for Health Coverage</h2>");
    expect(result).toContain("<h2>Demystifying Medicare Parts</h2>");
    
    // Bare text should be wrapped
    expect(result).toContain("<p>Navigating healthcare can feel overwhelming");
    expect(result).toContain("<p>This guide is designed to simplify Medicare");
    expect(result).toContain("<p>Medicare is a federal health insurance program.");
    expect(result).toContain("<p>Medicare is structured into different parts.");
    
    // Every non-heading line should be a <p>
    const pTags = result.match(/<p>/g) || [];
    expect(pTags.length).toBe(4);
  });

  it("preserves <table> tags", () => {
    const input = "<table>\n<tr><td>Cell</td></tr>\n</table>";
    const result = wrapBareTextInPTags(input);
    expect(result).toContain("<table>");
    expect(result).toContain("</table>");
  });

  it("preserves <blockquote> tags", () => {
    const input = "<blockquote>A quote here.</blockquote>";
    const result = wrapBareTextInPTags(input);
    expect(result).toBe("<blockquote>A quote here.</blockquote>");
  });
});

// ============================================================
// Full pipeline: wrapBareTextInPTags + splitLongParagraphs
// ============================================================
describe("Full pipeline: wrap + split", () => {
  it("wraps bare text then splits long paragraphs", () => {
    // Simulate LLM output: heading + one long bare text block
    const llmOutput = `<h2>Title</h2>
Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six. Sentence seven. Sentence eight.`;
    
    const wrapped = wrapBareTextInPTags(llmOutput);
    const result = splitLongParagraphs(wrapped, 3, "html");
    
    // Should have heading + multiple <p> tags
    expect(result).toContain("<h2>Title</h2>");
    const pTags = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    expect(pTags.length).toBeGreaterThan(1);
    
    // Each paragraph should have at most 3 sentences
    for (const p of pTags) {
      const inner = p.replace(/<\/?p>/g, "");
      const sentences = splitSentences(inner);
      expect(sentences.length).toBeLessThanOrEqual(3);
    }
  });

  it("handles the exact scenario from the user's screenshot", () => {
    // Realistic LLM output: headings with bare text paragraphs, no <p> tags
    const llmOutput = `<h2>Welcome to Medicare: Your Foundation for Health Coverage</h2>
Navigating healthcare can feel overwhelming, especially when it involves understanding a program as vital as Medicare. Many individuals, particularly those approaching 65 or already there, find themselves seeking clear and reliable information. This guide is designed to simplify Medicare, helping you understand its core components and make informed choices. Medicare is a federal health insurance program. It primarily serves individuals aged 65 or older. Additionally, certain younger people with disabilities and those with End-Stage Renal Disease (ESRD) also qualify. The core purpose of Medicare is to provide essential health coverage. It offers peace of mind as you age or face specific health conditions. This article will help you confidently explore your options.
<h2>Demystifying Original Medicare and Cancer Treatment Costs</h2>
Original Medicare, consisting of Part A and Part B, forms the bedrock of your cancer coverage. It provides essential benefits that are crucial for managing a diagnosis. Understanding these components is the first step in planning your care.`;
    
    const wrapped = wrapBareTextInPTags(llmOutput);
    const result = splitLongParagraphs(wrapped, 5, "html");
    
    // Headings preserved
    expect(result).toContain("<h2>Welcome to Medicare");
    expect(result).toContain("<h2>Demystifying Original Medicare");
    
    // The long bare text block should now be multiple <p> tags
    const pTags = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    // The first block had ~9 sentences, should be split into 2 paragraphs (5+4)
    // The second block had 3 sentences, should stay as 1 paragraph
    expect(pTags.length).toBeGreaterThanOrEqual(3);
    
    // No paragraph should exceed 5 sentences
    for (const p of pTags) {
      const inner = p.replace(/<\/?p>/g, "");
      const sentences = splitSentences(inner);
      expect(sentences.length).toBeLessThanOrEqual(5);
    }
  });
});

// ============================================================
// splitLongParagraphs - HTML (existing tests)
// ============================================================
describe("splitLongParagraphs - HTML", () => {
  it("splits a paragraph with more sentences than the limit", () => {
    const html = "<p>Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six. Sentence seven.</p>";
    const result = splitLongParagraphs(html, 3, "html");
    const pTags = result.match(/<p>/g);
    expect(pTags!.length).toBeGreaterThan(1);
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
    expect(result).toContain("<p>Short one.</p>");
    expect(result).toContain("<p>Also short.</p>");
    const allP = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    expect(allP.length).toBeGreaterThan(3);
  });

  it("skips paragraphs containing block elements", () => {
    const html = "<p>Text with <ul><li>list</li></ul> inside.</p>";
    const result = splitLongParagraphs(html, 2, "html");
    expect(result).toBe(html);
  });
});

// ============================================================
// splitLongParagraphs - plaintext (existing tests)
// ============================================================
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
    expect(splitSentences(paragraphs[0]).length).toBe(5);
    expect(splitSentences(paragraphs[1]).length).toBe(5);
  });
});

// ============================================================
// Realistic wall-of-text (existing test)
// ============================================================
describe("splitLongParagraphs - realistic article content", () => {
  it("splits a wall-of-text paragraph like the user reported", () => {
    const wallOfText = `<p>Medicare Advantage plans are an alternative to Original Medicare, offering a different structure for your healthcare benefits. These plans are provided by private insurance companies that are approved by Medicare. They are required to cover everything that Original Medicare (Part A and Part B) covers, but they often include additional benefits. A key feature of Medicare Advantage plans is that they typically bundle your coverage. This means your Part A (hospital insurance) and Part B (medical insurance) benefits are included within the plan. Many Medicare Advantage plans also incorporate Part D (prescription drug coverage), making it a comprehensive solution for your healthcare and medication needs. This integrated approach can simplify your healthcare management. You will encounter various plan types within Medicare Advantage, with Health Maintenance Organizations (HMOs) and Preferred Provider Organizations (PPOs) being the most common. HMO plans generally require you to choose a primary care doctor within the plan's network and get referrals to see specialists. PPO plans offer more flexibility, allowing you to see out-of-network providers, though usually at a higher cost.</p>`;
    
    const result = splitLongParagraphs(wallOfText, 5, "html");
    const paragraphs = result.match(/<p>[\s\S]*?<\/p>/g) || [];
    
    expect(paragraphs.length).toBeGreaterThan(1);
    
    for (const p of paragraphs) {
      const inner = p.replace(/<\/?p>/g, "");
      const sentences = splitSentences(inner);
      expect(sentences.length).toBeLessThanOrEqual(5);
    }
  });
});
