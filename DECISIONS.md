# RankPilot — Design Decisions Log

> This file documents the reasoning behind key architectural and design decisions. Consult it before making changes that touch these areas to avoid regressions or contradictions.

---

## Authentication: Custom Email/Password Instead of Manus OAuth

**Decision:** Built a standalone `app_users` table with bcrypt password hashing, replacing the default Manus OAuth flow for end-user authentication.

**Rationale:** RankPilot is a multi-user team tool where the owner creates accounts for team members. Manus OAuth requires each user to have a Manus account, which doesn't fit the use case. The custom auth system supports admin-created accounts, forced password changes on first login, and account deactivation — none of which Manus OAuth provides.

**Impact:** The `users` table (Manus OAuth) still exists for system-level owner authentication but is not used for day-to-day app login. The `app_users` table is the primary auth source. Login is at `/login`, not the Manus OAuth portal.

---

## LLM Provider: Dual-Provider Architecture (Forge + Claude)

**Decision:** Each project can independently choose between the built-in Forge LLM (Gemini) or Anthropic Claude.

**Rationale:** Different content types and clients have different quality/cost tradeoffs. Claude produces higher-quality long-form content but is slower and more expensive. Forge is faster and free (included with Manus). The per-project toggle lets users optimize per use case.

**Impact:** The `callLLM` abstraction in `routers.ts` checks `project.llmProvider` and routes to either `invokeLLM()` (Forge) or the Anthropic API. Both return the same OpenAI-compatible response shape.

---

## Content Generation: Entity-Based Outlines with Section-by-Section Generation

**Decision:** Articles are generated section-by-section (one LLM call per H2/H3 section) rather than in a single prompt.

**Rationale:** Single-prompt generation for 2,000+ word articles produces quality degradation in later sections as the LLM loses focus. Section-by-section generation keeps each call focused, allows per-section AI instructions, and supports template types (pro-tip boxes, coverage cards, summary sections). It also enables the "regenerate section" feature in the editor.

**Impact:** Generation is slower (multiple LLM calls) but significantly higher quality. Each section receives the full article context built so far, maintaining coherence.

---

## Outline Sections: Template Types for Structured Content

**Decision:** Outline sections support a `templateType` field (`pro-tip`, `summary`, `use-cases`, `coverage-card`) that triggers special HTML rendering during generation.

**Rationale:** SEO content benefits from structured, visually distinct blocks (callout boxes, comparison cards, summary panels). Rather than relying on the LLM to spontaneously create these, we define them in the outline and inject specific HTML/CSS instructions per template type during generation.

**Impact:** The `applyTemplateStyles()` post-processor and `buildOutlineText()` helper handle template-specific prompt injection and HTML wrapping.

---

## Em Dash Removal: Automatic Post-Processing

**Decision:** All generated content automatically has em dashes (`—`, `–`, `&#8211;`, `&#8212;`) stripped and replaced with appropriate alternatives.

**Rationale:** The owner's brand voice explicitly prohibits em dashes. Claude in particular uses them heavily. Rather than relying on prompt instructions (which the LLM often ignores), we enforce this as a deterministic post-processing step that runs on every generated article.

**Impact:** `stripEmDashes()` runs in the post-processing pipeline for manual generation. This is a hard requirement — do not remove or make optional.

---

## Cross-Reference Matching: 5-Strategy Cascade

**Decision:** When applying cross-reference edits (replacing text in articles based on reference document checks), the system tries 5 matching strategies in sequence.

**Rationale:** The LLM sees decoded plain text but the article HTML contains encoded entities (`&gt;`, `&#8211;`), table cell boundaries fragment text differently, and whitespace varies. A single exact-match strategy fails on ~30% of replacements. The cascade (exact → trimmed → entity-decoded → normalized → prefix) catches 95%+ of cases.

**Strategies:**
1. Exact substring match
2. Trimmed whitespace match
3. HTML entity-decoded fuzzy match (via `decodeHtmlEntities()` + `normalizeForMatch()`)
4. Normalized whitespace match
5. Short prefix match for long table text (first 80 chars)

**Impact:** Added in response to user-reported "text not found" errors. The functions `decodeHtmlEntities()` and `normalizeForMatch()` are critical — do not simplify.

---

## Citation Links: URL Validation + Anchor Text Sanitization

**Decision:** All LLM-inserted hyperlinks pass through `sanitizeInsertedLinks()` which (a) strips links whose domain doesn't match any project citation source, and (b) trims anchor text exceeding 10 words.

**Rationale:** LLMs consistently fabricate URLs (inventing plausible but non-existent paths) and wrap entire sentences as anchor text despite explicit prompt instructions. The post-processing sanitizer acts as a safety net that catches what prompt engineering cannot prevent.

**Impact:** The grading prompts also instruct the LLM to use only exact URLs from the citation sources list and limit anchor text to 2-7 words. The sanitizer is the enforcement layer.

---

## Grading System: 4-Category with Optional Bonuses

**Decision:** The GEO Content Grader uses a base 100-point system across 4 categories, with up to 20 bonus points for Brand Voice Alignment (+10) and ICP Alignment (+10) when those are configured.

**Rationale:** Not all projects have brand voice or ICP profiles set up. Making these bonus categories (rather than required) means the grading system works out of the box for any content, while rewarding projects that have invested in configuration. The 4 base categories (E-E-A-T, Structure, Semantics, AI Extractability) cover the universal GEO/AIO optimization factors.

