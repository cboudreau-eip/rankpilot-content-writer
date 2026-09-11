# RankPilot — Project Specification

> **Read this file at the start of every session.** It documents the architecture, data models, conventions, and "do not touch" rules for the RankPilot application.

---

## Overview

RankPilot is an AI-powered SEO content platform built for content teams managing large-scale article production. It provides end-to-end tooling for keyword research, content generation, quality grading, internal linking, and entity analysis — all organized under a multi-project workspace.

The production deployment is at **contentwriter.teameip.com**, hosted on **Vercel** (migrated off the original Manus hosting; DNS now points directly at Vercel).

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript | Single-page app with wouter routing |
| Styling | Tailwind CSS 4 + shadcn/ui | Light theme, Plus Jakarta Sans font, indigo palette |
| State / API | tRPC 11 + TanStack Query | Type-safe RPC, superjson serialization |
| Backend | Express 4 + tRPC server | All API routes under `/api/trpc` |
| Database | TiDB Cloud Serverless (MySQL-compatible) | Drizzle ORM, schema-first migrations |
| Auth | Custom email/password | `app_users` table with bcrypt; independent of the unused legacy Manus OAuth `users` table |
| LLM | Anthropic Claude only | Direct API via `@anthropic-ai/sdk`; no other provider — the old Forge/Gemini path was removed during the Vercel migration |
| File Storage | AWS S3 (reference-doc backup only) | Currently non-functional in production — the code path depends on a Manus-only storage proxy not available on Vercel. Harmless: the DB (`referenceDocContent`) is the primary source of truth, S3 was always just a backup |
| Hosting | Vercel | Serverless Functions via the `/api` directory convention; auto-deploys from GitHub `main` |

---

## File Structure

```
client/
  src/
    pages/              ← 27 page components (one per route)
    components/         ← 10 shared components (AppLayout, ResearchFindingsPanel, etc.)
    contexts/           ← ThemeContext
    hooks/              ← Custom hooks
    lib/trpc.ts         ← tRPC client binding
    App.tsx             ← Routes + AuthGuard + ThemeProvider
    main.tsx            ← tRPC/QueryClient providers
    index.css           ← Global theme (CSS variables, fonts)

server/
    routers.ts          ← ALL tRPC procedures (~9,000 lines, 22 router sections)
    db.ts               ← Database query helpers
    storage.ts          ← S3 helpers (see File Storage note above — not functional in prod)
    _core/              ← Framework plumbing + the shared Express app builder (see Do Not Touch)
    *.test.ts           ← 43 vitest test files (~530 tests; some require env vars not set locally — see Testing)

api/
    trpc/[proc].js      ← Generated JS, committed to git (not hand-written) — see Deployment
    oauth/callback.js   ← Generated JS, committed to git (not hand-written) — see Deployment

drizzle/
    schema.ts           ← 14 database tables + TypeScript types
    relations.ts        ← Drizzle relation definitions
    migrations/         ← Generated SQL migrations

shared/
    const.ts            ← Shared constants
    types.ts            ← Shared type definitions
    research-types.ts   ← ResearchFindings type, shared between Generate and Free Writer

scripts/
    build-api.mjs       ← Bundles the Vercel API entry to plain JS (see Deployment)
```

---

## Database Tables (14 total)

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Legacy Manus OAuth users — not used for day-to-day login | openId, role, theme |
| `app_users` | Custom auth users (email/password) — the real login table | email, passwordHash, role, isActive, mustChangePassword |
| `projects` | Multi-project workspace containers | name, domain, ICP fields, llmProvider, llmModel, bannedPhrases, referenceDoc fields |
| `outlines` | Structured article outlines | sections (JSON), keyword, status (draft→approved→generating→complete) |
| `outline_versions` | Revision history for outlines | outlineId, versionNumber, sections snapshot, changeSummary |
| `articles` | Full content pieces | content (HTML), keyword, metaTitle, metaDescription, slug, wordCount, status |
| `icp_profiles` | Ideal Customer Profiles | demographics, painPoints, goals, objections |
| `brand_voices` | Writing style configs | toneTraits, perspective, sentenceStyle, avoidList, writingStyleSample |
| `cta_templates` | Reusable call-to-action blocks | content, type, placement, buttonText |
| `sitemaps` | Parsed XML sitemaps | parsedUrls (JSON array), urlCount |
| `citation_sources` | Trusted reference URLs | name, url, description, category |
| `gsc_exports` | Google Search Console data | queries, pages, chartData, pre-computed categories |
| `project_keywords` | Saved keywords with metrics | volume, cpc, competition, trendData, priority |
| `ideas` | AI-generated article ideas | title, keyword, searchIntent, contentAngles, status (saved/used/archived) |

The Content Engine feature (in-app scheduler + Pipeline brief-intake) was removed entirely; its seven
tables (`scheduled_jobs`, `keyword_queue`, `job_run_history`, `scheduler_run_logs`, `pipeline_jobs`,
`pipeline_settings`, `pipeline_briefs`) no longer exist.

