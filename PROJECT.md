# RankPilot — Project Specification

> **Read this file at the start of every session.** It documents the architecture, data models, conventions, and "do not touch" rules for the RankPilot application.

---

## Overview

RankPilot is an AI-powered SEO content platform built for content teams managing large-scale article production. It provides end-to-end tooling for keyword research, content generation, quality grading, internal linking, entity analysis, and scheduled publishing — all organized under a multi-project workspace.

The primary production deployment is at **contentwriter.teameip.com** (custom domain) and **rankdash-k2cydhqh.manus.space** (Manus default domain).

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript | Single-page app with wouter routing |
| Styling | Tailwind CSS 4 + shadcn/ui | Light theme, Plus Jakarta Sans font, indigo palette |
| State / API | tRPC 11 + TanStack Query | Type-safe RPC, superjson serialization |
| Backend | Express 4 + tRPC server | All API routes under `/api/trpc` |
| Database | TiDB (MySQL-compatible) | Drizzle ORM, schema-first migrations |
| Auth | Custom email/password | Independent of Manus OAuth; `app_users` table with bcrypt |
| LLM | Dual provider | Built-in Forge (Gemini) or Anthropic Claude, per-project setting |
| File Storage | AWS S3 | Via `storagePut`/`storageGet` helpers |
| Hosting | Manus managed | CloudRun-based; no persistent processes |

---

## File Structure

```
client/
  src/
    pages/              ← 25 page components (one per route)
    components/         ← 9 shared components (AppLayout, CrossCheckTab, etc.)
    contexts/           ← ThemeContext
    hooks/              ← Custom hooks
    lib/trpc.ts         ← tRPC client binding
    App.tsx             ← Routes + AuthGuard + ThemeProvider
    main.tsx            ← tRPC/QueryClient providers
    index.css           ← Global theme (CSS variables, fonts)

server/
    routers.ts          ← ALL tRPC procedures (~7,400 lines, 19 router sections)
    db.ts               ← Database query helpers
    storage.ts          ← S3 helpers
    _core/              ← Framework plumbing (DO NOT EDIT)
    *.test.ts           ← 35 vitest test files (497 tests)

drizzle/
    schema.ts           ← 15 database tables + TypeScript types
    relations.ts        ← Drizzle relation definitions
    migrations/         ← Generated SQL migrations

shared/
    const.ts            ← Shared constants
    types.ts            ← Shared type definitions
```

---

## Database Tables (15 total)

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Manus OAuth users (system-level) | openId, role, theme |
| `app_users` | Custom auth users (email/password) | email, passwordHash, role, isActive, mustChangePassword |
| `projects` | Multi-project workspace containers | name, domain, ICP fields, llmProvider, bannedPhrases, referenceDoc fields |
| `outlines` | Structured article outlines | sections (JSON), keyword, status (draft→approved→generating→complete) |
| `articles` | Full content pieces | content (HTML), keyword, metaTitle, metaDescription, slug, wordCount, status |
| `icp_profiles` | Ideal Customer Profiles | demographics, painPoints, goals, objections |
| `brand_voices` | Writing style configs | toneTraits, perspective, sentenceStyle, avoidList, writingStyleSample |
| `cta_templates` | Reusable call-to-action blocks | content, type, placement, buttonText |
| `sitemaps` | Parsed XML sitemaps | parsedUrls (JSON array), urlCount |
| `citation_sources` | Trusted reference URLs | name, url, description, category |
| `gsc_exports` | Google Search Console data | queries, pages, chartData, pre-computed categories |
| `scheduled_jobs` | Automated content generation | frequency, keywordSource, articleSettings, nextRunAt |
| `keyword_queue` | Ordered keyword list for jobs | keyword, sortOrder, status, generatedArticleId |
| `job_run_history` | Execution log per job run | keyword, status, articleId, durationMs |
| `scheduler_run_logs` | Step-level pipeline logs | step, level, message, metadata |
| `project_keywords` | Saved keywords with metrics | volume, cpc, competition, trendData, priority |

---

## API Router Sections (19 routers)

| Router | Purpose | Auth |
|---|---|---|
| `auth` | Login, logout, me, setTheme | Mixed |
| `adminUsers` | User management (create, list, update, delete) | Admin only |
| `projects` | Project CRUD + ICP + settings | Protected |
| `outlines` | Outline generation + management | Protected |
| `icpProfiles` | ICP profile CRUD | Protected |
| `brandVoices` | Brand voice CRUD | Protected |
| `ctaTemplates` | CTA template CRUD | Protected |
| `sitemaps` | Sitemap parsing + management | Protected |
| `citations` | Citation source CRUD | Protected |
| `crossCheck` | Reference doc management + article cross-checking | Protected |
| `redundancy` | Content redundancy detection | Protected |
| `articles` | Article CRUD + generation + regeneration + cross-references | Protected |
| `brokenLinks` | Link validation in articles | Protected |
| `linksAudit` | Internal/external link analysis | Protected |
| `thinContent` | Thin content detection + expansion | Protected |
| `entity` | Entity/NLP analysis of content | Protected |
| `grading` | GEO content grading (4-category, 120-point system) | Mixed (standalone is public) |
| `gsc` | Google Search Console data upload + analysis | Protected |
| `scheduler` | Scheduled job management + execution | Protected |