**Impact:** Total possible score is 100 (no bonuses), 110 (one bonus), or 120 (both bonuses). Grade bands (A+, A, B+, etc.) are calculated relative to the project's total possible points.

---

## UI Design: Light Theme, Clean Studio Aesthetic

**Decision:** Light mode default with Plus Jakarta Sans font, indigo/purple accent palette, generous whitespace, card-based layouts.

**Rationale:** Owner preference for modern, clean design inspired by ClickUp/Notion. Light backgrounds improve readability for content-heavy workflows. The indigo palette provides professional warmth without being generic blue.

**Impact:** ThemeProvider defaults to `light`. Dark mode is supported via theme toggle but light is the primary design target. All new UI should be designed light-first.

---

## Sidebar Navigation: Persistent Collapsible Sidebar

**Decision:** Used a custom `AppLayout` with persistent sidebar rather than the template's `DashboardLayout`.

**Rationale:** RankPilot has 20+ navigation items across 4 sections (Main, SEO Tools, Content, Planning). The template's DashboardLayout was too simple for this density. The custom sidebar supports collapsible sections, project selector dropdown, theme toggle, and admin-only items.

**Impact:** `AppLayout.tsx` is the main layout wrapper. Do not replace with DashboardLayout. The `navSections` array in AppLayout defines all navigation — add new pages there.

---

## Internal Linking: Sitemap-Based Auto-Linking

**Decision:** Article generation can automatically insert internal links by selecting relevant URLs from the project's parsed sitemap.

**Rationale:** Internal linking is critical for SEO but tedious to do manually. By parsing the project's sitemap and passing relevant URLs to the LLM during generation, articles get contextually appropriate internal links without manual effort. The `minInternalLinks` project setting enforces a minimum floor.

**Impact:** The sitemap must be configured per project in Project Settings. The `buildInternalLinkingInstructions()` helper selects URLs from the sitemap and injects them into the generation prompt.

---

## Banned Phrases: Per-Project Blocklist

**Decision:** Each project can define a list of banned phrases that are checked during content generation and flagged in the grader.

**Rationale:** Different clients/brands have specific words or phrases they never want in their content (competitor names, outdated terminology, legally sensitive terms). A per-project blocklist catches these at generation time rather than requiring manual review.

**Impact:** Stored as JSON array in `projects.bannedPhrases`. Checked during article generation post-processing and surfaced in grading results.

---

## Reference Documents: DB as Source of Truth, S3 as Backup

**Decision:** Reference documents (for cross-checking) are stored in the database (`referenceDocContent` mediumtext column) as the primary source, with S3 as a backup.

**Rationale:** Initially stored only in S3, but this caused latency issues and occasional S3 read failures during cross-checking. Storing the full text in the DB makes reads instant and reliable. S3 backup exists for disaster recovery.

**Impact:** `crossCheck.getReferenceDoc` reads from DB first, falls back to S3. `crossCheck.updateReferenceDoc` writes to both. Do not remove the DB column in favor of S3-only storage.

---

## Keyword Research: Keywords Everywhere API

**Decision:** Keyword research uses the Keywords Everywhere API for volume, CPC, competition, and trend data.

**Rationale:** Keywords Everywhere provides affordable, accurate keyword metrics with a simple API. It supports bulk lookups (up to 100 keywords per call), trend data, and related keyword suggestions — all needed for the keyword research and project keywords features.

**Impact:** Requires `KEYWORDS_EVERYWHERE_API_KEY` env var. The API has rate limits and credit-based pricing — the UI batches requests appropriately.

---

## Post-Processing Pipeline Order

**Decision:** Content post-processing runs in a specific order that must be maintained.

**Order:**
1. `stripEmDashes()` — Remove em dashes first (before any other text manipulation)
2. `fixBrokenAnchors()` — Repair malformed links
3. `sanitizeInsertedLinks()` — Validate URLs and trim anchors
4. `stripWrappingStrongTags()` — Remove unwanted bold formatting
5. `stripTargetBlank()` — Normalize link targets
6. `splitLongParagraphs()` — Break up walls of text
7. `wrapBareTextInPTags()` — Ensure proper HTML structure

**Rationale:** Each step depends on the output of the previous. For example, `fixBrokenAnchors` must run before `sanitizeInsertedLinks` (can't validate a broken URL). `wrapBareTextInPTags` must run last (after all text modifications are complete).

**Impact:** Do not reorder. Do not skip steps. New post-processing functions should be inserted at the appropriate position in the pipeline, not appended blindly.

---

## "Coming Soon" Placeholder Pages

**Decision:** Unbuilt features show a styled "Coming Soon" page with a toast notification rather than being hidden from navigation.

**Rationale:** Showing the full planned navigation gives users a sense of the product's scope and roadmap. Hiding unbuilt features would make the app feel incomplete without communicating what's planned.

**Current placeholders:** Calendar, Keyword Auditor, Competitor Analyzer, Position Tracker, Keyword Insights, Outlines, Topic Clusters, Ideas

---

## Project Settings: Never Wipe on Update

**Decision:** System updates must never overwrite or reset existing project settings, brand voices, ICP profiles, or reference documents.

**Rationale:** Users invest significant time configuring projects. An update that resets these settings would be catastrophic and erode trust. This was established as a hard rule after an early incident where brand voices were duplicated during an update.

**Impact:** Any migration or schema change that touches project-related tables must be additive only. Never drop and recreate. Never insert default data that could conflict with existing records.