---

## API Router Sections (22 routers)

| Router | Purpose | Auth |
|---|---|---|
| `auth` | Login, logout, me, setTheme | Mixed |
| `adminUsers` | User management (create, list, update, delete) | Admin only |
| `projects` | Project CRUD + ICP + settings | Protected |
| `outlines` | Outline generation + management + research (`researchTopic`) | Protected |
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
| `entity` | Entity/NLP analysis of content + keyword research (Keywords Everywhere) | Protected |
| `grading` | GEO content grading (4-category, 120-point system) | Mixed (standalone is public) |
| `gsc` | Google Search Console data upload + analysis | Protected |
| `ideas` | AI-generated article idea suggestions | Protected |
| `dashboard` | Dashboard stats, recent activity, charts | Protected |
| `freeWriter` | Free-form content generation (LinkedIn, Medium, email, etc.) outside the outline pipeline | Mixed |
| `aiReadiness` | Audits a URL's schema markup, content structure, and internal linking for AI readiness | Protected |

---

## Navigation Structure

The sidebar is organized into four sections (`client/src/components/AppLayout.tsx`):

**Main:** Dashboard, Projects, Calendar

**SEO Tools:** Keyword Research, Project Keywords, GSC Analyzer, Thin Content

**Content:** Generate, Free Writer, Articles, Outlines, Topic Clusters, Grade Content, AI Readiness Audit, Entity Analyzer

**Planning:** Ideas

**Admin** (in the settings dropdown, not the main sidebar): User Management (admin-only), Project Settings, General Settings

---

## Key Conventions

### Authentication

RankPilot uses a **custom email/password auth system**. The `app_users` table stores credentials with bcrypt hashing. Admins create user accounts; there is no self-registration. First-login users are forced to change their password via `mustChangePassword` flag. The legacy `users` (Manus OAuth) table still exists and is still referenced by `userId` columns on content tables (projects, articles, etc.), but nothing in the app signs a user in through it anymore.

**Known limitation:** several procedures (`projects.list`, `articles.create`, `freeWriter.saveAsArticle`) hardcode `userId: 1` rather than deriving it from the session. In practice this means only one user's projects/content are ever visible anywhere in the app, regardless of who else has an `app_users` or legacy `users` row. This predates the Vercel migration and hasn't been changed — it's a real product decision (single-tenant vs. multi-user scoping) that needs a deliberate call before touching it.

### LLM Usage

All generation goes through Anthropic Claude directly (`invokeLLM()` in `server/_core/llm.ts`). A project can pin a specific model via its `llmModel` field (checked by the `callLLM()` helper in `routers.ts`); if unset, it falls back to `invokeLLM()`'s default model. There is no other provider — the original dual Forge/Gemini-or-Claude setup was collapsed to Claude-only when this app moved off Manus.

### Content Generation Pipeline

Article generation (the "Generate" page) follows a multi-step pipeline:
1. **Keyword suggestion** (optional) — AI suggests secondary keywords
2. **Web research** (optional) — `outlines.researchTopic` fetches statistics, authoritative sources, experts, and common questions
3. **Outline generation** — Structured H2/H3 outline with entity-based sections
4. **Article generation** — Section-by-section HTML generation with internal linking
5. **Post-processing** — Em-dash removal, paragraph splitting, broken anchor fixing, link sanitization
6. **Auto-grading** (optional) — Grade + iterative improvement until target grade reached

**Free Writer** (`/write`) is a separate, lighter-weight path for one-off content (LinkedIn posts, Medium articles, email newsletters, etc.) outside the outline-based flow. It shares the same research step, the same HTML-format-aware post-processing, and the same project Brand Voice/ICP inputs, but generates in a single LLM call rather than section-by-section. Generated content can be saved directly as a real `Article` via `freeWriter.saveAsArticle` (which also generates SEO meta title/description before saving).

### Grading System

The GEO Content Grader uses a 4-category system (base 100 points, up to 120 with bonuses):
- **E-E-A-T Trust Package** (30%) — Experience, expertise, authority, trust signals
- **Structural Optimization** (25%) — Headings, formatting, readability
- **Semantic Richness** (25%) — Entity coverage, topic depth
- **AI Extractability** (20%) — Featured snippet readiness, structured data
- **Brand Voice Alignment** (+10 bonus) — If brand voice is configured
- **ICP Alignment** (+10 bonus) — If ICP is configured

### Post-Processing Functions