---

## Navigation Structure

The sidebar is organized into four sections:

**Main:** Dashboard, Projects, Calendar (coming soon)

**SEO Tools:** Keyword Research, Project Keywords, Keyword Auditor (coming soon), Competitor Analyzer (coming soon), Position Tracker (coming soon), GSC Analyzer, Keyword Insights (coming soon), Thin Content

**Content:** Generate, Articles, Outlines (coming soon), Topic Clusters (coming soon), Grade Content, Entity Analyzer

**Planning:** Ideas (coming soon)

**Admin:** User Management (admin-only, in settings dropdown), Project Settings, General Settings, Project Scheduler

---

## Key Conventions

### Authentication

RankPilot uses a **custom email/password auth system** independent of Manus OAuth. The `app_users` table stores credentials with bcrypt hashing. Admins create user accounts; there is no self-registration. First-login users are forced to change their password via `mustChangePassword` flag.

### LLM Usage

Each project can choose between two LLM providers:
- **Built-in Forge** (default) — Gemini via `invokeLLM()` from `server/_core/llm.ts`
- **Anthropic Claude** — Direct API calls using the `ANTHROPIC_API_KEY` env var

The `callLLM` helper in `routers.ts` abstracts this choice based on the project's `llmProvider` setting.

### Content Generation Pipeline

Article generation follows a multi-step pipeline:
1. **Keyword suggestion** (optional) — AI suggests secondary keywords
2. **Web research** (optional) — Fetches real-time data for the topic
3. **Outline generation** — Structured H2/H3 outline with entity-based sections
4. **Article generation** — Section-by-section HTML generation with internal linking
5. **Post-processing** — Em-dash removal, paragraph splitting, broken anchor fixing, link sanitization
6. **Auto-grading** (optional) — Grade + iterative improvement until target grade reached

### Grading System

The GEO Content Grader uses a 4-category system (base 100 points, up to 120 with bonuses):
- **E-E-A-T Trust Package** (30%) — Experience, expertise, authority, trust signals
- **Structural Optimization** (25%) — Headings, formatting, readability
- **Semantic Richness** (25%) — Entity coverage, topic depth
- **AI Extractability** (20%) — Featured snippet readiness, structured data
- **Brand Voice Alignment** (+10 bonus) — If brand voice is configured
- **ICP Alignment** (+10 bonus) — If ICP is configured

### Post-Processing Functions

All generated/improved content passes through these sanitizers (in order):
1. `stripEmDashes()` — Removes em dashes (Claude preference)
2. `fixBrokenAnchors()` — Repairs LLM-split URLs and orphaned fragments
3. `sanitizeInsertedLinks()` — Strips fabricated URLs, trims long anchor text
4. `stripWrappingStrongTags()` — Removes unwanted bold wrapping
5. `stripTargetBlank()` — Ensures links open in same tab
6. `splitLongParagraphs()` — Breaks paragraphs exceeding sentence threshold
7. `wrapBareTextInPTags()` — Wraps plain text in `<p>` tags for TipTap

### Cross-Reference System

Articles can be cross-checked against a project's reference document. The matching system uses a 5-strategy cascade:
1. Exact substring match
2. Trimmed match
3. HTML entity-decoded fuzzy match
4. Normalized whitespace match
5. Short prefix match (for long table text)

---

## Do Not Touch

- `server/_core/` — Framework plumbing (OAuth, context, Vite bridge, LLM helpers)
- `client/src/main.tsx` — tRPC/QueryClient provider setup
- `drizzle/migrations/` — Generated migration files (modify schema.ts instead)
- `vite.config.ts` — Build configuration
- `vitest.config.ts` — Test configuration

---

## Environment Variables

System-injected (do not hardcode):
- `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`
- `OWNER_OPEN_ID`, `OWNER_NAME`

Custom secrets:
- `ANTHROPIC_API_KEY` — For Claude LLM provider
- `KEYWORDS_EVERYWHERE_API_KEY` — For keyword research API

---

## Testing

- **Framework:** Vitest
- **Location:** `server/*.test.ts` (35 files, 497 tests)
- **Run:** `pnpm test`
- **Convention:** Every feature and bug fix must include TypeScript check (`npx tsc --noEmit`) and full test run before checkpoint

---

## Deployment

- Hosted on Manus (CloudRun-based)
- **No persistent processes** — `setInterval` / `node-cron` do not work in production
- Scheduled content generation uses Manus scheduled tasks that POST to `/api/scheduled/*` endpoints
- Static assets must be uploaded via `manus-upload-file --webdev` and referenced by CDN URL
- Publish via the Management UI "Publish" button after saving a checkpoint