Generated/improved HTML content passes through these sanitizers (in order) — module-level functions in
`routers.ts`, shared between the main Generate flow and Free Writer:
1. `stripEmDashes()` — Removes em dashes (Claude preference)
2. `fixBrokenAnchors()` — Repairs LLM-split URLs and orphaned fragments
3. `sanitizeInsertedLinks()` — Strips fabricated URLs, trims long anchor text
4. `stripWrappingStrongTags()` — Removes unwanted bold wrapping
5. `stripTargetBlank()` — Ensures links open in same tab
6. `splitLongParagraphs()` — Breaks paragraphs exceeding sentence threshold (format-aware: HTML `<p>` tags vs. plain-text double-newlines)
7. `wrapBareTextInPTags()` — Wraps plain text in `<p>` tags for TipTap — **do not run this on Markdown content** (e.g. Free Writer's "medium" format uses `## heading` syntax, which this would corrupt into `<p>## heading</p>`)

### Cross-Reference System

Articles can be cross-checked against a project's reference document. The matching system uses a 5-strategy cascade:
1. Exact substring match
2. Trimmed match
3. HTML entity-decoded fuzzy match
4. Normalized whitespace match
5. Short prefix match (for long table text)

---

## Do Not Touch

- `server/_core/` — Framework plumbing (OAuth, context, Vite bridge, LLM helpers, cookies). This includes
  `app.ts` (the shared `createApiApp()` Express builder) and `vercel-entry.ts` (the Vercel bundling entry
  point) — both were added deliberately during the Vercel migration and are load-bearing for production.
  Changes here need to be understood end-to-end, not made casually during unrelated feature work.
- `client/src/main.tsx` — tRPC/QueryClient provider setup
- `drizzle/migrations/` — Generated migration files (modify schema.ts instead)
- `vite.config.ts` — Build configuration
- `vitest.config.ts` — Test configuration (note: has no env-loading setup at all — see Testing)

---

## Environment Variables

Required, in both local `.env` and Vercel's dashboard (Production + Preview):
- `DATABASE_URL` — TiDB Cloud Serverless connection string
- `JWT_SECRET` — Custom-auth session signing
- `ANTHROPIC_API_KEY` — Claude API access
- `KEYWORDS_EVERYWHERE_API_KEY` — Keyword research/volume data

Referenced by code or tests but not currently configured anywhere (features depending on these are
broken or untested until someone sets them up): `CMS_PASSWORD`, AWS S3 credentials
(`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_DEFAULT_REGION`).

The old Manus-injected variables (`OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_URL`/`KEY`,
`VITE_FRONTEND_FORGE_API_URL`/`KEY`, `OWNER_OPEN_ID`/`NAME`, `VITE_APP_ID`) are no longer set or used —
the code paths that read them (legacy Manus OAuth, the Forge LLM proxy) are dead now that auth and LLM
calls go through the custom/Claude-direct paths.

---

## Testing

- **Framework:** Vitest
- **Location:** `server/*.test.ts` (43 files, ~530 tests)
- **Run:** `pnpm test`
- **Convention:** Every feature and bug fix must include a TypeScript check (`npx tsc --noEmit`) and a
  test run before considering the work done.
- **Known gap:** `vitest.config.ts` has no env-loading setup, and several integration-style tests
  (`cmsPublish`, `s3-credentials`, `keywords-everywhere`, and others) expect real credentials that are
  either missing from the local `.env` (see Environment Variables) or simply aren't loaded into the test
  process. Roughly 30 tests currently fail locally for this reason — this predates and is unrelated to
  any specific feature's correctness. When verifying a change, prefer running the specific test file(s)
  for what you touched rather than trusting a full-suite failure count.

---

## Deployment

- **Hosted on Vercel**, connected to the `cboudreau-eip/rankpilot-content-writer` GitHub repo — every
  push to `main` auto-deploys.
- **Frontend**: `vite build` outputs the static SPA to `dist/public`, which `vercel.json`'s
  `outputDirectory` points at. A rewrite sends any non-`/api/*` path to `index.html` for client-side
  routing.
- **Backend**: the Express app (`server/_core/app.ts`'s `createApiApp()`) is deployed via Vercel's
  `/api` directory convention, not the framework-level "zero-config Express" detection (that path
  didn't work reliably with this project's custom `outputDirectory`). The actual deployed files —
  `api/trpc/[proc].js` and `api/oauth/callback.js` — are pre-bundled to plain JS by
  `scripts/build-api.mjs` (run as part of `pnpm build`, from source at `server/_core/vercel-entry.ts`)
  and **committed to git as generated output**, not gitignored — gitignoring them was tried first and
  Vercel silently never saw the function at all, so they're checked in and regenerated fresh by the
  build script on every `pnpm build` to stay in sync with source. They ship as `.js` rather than `.ts`
  because Vercel's `/api` builder runs its own TypeScript diagnostic pass on `.ts` entry files that
  fails on this project's types in a way `tsc --noEmit` does not, silently skipping the function build.
  Both are single-segment routes (not a `[...path]` catch-all) because this Vercel project's catch-all
  handling only matched one path segment, not the documented multi-segment behavior — confirmed
  empirically, not from docs.
- **Local dev / traditional hosting** still works via `server/_core/index.ts` (`pnpm dev` / `pnpm start`),
  which layers Vite dev-middleware or static serving on top of the same shared `createApiApp()`.
- No persistent processes (no scheduler, no `setInterval` background jobs) — the Content Engine
  scheduler feature was removed entirely rather than adapted, since it's not compatible with serverless
  hosting anyway.
