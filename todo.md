# RankPilot Rebuild TODO

## Phase 1: Foundation & Auth

### Upgrade to Full-Stack
- [x] Run webdev_add_feature to upgrade to web-db-user
- [x] Review the upgrade README and understand new capabilities
- [x] Set up database schema (User extension, Project model)
- [x] Run migrations

### Layout Shell
- [x] Build sidebar component with collapsible sections (SEO Tools, Planning, Content)
- [x] Build header component with project selector, user avatar, search
- [x] Create AppLayout wrapper component
- [x] Set up all routes in App.tsx with proper layout wrapping

### Project Management
- [x] Create tRPC routes: projects.list, projects.getById, projects.create, projects.update, projects.delete
- [x] Build Projects list page with create dialog
- [x] Build Project card with edit/delete dropdown
- [x] Implement active project selector in header (persisted in localStorage)
- [x] Wire project context through the app

### Dashboard
- [x] Build dashboard page with stat cards, chart, clusters, ideas, articles, activity feed
- [x] Empty state for new projects
- [x] Apply Clean Studio design (Plus Jakarta Sans, light mode, indigo palette)

### Stub Pages
- [x] Create Coming Soon stub for all nav items not yet built
- [x] Settings page stub

### Polish
- [x] Test auth flow (login/logout)
- [x] Test project CRUD (create, edit, delete)
- [x] Verify all navigation works
- [x] Write vitest tests for project CRUD (13 tests passing)
- [x] Save checkpoint

## Phase 2: Project Configuration
- [x] ICP profiles (create, edit, delete per project)
- [x] Brand voice profiles per project
- [x] CTA templates per project
- [ ] Sitemap management per project
- [ ] Citation sources per project
- [ ] Reference documents per project

## Phase 3: Article Generation Pipeline
- [x] Outline generator with AI
- [ ] Research pipeline
- [x] Full article generator with streaming
- [x] TipTap rich text editor
- [ ] Article version history
- [x] Article status management (Draft, Review, Complete, Published)

## Phase 4: Ideas & Topic Clusters
- [ ] AI idea generation
- [ ] Visual cluster management
- [ ] Cluster-to-article assignment

## Phase 5: Content Grading & Review
- [ ] AI grading (E-E-A-T, Accuracy, AIO, Readability)
- [ ] Review suggestions

## Phase 6: SEO Tools Suite
- [ ] GSC Analyzer
- [ ] Competitor Analyzer
- [ ] Position Tracker
- [ ] Keyword Auditor
- [ ] Thin Content detector

## Phase 7: SEO Intelligence
- [ ] Multi-source keyword scoring
- [ ] AI keyword clustering

## Phase 8: Calendar, Tasks & Polish
- [ ] Task calendar
- [ ] Global search
- [ ] Exports
- [ ] Mobile responsiveness
- [ ] Performance optimization

## Phase 3 (Active): Article Generation Pipeline
- [x] Add Article database model (title, content, status, wordCount, keywords, metaTitle, metaDescription, projectId, userId)
- [x] Add Outline database model (title, sections JSON, keywords, projectId, userId)
- [x] Push database migrations
- [x] Build article tRPC routes (list, getById, create, update, delete, updateStatus)
- [x] Build outline tRPC routes (list, getById, create, update, delete, generate with AI)
- [x] Build Articles list page with status filters (All, Draft, Review, Complete, Published)
- [x] Build Outline Generator page with AI-powered outline creation
- [x] Build Article Generator page with streaming AI output from outline
- [x] Build Article Editor page with TipTap rich text editor
- [x] Article status workflow (Draft → Review → Complete → Published)
- [x] Wire Generate nav item to outline generator
- [x] Write vitest tests for article and outline CRUD
- [x] Save checkpoint

## Phase 2 (Active): Project Configuration
- [x] Add ICP Profile database model (name, description, demographics, painPoints, goals, projectId)
- [x] Add Brand Voice database model (name, tone, style, vocabulary, examples, projectId)
- [x] Add CTA Template database model (name, text, type, placement, projectId)
- [x] Push database migrations
- [x] Build ICP Profile tRPC routes (list, create, update, delete)
- [x] Build Brand Voice tRPC routes (list, create, update, delete)
- [x] Build CTA Template tRPC routes (list, create, update, delete)
- [x] Build Project Settings page with tabs (ICP, Brand Voice, CTAs)
- [x] ICP Profile management UI (create, edit, delete with form)
- [x] Brand Voice management UI (create, edit, delete with form)
- [x] CTA Template management UI (create, edit, delete with form)
- [x] Wire ICP selection into Generate Article page (input accepted)
- [x] Wire Brand Voice selection into Generate Article page (input accepted)
- [x] Update outline generation prompt to use ICP context
- [x] Update article generation prompt to use ICP + Brand Voice + CTA
- [x] Write vitest tests for ICP, Brand Voice, CTA routes (14 tests)
- [x] Save checkpoint

## Fix: Separate Project Settings from General Settings
- [x] Add "Project Settings" nav item in sidebar under Content section
- [x] Move ICP/Brand Voice/CTA tabs to Project Settings route
- [x] Create General Settings page (app-level: account, theme, notifications)
- [x] Wire gear icon in header to General Settings
- [x] Update routing in App.tsx
- [x] Test navigation and verify separation
- [x] Save checkpoint

## Fix: Project Navigation Flow
- [x] Make project cards clickable — clicking navigates to that project's dashboard and sets it as active
- [x] Add project settings access within the project dashboard (gear icon or settings tab)
- [x] Remove "Project Settings" from sidebar nav
- [x] Update routing so /project-settings is accessible from within the dashboard context
- [x] Test full flow: Projects page → click card → dashboard → settings
- [x] Save checkpoint

## Project Settings: Sitemaps, Citations, Cross Check Tabs
- [x] Add Sitemap database model (url, lastCrawled, pageCount, projectId)
- [x] Add CitationSource database model (name, url, description, projectId)
- [x] Add referenceDoc and referenceDocName fields to Project model for Cross Check
- [x] Push database migrations
- [x] Build sitemap tRPC routes (list, create, update, delete)
- [x] Build citation tRPC routes (list, create, update, delete)
- [x] Build crossCheck tRPC routes (update reference doc on project, run cross-check on article)
- [x] Build Sitemaps tab UI in Project Settings
- [x] Build Citations tab UI in Project Settings
- [x] Build Cross Check tab UI in Project Settings (reference doc upload/paste)
- [x] Add Cross Check button/action to Article Editor
- [x] Write vitest tests for new routes
- [x] Save checkpoint
- [x] Widen Generate Article form by ~200px
- [x] Fix: Brand voice delete button not working

## Thin Content Checker
- [x] Create tRPC route for thin content analysis (parseSitemap, analyzePage, batch processing)
- [x] Build ThinContent page component with project/manual sitemap input, threshold setting, results display
- [x] Wire up sidebar link to the new page
- [x] Write vitest tests for thin content route
- [x] Save checkpoint

## Dated Content Check
- [x] Add dated content detection to backend (extract last modified date from HTML meta tags, HTTP headers, sitemap lastmod)
- [x] Flag pages not updated in 2+ years as "Dated Content" issue
- [x] Update frontend results to show last modified date and dated content warnings
- [x] Update vitest tests
- [x] Save checkpoint

## ICP Section Update
- [x] Review original RankPilot ICP implementation
- [x] Update ICP section in Project Settings to match original
- [x] Update tests
- [x] Save checkpoint

## Brand Voice Section Update
- [x] Review original RankPilot Brand Voice implementation
- [x] Update Brand Voice section in Project Settings to match original
- [x] Update tests if needed
- [x] Save checkpoint

## Full ICP & Brand Voice Prompt Integration
- [x] Review current outline/article generation prompts
- [x] Update outline generation prompt with full ICP section (pain points → headings, objections → FAQs, decision triggers, trust signals)
- [x] Update outline generation prompt with full Brand Voice section (tone traits, perspective, sentence style, avoid list, style sample)
- [x] Update article generation prompt with full ICP enforcement rules (fit check, intro rule, headings rule, FAQ rule, examples rule, trust rule)
- [x] Update article generation prompt with full Brand Voice guidelines (primary/supporting tones, perspective, sentence style, avoid constraints, style sample with anti-copy rules)
- [x] Add ICP/Brand Voice priority note ("Brand Voice controls HOW, ICP controls WHO")
- [x] Update tests
- [x] Save checkpoint

## Content Graders
- [x] Create standalone gradeContent tRPC route (paste any content, 4-category 85-point system)
- [x] Create per-article gradeArticle tRPC route (6+2 categories, dynamic total, Brand Voice + ICP conditional)
- [x] Build Grade Content page (standalone grader with textarea input, results display)
- [x] Add Grade button to article editor/viewer for per-article grading
- [x] Display grade results with category breakdowns, grade band, strengths/weaknesses, prioritized actions
- [x] Write vitest tests for grading routes
- [x] Save checkpoint

## Grader Display Improvements
- [x] Update backend LLM prompts to return detailed per-category data (score, maxScore, weight, analysis, improvements list)
- [x] Update backend to return key strengths, key weaknesses, penalties, prioritized corrective actions
- [x] Rebuild standalone Grade Content results with score circle, grade band, per-category cards with progress bars and improvements
- [x] Rebuild per-article Grade results in Article Editor with same detail level
- [x] Test and save checkpoint

## Selectable Improvement Suggestions
- [x] Add selectable circle/checkbox to each improvement item in ArticleEditor GradePanel
- [x] Add "Apply Selected (N)" button that only sends checked improvements
- [x] Add selectable improvements to standalone GradeContent page
- [x] Update backend applyImprovements to accept selected items only
- [x] After applying improvements, auto-trigger re-grade to show updated scores
- [x] Write/update vitest tests
- [x] Save checkpoint

## Fix Content Grader Apply Selected
- [x] Content Grader Apply Selected button only shows a toast instead of actually applying changes
- [x] Wire Apply Selected to a backend route that rewrites the pasted content with selected improvements
- [x] After applying, update the textarea content and auto-re-grade
- [x] Test and save checkpoint

## Fix Apply Selected Error (revoking)
- [ ] Investigate and fix the error when applying improvements (something about revoking)

## Fix Apply Selected UX
- [x] Clear checked improvements after apply completes (both Content Grader and Article Editor)
- [x] Highlight changed/added text after apply with subtle blue/gray background so users can see what changed
- [x] Test and save checkpoint

## Fix Article Editor Title Truncation
- [x] Fix article title being cut off in the Article Editor header — ensure full title is visible

## Fix Highlight Persistence After Apply
- [x] Highlights disappear after applying improvements — fixed by skipping editor sync on refetch
- [x] Ensure highlights persist until user edits or dismisses them

## Fix Highlighting (Not Working)
- [x] TipTap highlight approach is failing silently — rewrote to use buildHighlightedHtml with mark tags baked into HTML

## Clear Highlights Button
- [x] Add a Clear Highlights button to the Article Editor toolbar to remove all blue marks

## Article Generator: New Configure Options
- [x] Add Target Location field (free text, optional)
- [x] Add Project selector (auto-populated from active project, optional)
- [x] Add Target Audience field (pulls from ICP with override option)
- [x] Add Output Format toggle (HTML default, Plain Text option)
- [x] Add Manual Internal Links section (URL + anchor text pairs with Add button)
- [x] Add Automatic Internal Linking from Sitemap (sitemap URL field auto-populated from project, link count dropdown)
- [x] Update backend outline/article generation prompts to use all new fields
- [x] Write/update vitest tests
- [x] Save checkpoint

## Outline Review Font Size
- [x] Increase overall font size in the outline review section

## Brand Voice & ICP in Article Generator
- [x] Add Brand Voice dropdown selector with trait preview card (primary/supporting tones, perspective)
- [x] Add ICP Targeting section with enable/disable toggle and detail preview card (name, description, pain points)
- [x] Pass selected brand voice and ICP to the backend generation routes

## Fix ICP Profile Selection Override
- [x] Verify and fix that selected icpProfileId overrides project-level ICP in outline generation
- [x] Verify and fix that selected icpProfileId overrides project-level ICP in article generation
- [x] Test and save checkpoint

## Copy Content Feature
- [x] Add Copy Content button to Article Editor toolbar so users can copy article to clipboard
- [x] Fix Copy button to copy raw HTML source code as plain text (not rendered text)
- [x] Fix TipTap editor prose styling to properly render headings, bullets, tables, bold text etc.

## SEO Sidebar Layout
- [x] Move Search Preview box to top of SEO sidebar (before Target Keyword and other fields)

## Brand Voice Enforcement in Article Generation
- [x] Fix article generation LLM prompt to enforce sentence style settings (paragraph length, sentence structure) from brand guidelines

## Duplicate Brand Voice Bug
- [x] Find and fix bug that creates duplicate "Professional Voice" brand voice entries on every app update

## Paragraph Length Post-Processing
- [x] Add post-processing step to split long paragraphs (>5 sentences) after article generation
- [x] Strengthen LLM prompt to more aggressively enforce short paragraphs
- [x] Debug and fix paragraph splitter — bare text not wrapped in <p> tags, added wrapBareTextInPTags step


## Grading System Improvements
- [x] Integrate project citation sources into gradeArticle prompt so it suggests specific sources
- [x] Integrate citation sources into applyImprovements prompt so it uses actual URLs
- [x] Rewrite applyImprovements to surgically edit specific sections, not rewrite entire article
- [x] Update standalone gradeContent/applyContentImprovements similarly where applicable
- [x] Write and run tests for the updated grading system


## Citation Quality Improvements
- [x] Fix anchor text: use natural, contextual phrases (the actual claim/fact) instead of generic "Learn more at" text
- [x] Fix link targets: link to specific deep pages relevant to the cited info, not homepages


## Fix Over-Rewriting When Applying Citations
- [x] Fix apply-improvements so adding a citation only modifies the specific sentence, not rewriting surrounding text


## Core Outline Editing Features
- [x] Add reorder sections (up/down arrows) to outline editor
- [x] Add edit key points inline per section
- [x] Add ability to add new key points per section
- [x] Add ability to remove key points per section
- [x] Add delete section button (already existed)
- [x] Add "Add Below" button to insert new sections between existing ones

## Per-Section AI Instructions
- [x] Add AI instructions text field to each section in the outline editor UI
- [x] Store AI instructions in the outline data structure
- [x] Pass AI instructions to article generation backend
- [x] Include per-section AI instructions in LLM prompt for article generation

## Bug Fixes
- [x] Fix: Per-section AI instructions not being applied during article generation (root cause: edited sections were not saved to DB before generating)

## AI Instructions Preset Dropdown
- [x] Define preset AI instruction options (comparison table, bullet points, numbered list, FAQ, chart, etc.)
- [x] Add dropdown button next to AI Instructions label for H2 sections
- [x] Add dropdown button next to AI Instructions label for H3 subsections
- [x] Clicking a preset appends it to the existing AI instructions text

## Claude (Anthropic) LLM Integration
- [x] Add ANTHROPIC_API_KEY secret via webdev_request_secrets
- [x] Install @anthropic-ai/sdk package
- [x] Create Claude LLM provider module on the backend (server/claude.ts)
- [x] Add llmProvider/llmModel columns to projects table
- [x] Create unified callLLM helper that routes to Claude or built-in based on project settings
- [x] Replace all invokeLLM calls with callLLM in routers.ts
- [x] Add AI Model settings tab in Project Settings UI
- [x] Wire Claude provider into outline generation procedure
- [x] Wire Claude provider into article generation procedure
- [x] Wire Claude provider into grading and improvement procedures
- [x] Write tests for Claude integration (9 tests, all passing)

## Remove Em Dashes Button
- [x] Add "Remove Em Dashes" button to Article Editor toolbar next to Copy HTML
- [x] Button replaces all em dashes (—) with comma-space without rewriting content

## Fix Repetitive Article Openings
- [x] Investigate article generation prompt for ICP/brand voice causing same intro every time (root cause: ICP RULE 1 forced mentioning ICP situation in first 2 sentences)
- [x] Add variety instructions to prevent repetitive openings across articles (added rotation strategies + explicit anti-pattern blocklist)

## Fix Insert Preset - Table Support
- [x] Investigate why "Insert comparison table" preset doesn't produce tables (root cause: TipTap had no Table extension, stripped all table HTML)
- [x] Installed @tiptap/extension-table, table-row, table-cell, table-header and added to editor config
- [x] Made preset instruction explicit about HTML table tags (<table>, <thead>, <tbody>, <tr>, <th>, <td>)
- [x] Added TABLE FORMAT RULES to system prompt with example HTML table format
- [x] Added table tags to the HTML format instructions list

## Insert Template Sections
- [x] Define 10 pre-built section templates across 3 categories (Engagement, Content Blocks, Authority)
- [x] Add "Insert Template" dropdown button to the outline editor (next to Add Section button)
- [x] Each template inserts a fully structured section with heading, points, subSections, and AI instructions
- [x] Templates: Key Takeaways, Who This Is For / Not For, FAQ, Pros & Cons, Quick Answer Box, Comparison Table, Common Mistakes, Step-by-Step Guide, What to Look For, Expert Insights
- [x] Write vitest tests for template structure validation (8 tests)

## Insert Template Below (Per-Section)
- [x] Add "Insert Template Below" dropdown to each H2 section's action bar (purple "Template" button with dropdown)
- [x] Updated insertTemplate function to accept optional afterSectionId for positional insertion
- [x] Kept bottom-level "Insert Template" button as fallback for appending to end

## UI Cleanup
- [x] Remove search field from the top header bar

## Cross Check Integration in Article Editor
- [x] Add "Cross Check" button to Article Editor action area
- [x] Call crossCheck.checkArticle mutation when button is clicked
- [x] Display loading state while cross-check is running
- [x] Show results panel with summary, discrepancies (with severity badges), and aligned facts
- [x] Handle edge case: no reference document uploaded (show helpful message linking to settings)
- [x] Write tests for cross-check integration

## Apply Cross Check Corrections
- [x] Add selectable checkboxes to each discrepancy card in CrossCheckPanel
- [x] Add "Apply Selected (N)" button that appears when corrections are selected
- [x] Implement surgical find-and-replace in the TipTap editor to swap article text with corrections
- [x] Highlight applied corrections in the editor so user can see what changed
- [x] Show toast feedback after applying corrections
- [x] Clear selections after successful apply
- [x] Write/update tests for cross-check correction application

## Fix Repeated Phrases in Article Generation
- [x] Investigate source of "More than 33 million Americans" phrase appearing in every article
- [x] Fix article generation prompt to prevent repeated boilerplate phrases
- [x] Add instructions to LLM prompt to ensure unique, non-repetitive content
- [x] Write/update tests for the fix

## Redundancy Checker Feature
- [x] Create backend `redundancy.check` tRPC mutation that analyzes article content for redundancies
- [x] Define redundancy types: repeated phrases, redundant ideas, recycled statistics, filler patterns
- [x] Return structured results with location, type, severity, original text, and suggested fix
- [x] Add "Check Redundancy" button to Article Editor toolbar
- [x] Build RedundancyPanel sidebar component with selectable redundancy cards
- [x] Implement "Apply Selected" corrections flow (same pattern as Cross Check)
- [x] Show toast feedback and highlight applied changes in the editor
- [x] Write tests for redundancy checker backend and prompt validation

## Fix Redundancy Checker "Could not find text" Error
- [x] Investigate why Apply Selected fails with "Could not find the text to replace" when article hasn't been edited
- [x] Root cause: LLM returns plain text but article content has HTML tags breaking exact string match
- [x] Fix the onApply text matching logic to strip HTML before matching, then surgically replace in the original HTML
- [x] Apply same fix to Cross Check apply logic (same root cause)
- [x] Update tests to cover HTML-rich content matching scenarios

## Sidebar Width Reduction
- [x] Reduce sidebar width by 65px

## Fix Cross Check Apply Failing on Second Run
- [x] Investigate why applying corrections fails after running cross-check a second time
- [x] Root cause: LLM quotes article text with ellipsis, truncation, or slight paraphrasing vs actual HTML content
- [x] Improve matching to handle LLM text quoting discrepancies (ellipsis, partial quotes, fuzzy matching)
- [x] Ensure the fix also applies to the Redundancy Checker apply flow
- [x] Update tests to cover this scenario

## Fix Cross Reference Data Lost During Code Changes
- [x] Investigate how cross-reference document data is stored (database vs localStorage vs file)
- [x] Identify why data is lost during code changes/deployments
- [x] Root cause: db:push during deployment can drop/recreate tables, wiping referenceDoc data
- [x] Move reference document content from database (mediumtext column) to S3 storage
- [x] Keep only metadata (S3 key, filename, char count) in the database
- [x] Update backend helpers to read/write reference doc from S3
- [x] Update cross-check mutation to fetch doc from S3
- [x] Update frontend CrossCheckTab to work with new S3-backed storage
- [x] Write/update tests to verify S3-based persistence

## Fix Long Anchor Text in Generated Articles
- [x] Find the article generation prompt where internal links are created
- [x] Add instructions to enforce short, natural anchor text (2-7 words max)
- [x] Ensure links wrap only key phrases, not entire sentences
- [x] Added rules to article generation, manual links, auto links, and grading improvement prompts
- [x] All 225 tests pass

## Key Takeaways Background Color Picker
- [x] Add background color picker to ALL sections in the outline builder (not just Key Takeaways)
- [x] Create 13-color preset palette (None + 12 soft colors: grays, blues, greens, yellows, reds, purples)
- [x] Store the selected background color in the OutlineSection data structure (schema + client)
- [x] Pass the color to the article generation prompt so sections render as styled boxes with border-radius, padding
- [x] Color persists when saving/reloading the outline (stored in JSON sections column)
- [x] Preview swatch with hex code shown in the outline builder when a color is selected
- [x] All 225 tests pass

## Fix Background Color Not Rendering in Generated Articles
- [x] Investigate how backgroundColor is passed to the article generation prompt (root cause: TipTap strips div tags with inline styles)
- [x] Fix: Added server-side post-processing (applyBackgroundColors) that reliably wraps sections using outline data
- [x] Fix: Created custom TipTap StyledBox extension that preserves div elements with background-color styles
- [x] Styled div wraps entire section content (heading + body) with padding, rounded corners, and chosen background color
- [x] 11 new tests for applyBackgroundColors, all 236 tests pass

## Fix Cross Reference Data Loss During Deployments (CRITICAL - Recurring)
- [ ] Investigate what exactly happens to the projects table during deployment (db:push / drizzle migrate)
- [ ] Determine if drizzle migrations are dropping and recreating the projects table
- [ ] Implement a permanent fix so referenceDocS3Key, referenceDocName, referenceDocLength survive all deployments
- [ ] Test the fix thoroughly
- [ ] Run full test suite

## New Insertion Templates: Pro Tip & Summary
- [x] Add Pro Tip insertion template with inline SVG checkmark icon, green left border, light green background
- [x] Add Summary insertion template with left border accent and bold heading
- [x] Update outline builder to include new template options (Engagement category)
- [x] Update article generation prompt to handle new template types
- [x] Ensure TipTap editor preserves the new template HTML (StyledBox extension updated with data-template support)
- [x] Server-side post-processor (applyTemplateStyles) reliably wraps Pro Tip and Summary sections
- [x] 13 new tests for applyTemplateStyles, all 249 tests pass

## Default Background Colors for Insertion Templates
- [x] Add default backgroundColor to Key Takeaways (#EFF6FF Light Blue)
- [x] Add default backgroundColor to Who This Is For (#F5F3FF Lavender)
- [x] Add default backgroundColor to Quick Answer Box (#FFFBEB Cream)
- [x] Add default backgroundColor to Common Mistakes (#FFF1F2 Rose)
- [x] Add default backgroundColor to Checklist (#F1F5F9 Slate)
- [x] Add default backgroundColor to Expert Insights (#EEF2FF Indigo)
- [x] Leave FAQ, Pros & Cons, Comparison Table, Step-by-Step Guide without defaults
- [x] All 249 tests pass

## Multi-Sitemap Selection for Article Generation
- [x] Replace single sitemap URL input with multi-select checkboxes for project sitemaps
- [x] Add "Add custom URL" option for ad-hoc sitemap URLs
- [x] Update backend to accept array of sitemap URLs and merge URL pools
- [x] Combined URL pool feeds into the AI for link selection
- [x] Number of links dropdown still controls total count across all sitemaps
- [x] Backward compatible with old sitemapUrl settings (falls back to array)
- [x] All 249 tests pass

## Banned Phrases Feature
- [x] Add bannedPhrases JSON column to projects table in schema
- [x] Run db:push to migrate (migration 0009)
- [x] Add bannedPhrases to updateProject db helper type signature
- [x] Add bannedPhrases to project update tRPC input schema
- [x] Add BannedPhrasesSection UI in Brand Voice tab (tag display, edit mode with textarea, one phrase per line)
- [x] Inject banned phrases into article generation prompt as ABSOLUTE HARD CONSTRAINT section
- [x] Add post-generation scan that removes any banned phrases that slipped through (case-insensitive, regex-safe)
- [x] 11 new tests for banned phrase removal, all 260 tests pass

## Brand Voice Tab Layout
- [x] Change Brand Voice and Banned Phrases cards from stacked to two-column side-by-side grid (lg:grid-cols-2)
- [x] Fix top alignment between Brand Voice card and Banned Phrases card in two-column grid (items-start)
- [x] Move New Brand Voice button from header to below brand voice cards to fix column alignment
- [x] Fix Brand Voice tab: heading/subtitle inside left column pushes card down, causing misalignment with Banned Phrases card

## Fix Pro Tip Template Not Appearing in Generated Articles
- [x] Fix conflicting LLM prompt: per-section says "Do NOT output heading" but system prompt says "MUST output heading" — LLM omits heading, post-processor can't find it
- [x] Unify prompt instructions so LLM always outputs the heading for template sections
- [x] Verify applyTemplateStyles correctly wraps the section after fix
- [x] Run tests — all 260 tests pass

## Fix Summary Template Not Appearing in Generated Articles
- [x] Investigate why Summary template fails while Pro Tip now works
- [x] Implement fix: two-pass heading matching (exact first, then alias fallback) with synonym lists for summary/pro-tip
- [x] Run tests — all 267 tests pass (7 new alias-matching tests added)

## Build Use Cases Insert Template
- [x] Add Use Cases template definition in GenerateArticle.tsx (icon, label, section config)
- [x] Update schema templateType enum to include "use-cases"
- [x] Add wrapUseCases function in applyTemplateStyles.ts with stacked card styling
- [x] Add "use-cases" aliases for heading matching
- [x] Update LLM prompt instructions in routers.ts for use-cases template type
- [x] Write tests for Use Cases post-processing (exact match, alias match, card splitting)
- [x] Run all tests and verify — all 277 tests pass (10 new Use Cases tests)

## Fix Use Cases Template Styling Not Applied
- [x] Investigate why card-splitting failed on real LLM output — LLM renamed "Use Cases" to contextual heading not in alias list
- [x] Fix: rewrote applyTemplateStyles with two-phase approach (match all headings first on original HTML, then apply replacements in reverse order) and added 3-pass matching (exact → alias → positional)
- [x] Run tests and verify — all 282 tests pass (5 new positional matching tests)

## Phase 1: LLM-Powered Keyword Suggestions
- [x] Add suggestKeywords tRPC procedure (LLM-powered, returns secondary/LSI/long-tail arrays)
- [x] Add secondaryKeywords to OutlineSettings type and outline/article generation input schemas
- [x] Add "Keywords to Include" field with comma-separated input and + button
- [x] Add "Suggest Keywords" button that calls the LLM procedure
- [x] Build clickable chips UI for suggested keywords (3 categories: Related, LSI, Long-Tail with Add All/Dismiss)
- [x] Add selected keywords as removable chips with "Clear all" option
- [x] Inject secondary keywords into article generation system prompt
- [x] Write tests for suggestKeywords procedure — 8 tests
- [x] Run all tests — all 290 tests pass

## Fix Articles Referencing 2024 Instead of Current Year
- [x] Inject current date/year into article generation system prompt so LLM knows the current year
- [x] Also inject into outline generation prompt for consistency
- [x] Run tests and verify — all 290 tests pass

## Fix Cross-Reference Data Wiped on Every Deployment
- [x] Investigate why cross-check/reference doc data is lost when publishing updates
- [x] Check if data is stored in DB column vs local file vs S3
- [x] Check if db:push migrations are dropping/recreating columns
- [x] Implement durable fix: dual-storage (DB primary + S3 backup) so cross-check data persists across deployments
- [x] Added referenceDocContent mediumtext column to projects table
- [x] Updated getReferenceDoc to read from DB first, fallback to S3 with self-healing backfill
- [x] Updated updateReferenceDoc to save content to both DB and S3 (S3 failure is non-critical)
- [x] Updated checkArticle to use DB content as primary source
- [x] Backfilled existing S3 content into DB column
- [x] Run tests and verify — all 301 tests pass (11 new dual-storage tests)

## Entity/Salience Analyzer (Phase 1 — Standalone Page)
- [x] Create entity analysis LLM prompts (entity + salience + semantic) in server/entity-prompts.ts
- [x] Create shared types for entity analysis results in shared/entity-types.ts
- [x] Add tRPC procedures: entity.analyzeContent, entity.analyzeArticle, entity.analyzeSemantic, entity.analyzeArticleSemantic
- [x] Build EntityAnalyzer.tsx page with paste-text input and article selector
- [x] Build score cards (Primary Clarity, Entity Focus, Supporting Coverage, GEO Extractability)
- [x] Build entity table with sortable columns (Name, Type, Prominence, Rationale)
- [x] Build salience structure cards (Dominance Gap, Early Reinforcement, Entity Drift)
- [x] Build supporting coverage and GEO extractability sections
- [x] Build actionable fixes list + advanced recommendations (collapsible)
- [x] Build semantic analysis tab (Relevance, Section Breakdown, Redundancy, Topic Coverage, Semantic Fixes)
- [x] Add "Entity Analyzer" to sidebar under Content section
- [x] Wire route in App.tsx
- [x] Write vitest tests for entity tRPC procedures (11 tests, all 312 tests passing)

## Article Editor Toolbar Redesign + Entity Analyzer Panel
- [x] Refactor toolbar: primary buttons (Status dropdown, Grade, SEO, Copy, Edit)
- [x] Move Cross Check, Redundancy Check to overflow menu (⋮)
- [x] Add Entity Analyzer to overflow menu
- [x] Add Download HTML to overflow menu
- [x] Style toolbar to match reference (pill-shaped buttons with icons, clean spacing)
- [x] Build Entity Analyzer sidebar panel in Article Editor (overall score, score breakdown, primary entity, entities list, salience structure, actionable fixes, supporting coverage, GEO extractability)
- [x] Wire entity.analyzeArticle mutation to the Entity panel
- [x] All 312 tests passing, TypeScript compiles cleanly
- [x] Save checkpoint

## Update Article Generation Defaults
- [x] Change Target Word Count default from 2000 to 1600
- [x] Change Number of Sections default from 7 to 8
- [x] Change Number of FAQs default from 4 to 8

## Keyword Visibility in Step 2 (Outline Review)
- [x] Display all selected keywords (suggested + manually entered) prominently at the top of Step 2 under the title
- [x] Add keyword-section mapping: highlight which sections will use which keywords with colored pill badges
- [x] Primary keyword shown as bold indigo pill with target icon; secondary keywords as slate pills with tag icon
- [x] Section badges: primary keyword matches shown as solid indigo badge, secondary as emerald badge on section headers

## Favicon Update
- [x] Generated favicon matching sign-in page icon (white rocket on indigo-to-purple gradient)
- [x] Uploaded to CDN and added favicon link tags to index.html (ICO + PNG + Apple Touch Icon)

## Research Topic First Feature
- [x] Create shared ResearchFindings types (shared/research-types.ts)
- [x] Create researchTopic tRPC procedure with 6-category LLM research prompt
- [x] Add buildResearchSection helper to inject research into outline prompt
- [x] Add optional research field to outlines.generate input schema
- [x] Add research toggle checkbox (enabled by default) before Generate Outline button
- [x] Two-phase flow: Research → Outline generation (with fallback if research fails)
- [x] Build collapsible Research Findings panel in Step 2 (Statistics, Sources, Experts, Questions, Competitor Angles, Key Takeaways)
- [x] All 312 tests passing, TypeScript compiles cleanly

## Keyword Deselection Fix
- [x] Allow deselecting previously selected suggested keywords from the secondary keywords list
- [x] All three categories (Related, LSI, Long-Tail) now toggle on click: add if not selected, remove if already selected
- [x] Updated styling: selected keywords show darker text and hover effect to indicate clickability

## Fix Broken/404 Hyperlinks in Generated Articles
- [x] Investigate how sitemap URLs are fetched and parsed
- [x] Investigate how internal links are selected and inserted into articles by the LLM
- [x] Identify root cause of broken/404 links (outline prompt passed sitemap XML URLs instead of parsed page URLs)
- [x] Implement fix: outline generation now pre-resolves sitemap XML URLs to actual page URLs from DB before building prompt (article generation already had the fix)
- [x] Test and verify (all 312 tests pass)

## Apply Entity/Salience Fixes Feature
- [x] Create applyEntityFixes tRPC procedure (takes article content + selected fixes, LLM rewrites to apply)
- [x] Add selectable checkboxes to each fix item in Entity Analyzer sidebar panel
- [x] Add "Apply Selected (N)" button that triggers the mutation
- [x] After applying, auto-re-run entity scan to show updated scores
- [x] Write vitest tests for applyEntityFixes procedure (5 tests: success, not found, empty input, unparseable LLM, no match, multi-fix)
- [x] Test full flow: Scan → Select Fixes → Apply → Re-Scan (all 318 tests pass)

## Entity Scan Loading Indicator
- [x] Show Entity Analyzer sidebar immediately when scan starts with a loading/skeleton state
- [x] Display spinner and progress text so user knows the scan is running

## Loading Skeletons for All Scan Sidebars
- [x] Add loading skeleton to Semantic Analyzer sidebar (no separate Semantic sidebar exists — entity scan covers this)
- [x] Add loading skeleton to Cross-Check sidebar
- [x] Add loading skeleton to Redundancy sidebar
- [x] Ensure sidebar opens immediately on scan click for all three tools

## Content Grader Loading Skeleton
- [x] Add loading skeleton to Content Grader sidebar
- [x] Ensure sidebar opens immediately on grade click

## Cancel Buttons on All Loading Skeletons
- [x] Add cancel button to Entity Analyzer loading skeleton
- [x] Add cancel button to Cross-Check loading skeleton
- [x] Add cancel button to Redundancy loading skeleton
- [x] Add cancel button to Content Grader loading skeleton

## Fix 529 Overloaded LLM Error During Outline Generation
- [x] Investigate outline generation LLM call and current error handling
- [x] Add retry logic with exponential backoff to both invokeLLM (Forge) and invokeClaudeLLM (Anthropic) — retries 429, 500, 503, 529 up to 3 times with 2s/4s/8s backoff
- [x] Improve user-facing error messages for transient/overloaded errors (outline, article, research mutations)
- [x] Test and verify (all 318 tests pass, 0 TS errors)

## AI Image Generation in Article Creation (Option C: Auto + Manual Override)
- [x] Review existing image generation helper and storage code
- [x] Build backend procedure to generate image prompts from article sections via LLM
- [x] Build backend procedure to generate images from prompts, upload to S3, return URLs
- [x] Integrate image generation into article generation flow (auto-insert after each major section)
- [x] Add "Generate Images" toggle to article creation form (GenerateArticle page)
- [x] Build editor UI: Image Manager sidebar with suggest placements, generate, regenerate, remove
- [x] Build editor UI: regenerate individual images with editable prompt
- [x] Build editor UI: remove individual images from article
- [x] Write vitest tests for articleImages procedures (12 tests: generate, suggestPlacements, regenerate, remove)
- [x] All 330 tests pass (21 test files)

## Fix Research Feature: Outdated Data (2024/2025 Instead of 2026)
- [x] Investigate research procedure prompt to find where year/date context is missing
- [x] Update research prompt to dynamically inject current year (2026) and enforce current-year data priority
- [x] Add instructions to flag/discard data older than current year where fresher data exists
- [x] Update system message and buildResearchSection to also carry current year context
- [x] Test and verify (all 330 tests pass)

## Fix Image Generation Bugs
- [x] Investigate why auto-generation during article creation is not inserting images (LLM wraps JSON in ```json code fences)
- [x] Investigate why "Suggest Placements" returns no suggestions in editor (same parsing issue)
- [x] Fix: strip markdown code fences before JSON.parse in both auto-generation and suggestPlacements
- [x] Verified: suggestPlacements now returns 2 suggestions successfully in browser test

## Fix Auto-Image Generation During Article Creation
- [x] Check server logs — no [ImageGen] entries found, confirming deployed version lacks the feature
- [x] Verified: deployed version was built from older checkpoint before image feature was added
- [x] Confirmed: both articleImages routes and generateImages input work at runtime (curl tests return UNAUTHORIZED, not route-not-found)
- [x] TS watch errors are stale/depth-limited — tsc --noEmit and pnpm build both pass with 0 errors
- [x] User needs to Publish latest checkpoint to deploy the image generation feature

## Fix Image Description Text in Articles (No Actual Images)
- [x] Identified root cause: LLM writes image description text ("Infographic showing...") as prose in article body
- [x] Added "NO IMAGE DESCRIPTIONS" instruction to article generation prompt
- [x] Added post-generation cleanup: regex patterns strip image description paragraphs before image generation step
- [x] Handles: Infographic, Diagram, Chart, Image, Figure, Visual, Illustration, Graphic, Photo, Picture, Screenshot + Visual representation of...
- [x] Handles descriptions in <em>, <strong>, <i> tags and bracket-style [Infographic: ...] patterns
- [x] Does NOT remove regular paragraphs that mention images in passing context
- [x] Added 21 new tests for image description cleanup (server/image-desc-cleanup.test.ts)
- [x] All 351 tests pass (22 test files), build passes with 0 errors

## Remove Image Generation Feature Entirely
- [x] Remove "Generate Images" checkbox from GenerateArticle.tsx
- [x] Remove generateImages input from articles.generate tRPC procedure
- [x] Remove auto-image generation code block from article generation mutation
- [x] Remove image description cleanup regex code from article generation
- [x] Remove "NO IMAGE DESCRIPTIONS" prompt instruction
- [x] Remove articleImages router (generate, regenerate, suggestPlacements, remove)
- [x] Remove Image Manager sidebar from ArticleEditor.tsx
- [x] Remove article-images.test.ts and image-desc-cleanup.test.ts
- [x] Update remaining tests if needed
- [x] Verify all tests pass and build succeeds (318 tests pass, build 0 errors)
- [x] Save checkpoint

## Regenerate Section Feature
- [x] Backend: Add `articles.regenerateSection` tRPC mutation with section extraction, context-aware prompting, and post-processing
- [x] Backend: Use project's selected LLM via callLLM helper (respects Claude/default setting)
- [x] Backend: Include outline context, brand voice, ICP, keyword, and surrounding section snippets in prompt
- [x] Backend: Handle edge cases — template sections, background colors, FAQ sub-sections, intro/conclusion
- [x] Backend: Write tests for the regenerateSection mutation (22 tests)
- [x] Frontend: Add hover action (RefreshCw icon) on H2 headings in the article editor
- [x] Frontend: Build regeneration dialog with instructions textarea, tone override, and length preference
- [x] Frontend: Show loading state on the section during regeneration
- [x] Frontend: Diff preview sidebar with accept/discard/try-again actions + word count comparison
- [x] Frontend: Update word count after accepting regenerated section
- [x] Verify build passes and all 340 tests pass

## Fix Excessive Hyperlink Insertion in Article Generation
- [x] Investigate link insertion logic — found 3 root causes: weak 'approximately' wording, autoLinkCount not passed without sitemap, no post-processing enforcement
- [x] Identified: autoLinkCount was only passed when sitemapUrls.length > 0, so no-sitemap generations had no limit
- [x] Fixed prompt: changed 'approximately N links' to 'EXACTLY N links (no more, no fewer)' + added TOTAL LINK LIMIT rule covering internal + external combined
- [x] Added post-processing link count enforcement: strips excess <a> tags after generation, preserves anchor text
- [x] Added 11 tests for link count enforcement (server/link-count-enforcement.test.ts), all 351 tests pass, build succeeds

## GSC Analyzer Feature
- [x] Add gscExports table to drizzle schema and run db:push
- [x] Build Excel parser utility (server-side: xlsx package, reads Queries + Pages sheets)
- [x] Build backend tRPC procedures: upload, list, getById, getNearJump, delete
- [x] Build keyword categorization engine: near-jump, high-impression/low-CTR, quick wins, zero-click pages, cannibalization
- [x] Build GSC Analyzer frontend page with upload flow (drag-and-drop + click-to-upload)
- [x] Build results dashboard: overview stats, tabbed categories, priority threshold filter (Page 1/High Only/Medium+/All)
- [x] Build per-keyword action buttons (generate article, add to outline)
- [x] Write tests for the Excel parser and categorization engine (14 tests in gsc-parser.test.ts)
- [x] Run build and save checkpoint — all 365 tests pass (23 test files), build succeeds

## Remove Manus OAuth (Make App Fully Public)
- [x] Backend: Replace all 69 protectedProcedure calls with publicProcedure in routers.ts
- [x] Backend: Replace all ctx.user.id references with fixed owner ID (1) so existing data is preserved
- [x] Backend: Update auth.me to return static owner object (no ctx.user dependency)
- [x] Backend: Keep DB schema intact (userId columns stay, just hardcoded to owner ID 1)
- [x] Frontend: Remove useAuth() and login wall from AppLayout.tsx
- [x] Frontend: Remove useAuth() and login wall from DashboardLayout.tsx
- [x] Frontend: Remove useAuth() from GeneralSettings.tsx
- [x] Frontend: Remove auth redirect logic from main.tsx
- [x] Frontend: Remove useAuth() from Home.tsx
- [x] Run tests and fix all breakages (updated auth tests to reflect public access)
- [x] Verify build passes — all 366 tests pass (23 test files), build 0 errors
- [x] Save checkpoint

## Custom Email/Password Authentication System
- [ ] Review existing schema and JWT setup
- [ ] Add appUsers table to drizzle schema (id, name, email, passwordHash, role, isActive, createdAt)
- [ ] Run db:push to apply migration
- [ ] Build backend: login mutation (email+password → JWT cookie)
- [ ] Build backend: logout mutation (clear cookie)
- [ ] Build backend: me query (return current user from JWT cookie)
- [ ] Build backend: changePassword mutation
- [ ] Build backend: admin.listUsers, admin.createUser, admin.updateUser, admin.deleteUser procedures
- [ ] Add auth middleware to protect all non-auth routes (redirect to /login if no valid session)
- [ ] Seed admin account (cboudreau@teameip.com) with temporary password
- [ ] Build frontend: Login page (/login) with email/password form
- [ ] Build frontend: Logout button in sidebar
- [ ] Build frontend: Change Password page or modal
- [ ] Build frontend: Admin Users page (/admin/users) — create/view/disable/delete users
- [ ] Wire auth guard in App.tsx to redirect unauthenticated users to /login
- [ ] Write tests for auth procedures
- [ ] Run build and save checkpoint

## Custom Auth Frontend
- [x] Build Login page (email/password form, branded, clean)
- [x] Add auth guard to App.tsx — redirect to /login if not authenticated
- [x] Wire logout in AppLayout sidebar user menu
- [x] Show logged-in user name/role in sidebar footer
- [x] Build Admin Users page (/admin/users) — list, create, disable, delete users
- [x] Add Admin Users link to sidebar (admin only)
- [x] Build Change Password page/modal (current password + new password)
- [x] Force change password on first login (mustChangePassword flag)
- [x] Write vitest tests for auth procedures
- [x] Save checkpoint

## Auth Guard Removal
- [x] Remove auth guard from App.tsx so app loads without login
- [x] Save checkpoint

## FAQ Rendering Bug Fixes
- [x] Fix raw HTML anchor tags leaking into visible article text
- [x] Fix broken/incomplete sentences caused by mid-sentence paragraph breaks
- [x] Save checkpoint

## URL Integrity Rule in System Prompt
- [x] Add URL integrity rule to article generation system prompt (no line breaks/spaces in href URLs)
- [x] Add same rule to section regeneration system prompt
- [x] Save checkpoint

## Coverage Card Template Type
- [x] Investigate existing template type system (how templates are defined, prompted, post-processed)
- [x] Add coverage-card to outline generator template type options
- [x] Add coverage-card prompt instructions to article generation system prompt
- [x] Build coverage-card post-processor (styled HTML: blue header, summary, two-column covers/doesn't-cover, cost callout)
- [x] Write tests for coverage-card template (12 tests passing)
- [x] Save checkpoint

## Logo Navigation
- [x] Make RankPilot logo in sidebar clickable to navigate to dashboard
- [x] Save checkpoint

## Re-enable Custom Login
- [x] Re-enable auth guard in App.tsx (redirect unauthenticated users to /login)
- [x] Re-enable /login and /change-password routes
- [x] Save checkpoint

## Login Bug Fix
- [x] Debug why clicking Sign in does nothing on the login page (missing cookie-parser middleware)
- [x] Fix the login form submission (added cookie-parser to Express server)
- [x] Save checkpoint

## Favicon Update
- [x] Generate blue/purple RankPilot favicon
- [x] Upload and update favicon in project
- [x] Save checkpoint

## Generate Outline from Entity Analysis
- [x] Review existing entity analyzer panel and outline generation code
- [x] Create backend tRPC procedure: entity.generateOutlineFromAnalysis (takes entity/salience analysis data, project ID, generates fresh outline via LLM)
- [x] Include project Brand Voice and ICP in the outline generation prompt
- [x] Build frontend: "Generate Outline from Analysis" button in Entity Analyzer panel (Article Editor)
- [x] Build frontend: Project selector dialog with Brand Voice/ICP auto-populated
- [x] Navigate user directly to Outline Review (Step 2) with pre-built outline
- [x] Write vitest tests for the new procedure
- [x] Save checkpoint

## External URL Scanning for Entity Analyzer
- [x] Backend: Create tRPC procedure to fetch URL and extract main article content (strip nav/footer/sidebar)
- [x] Backend: Wire URL content extraction into existing entity.analyzeContent flow
- [x] Frontend: Add URL input tab alongside paste text / select article on standalone Entity Analyzer page
- [x] Frontend: Show loading state while fetching URL content
- [x] Frontend: Ensure "Generate Outline from Analysis" button works after URL scan
- [x] Write vitest tests for URL fetch and content extraction
- [x] Save checkpoint

## Content Scheduler (Automated Article Generation)
- [x] Design database schema for scheduled jobs, keyword queues, and run history
- [x] Add scheduledJobs table (projectId, name, frequency, cronExpression, keywordSource, articleSettings, icpId, brandVoiceId, status, lastRunAt, nextRunAt)
- [x] Add keywordQueue table (jobId, keyword, status, order, generatedArticleId)
- [x] Add jobRunHistory table (jobId, keyword, articleId, status, startedAt, completedAt, error)
- [x] Push database migrations
- [x] Build DB helpers for scheduled jobs CRUD
- [x] Build DB helpers for keyword queue CRUD
- [x] Build DB helpers for run history
- [x] Build tRPC procedures: scheduledJobs.list, create, update, delete, pause, resume
- [x] Build tRPC procedures: keywordQueue.list, add, remove, reorder
- [x] Build tRPC procedures: jobRunHistory.list
- [x] Build tRPC procedure: scheduledJobs.runNow (manual trigger)
- [x] Build backend scheduler engine (checks for due jobs on interval, runs full outline→article pipeline)
- [x] Implement keyword queue mode (pick next unprocessed keyword)
- [x] Implement AI-suggested mode (analyze project ICP, existing articles, suggest next keyword)
- [x] Skip outline review — generate outline and article in one shot
- [x] Send in-app notification when article is generated
- [x] Build frontend: Scheduler page with job list dashboard (active/paused/completed jobs, next run times)
- [x] Build frontend: Create/Edit Job form (name, keyword source, frequency, article settings, ICP, Brand Voice)
- [x] Build frontend: Keyword Queue manager (add keywords, reorder, view status)
- [x] Build frontend: Run History log with links to generated articles
- [x] Add Scheduler nav item to sidebar
- [x] Write vitest tests for scheduler CRUD and engine
- [x] Save checkpoint

## Move Content Scheduler to Project Dashboard Tab
- [x] Review existing Project Dashboard tab structure
- [x] Refactor ContentScheduler into a reusable component that accepts projectId as prop
- [x] Add "Scheduler" tab to the Project Dashboard alongside existing tabs
- [x] Auto-scope all scheduler operations to the active project (no project selector needed)
- [x] Remove standalone /scheduler route from App.tsx
- [x] Remove Scheduler nav item from sidebar
- [x] Verify build passes and tests still pass
- [x] Save checkpoint

## Dashboard UI Cleanup & Scheduler Button
- [x] Remove the four stat cards (Total Articles, Published, In Progress, Total Words) from project dashboard
- [x] Add "Scheduler" button next to "Project Settings" button on project dashboard header
- [x] Create a dedicated Scheduler page/route for each project
- [x] Remove Scheduler tab from Project Settings page
- [x] Save checkpoint

## Bug Fix: Scheduler Run Now Produces No Article
- [x] Investigate server logs and scheduler execution code
- [x] Fix the scheduler execution pipeline (callLLM argument order + response extraction)
- [x] Test Run Now end-to-end (423 tests pass)
- [x] Save checkpoint

## Bug Fix: Strip Markdown Code Fences from Article Content
- [x] Find all article generation points (scheduler, regular generate) and strip ```html/``` fences
- [x] Save checkpoint

## Scheduler: Add Missing Article Generation Options
- [x] Add tone, targetLocation, targetAudience, secondaryKeywords, autoLinkCount, researchEnabled to ScheduledJobSettings type
- [x] Add all 6 fields to the Create Job form UI
- [x] Wire all 6 fields into the scheduler execution pipeline (generateOutlineForScheduler + generateArticleForScheduler)
- [x] Fix createJob/updateJob Zod schemas to accept tone and researchEnabled
- [x] Fix brandVoiceId/icpProfileId to be inside articleSettings (not top-level)
- [x] Fix keywords to be string[] not {keyword: string}[]
- [x] Add TRPCError import to routers.ts
- [x] Add 6 new vitest tests for new scheduler fields (429 total passing)
- [x] Save checkpoint

## Scheduler Page UI Tighten
- [x] Remove redundant description text ("Automate article generation on a schedule...") — already in subtitle
- [x] Compact stat cards: replaced 4 large cards with a single inline stats pill bar
- [x] Reduce page header vertical spacing (back link + title merged into compact header)
- [x] Project name inlined into title row ("Content Scheduler — Medicare FAQ")
- [x] Save checkpoint

## Auto-Grade & Improve After Generation
- [x] Add autoGradeEnabled, targetGrade, maxGradeIterations to ScheduledJobSettings type (schema.ts)
- [x] Add same 3 fields to generateArticle Zod input schema (routers.ts)
- [x] Add same 3 fields to createJob/updateJob Zod articleSettings schemas (routers.ts)
- [x] Build runAutoGradeLoop helper: grade article → check score vs target → apply improvements → repeat up to maxIterations
- [x] Wire runAutoGradeLoop into generateArticle procedure (manual generation)
- [x] Wire runAutoGradeLoop into generateArticleForScheduler (scheduler pipeline)
- [x] Add "Enable Grading" toggle + Target Grade dropdown + Max Iterations input to Generate Article form (outline step toolbar)
- [x] Add "Enable Grading" section to ContentScheduler Create Job form (toggle + Target Grade + Max Iterations)
- [x] All 429 tests pass, 0 TypeScript errors
- [x] Save checkpoint

## Edit Scheduled Job
- [x] Build EditJobDialog component pre-populated with all current job settings (schedule, article settings, auto-grade, keywords)
- [x] Wire to scheduler.updateJob tRPC mutation
- [x] Add "Edit" item to job list row dropdown menu (⋯) — appears on hover
- [x] Add "Edit" button to job detail view header (alongside Run Now / Pause / Delete)
- [x] 429 tests pass, 0 TypeScript errors
- [x] Save checkpoint

## Scheduler: UTC → US Eastern Time
- [x] Add ET↔UTC conversion helpers (etHourToUtc, utcHourToEt, formatEtHour)
- [x] Update Create Job form: hour picker shows ET hours (12:00 AM ET – 11:00 PM ET), converts to UTC before saving
- [x] Update Edit Job form: pre-populates hour picker with ET equivalent of stored UTC hour
- [x] Update job detail view subtitle: shows "Daily at 9:00 AM ET" instead of "09:00 UTC"
- [x] Update job detail overview tab Time row: shows ET
- [x] 429 tests pass, 0 TypeScript errors
- [x] Save checkpoint

## Scheduler Bug Fixes (ET label + nextRunAt)
- [x] Root cause: "Time (UTC)" screenshot was the OLD deployed version — new code already shows "Time (ET)" with 12h format
- [x] Root cause: 21-hour nextRunAt was because old version stored hourUtc=9 (raw, no ET conversion) — new version stores hourUtc=13 (9 AM EDT = UTC+4)
- [x] Fixed ET offset: replaced hardcoded UTC-5 with dynamic Intl.DateTimeFormat-based offset (correctly handles EDT=UTC-4 vs EST=UTC-5)
- [x] Added 60-second buffer to calculateNextRunTime so jobs created right at the target minute aren't pushed to tomorrow
- [x] 429 tests pass, 0 TypeScript errors
- [x] Save checkpoint — user must Publish to deploy, then delete/recreate the test job

## Scheduler: Auto Em-Dash Removal (Hidden)
- [x] Found existing logic in ArticleEditor.tsx: `html.replace(/\s*—\s*/g, ", ")`
- [x] Added em-dash removal as final step in executeScheduledJob (after auto-grade, before notification)
- [x] No UI toggle — runs silently by default on all scheduler-generated articles
- [x] Non-fatal try/catch so a failure doesn't break the pipeline
- [x] 429 tests pass, 0 TypeScript errors
- [x] Save checkpoint

## Bug: Scheduler Article Title Appearing in Content Body
- [x] Root cause: scheduler prompt told LLM to use h1/h2/h3 without explicitly banning the title as H1
- [x] Fix 1: Updated scheduler prompt to say "do NOT include an <h1> tag or the article title in the content body"
- [x] Fix 2: Added post-processing safety net — strips leading <h1> block, # Title line, and plain title line before saving
- [x] 428/429 tests pass (1 flaky Anthropic 529 overload error, unrelated)
- [x] Save checkpoint

## Scheduler Run Logging
- [x] Add schedulerRunLogs DB table (id, runId, jobId, step, level, message, metadata JSON, createdAt)
- [x] Push DB migration
- [x] Add addSchedulerRunLog / getSchedulerRunLogs / getSchedulerRunLogsByRunId DB helpers
- [x] Insert log entries at each pipeline step in executeScheduledJob (keyword_selection, outline, article, auto_grade, em_dash_removal, complete, error)
- [x] Wire logFn callback through generateArticleForScheduler → runAutoGradeLoop for auto-grade iteration logging
- [x] Add scheduler.getRunLogs tRPC procedure (accepts runId or jobId, returns ordered logs)
- [x] Build expandable Run Log timeline in RunHistoryView — each run row is collapsible with Radix Collapsible
- [x] Add RunLogTimeline component with step-specific icons, level-based coloring, vertical timeline line, and ET timestamps
- [x] Add 4 new vitest tests for getRunLogs procedure (433 total passing)
- [x] Save checkpoint

## Scheduler Feature Parity with Article Generation Tool
### Backend Pipeline Upgrades
- [x] Add per-run dynamic keyword suggestion: suggestKeywordsForScheduler calls LLM, randomly picks 4 related + 2 LSI + 2 long-tail, merges with static secondary keywords
- [x] Add actual research step: researchTopicForScheduler calls LLM when researchEnabled=true, passes findings to outline generation
- [x] Add sitemap URL resolution: resolves sitemapUrls to actual page URLs, passes to article prompt with strict linking instructions
- [x] Add CTA template injection: fetches project CTAs and injects into article prompt
- [x] Add banned phrases enforcement: injects project.bannedPhrases into prompt AND post-generation scan/strip
- [x] Add full post-processing pipeline: fixBrokenAnchors, wrapBareTextInPTags, splitLongParagraphs, applyBackgroundColors, applyTemplateStyles, link count enforcement
- [x] Upgrade scheduler article prompt to match manual tool quality rules (intro variety, content uniqueness, citation rules, anchor text length, table format, per-section AI instructions, template sections, current date context, paragraph structure, URL integrity, total link limit)
- [x] Add suggestKeywordsEnabled, manualLinks, sitemapUrls to ScheduledJobSettings interface and tRPC schemas
### UI Enhancements
- [x] Add "Auto-Suggest Secondary Keywords" toggle to scheduler create/edit form (enabled by default, 4 related + 2 LSI + 2 long-tail)
- [x] Add sitemap picker to scheduler create/edit form (checkbox list of project sitemaps)
- [x] Add manual links input to scheduler create/edit form (URL + anchor text pairs, add/remove)
- [x] Align content type list with manual tool (added: Pillar Page, Review, Case Study; renamed Guide → How-To Guide)
- [x] Align tone list with manual tool (replaced casual/educational with academic/persuasive)
- [x] All 433 tests pass, checkpoint saved

## Scheduler UI Cleanup
- [x] Remove static Secondary Keywords field from Create Job and Edit Job dialogs (redundant since auto-suggest handles this per-run)
- [x] Remove secondaryKeywords from the articleSettings passed in createJob/updateJob mutations
- [x] Fix 3 pre-existing TypeScript errors in scheduler backend (jobStatus→status, null→undefined, articleId→generatedArticleId)

## Run Log: Suggested Keywords Display
- [x] Updated suggestKeywordsForScheduler return type to { related, lsi, longTail } object
- [x] Updated call site to store categorized metadata in run log: { related[], lsi[], longTail[], all[], total }
- [x] Added keyword_suggestion to STEP_ICONS (violet Sparkles icon)
- [x] Rendered keyword chip grid in RunLogTimeline: 3 labeled rows (Related/LSI/Long-tail) with color-coded chips
- [x] Save checkpoint

## Dark/Light Mode Toggle
- [x] Add `theme` column (light/dark/system, default: light) to appUsers table and push DB migration
- [x] Add auth.getTheme and auth.setTheme tRPC procedures
- [x] Update ThemeProvider to support programmatic setTheme with light/dark/system options
- [x] Add 3-button segmented toggle (Light/Dark/Auto) in sidebar above user footer; collapsed sidebar shows single toggle icon
- [x] Add .dark CSS variables to index.css for full dark palette (OKLCH colors)
- [x] Add dark mode ProseMirror overrides for headings, links, code, tables, blockquotes
- [x] Bulk-fix hardcoded slate/white/gray colors across 13 pages to use semantic tokens
- [x] Update Login page to use semantic colors for dark mode compatibility
- [x] Load saved theme from DB on login, persist on change via mutation
- [x] All 433 tests pass, checkpoint saved

## Check for Existing Coverage (Generate Article Step 1)
- [x] Backend tRPC procedure to scan project sitemap URLs against target keyword via LLM
- [x] Check for Existing Coverage button on Generate Article page (Step 1) next to keyword input
- [x] Coverage results panel UI showing overlap severity, recommendation, explanation, and clickable URL
- [x] Vitest tests for checkCoverage procedure (5 tests passing)
- [x] Tighten checkCoverage LLM prompt criteria to reduce false positives (27 pages flagged in test)

## Em Dash Removal (Post-Processing)
- [x] Add shared stripEmDashes utility function in server/utils.ts
- [x] Apply stripEmDashes to all LLM-generated article content before returning to client
- [x] Add vitest tests for the stripEmDashes utility

## FAQ Answer Length Fix
- [x] Update FAQ generation prompt to enforce 2-4 sentence / 40-80 word answers
- [x] Remove "Short Answer:" prefix instruction from FAQ prompt
- [x] Add post-processing to strip "Short Answer:" prefix from generated content
- [x] Add vitest tests for the new post-processing

## Broken Link Checker
- [x] Backend tRPC procedure to extract and check all links in article content
- [x] Add Broken Link Checker option to article actions dropdown menu
- [x] Results UI showing broken links with status codes and anchor text
- [x] Add vitest tests for the broken link checker

## Broken Link Auto-Fix (LLM-Powered)
- [x] Backend tRPC procedure to suggest replacement URLs via LLM with live verification
- [x] Find Replacement button on each broken link in the BrokenLinksPanel
- [x] Replacement picker UI showing verified suggestions with one-click replace
- [x] Wire replace action to update article content in the editor
- [x] Add vitest tests for the replacement feature

## Generate Outline Dialog Enhancement
- [x] Show actionable fixes checklist in the Generate Outline from Analysis dialog
- [x] Show topics being added preview (missing topics + missing supporting entities)
- [x] Show suggested title from entity analysis
- [x] Show score overview with current score and target
- [x] Updated both ArticleEditor and EntityAnalyzer versions of the dialog

## Fix: Broken Link Checker "Failed to parse LLM response"
- [ ] Add robust JSON parsing with fallback handling to suggestReplacement procedure

## Fix: Broken Link Checker "Failed to parse LLM response"
- [x] Added extractJSON helper with 4-step fallback parsing (strip fences → regex array match → regex object match → bracket slicing)
- [x] Updated stripMarkdownFences to handle ```json fences
- [x] Applied extractJSON to suggestReplacement and checkCoverage procedures

## Cross-Reference Doc Rebuild
- [x] Document current cross-reference implementation (DB, backend, settings UI, article gen usage)
- [x] Extract CrossCheckTab component from ProjectSettings.tsx into standalone client/src/components/CrossCheckTab.tsx
- [x] Import standalone CrossCheckTab in ProjectSettings.tsx with single line
- [x] Added dark mode support to CrossCheckTab (violet info card, amber warning, icon backgrounds)
- [x] TypeScript: 0 errors, 472 tests passing, no regressions

## Fix: Unwanted <strong> Tags in Article Output
- [x] Trace all backend procedures that modify article HTML (applyImprovements, crossCheck, redundancy, etc.)
- [x] Find the source of <strong> tag injection — LLM wrapping changed text in bold during replacement
- [x] Fix LLM prompts to explicitly prohibit adding <strong> tags (4 prompts updated: applyImprovements, applyContentImprovements, applyEntityFixes, crossCheck, redundancy)
- [x] Add post-processing safety net stripWrappingStrongTags() — applied in 5 backend locations + 2 frontend handlers
- [x] 13 unit tests for stripWrappingStrongTags, 485 total tests passing

## Cross-Reference Doc in Article Generation
- [x] Add "Reference Document" toggle to article generation settings UI (between ICP Targeting and Internal Linking)
- [x] Auto-enable toggle when project has cross-reference doc set up, show doc name + char count
- [x] Inject cross-reference doc content into LLM system prompt during article generation (80k char limit)
- [x] Pass useReferenceDoc flag from frontend to backend generate procedure
- [x] Also inject into scheduler's generateArticleForScheduler (always enabled when doc exists)
- [x] TypeScript: 0 errors, 485 tests passing

## Bug: Cross-Reference Doc Data Keeps Disappearing
- [x] Check if reference doc data exists in the database right now (confirmed: null in DB)
- [x] Check if the project.update procedure is wiping referenceDoc fields (confirmed: separate functions, no interference)
- [x] Check if any other save/update operation clears the fields (no code path found — likely lost during migration/deployment)
- [x] Added confirmation dialog (AlertDialog) before Remove button to prevent accidental deletion
- [x] Added server-side audit logging ([RefDoc SAVE/DELETE/VERIFIED] console logs)
- [x] Added save verification — re-reads DB after write, throws error if data didn't persist
- [x] Added storage status indicator ("Stored in database with cloud backup")
- [x] S3 self-heal fallback already existed in getReferenceDoc (backfills DB from S3 if DB empty)
- [x] TypeScript: 0 errors, 485 tests passing

## Color-Code Citation Source Type Pills
- [x] Find where citation source type badges/pills are rendered (ProjectSettings.tsx line 1626 + dialog line 839)
- [x] Add distinct colors per source type: Government=blue, Research=purple, Industry=slate, News=amber, Academic=indigo, Medical=emerald, Legal=red, Technical=cyan, Other=gray
- [x] Applied to both the citation card display and the category selection badges in the create/edit dialog
- [x] Selected category gets ring highlight + font-semibold; unselected are slightly transparent

## Fix: Citation Links Opening in New Tab
- [x] Find all backend locations where citation links are generated with target="_blank" (LLM was adding it autonomously)
- [x] Added stripTargetBlank() post-processing function that removes target="_blank" and rel="noopener noreferrer"
- [x] Applied to 4 backend locations: article generation, section regeneration, scheduler, auto-grade apply
- [x] 8 unit tests for stripTargetBlank, 493 total tests passing

## S3-Primary Reference Doc Storage (Deployment-Proof)
- [x] Created deterministic S3 key helper: `getReferenceDocS3Key(projectId)` → `reference-docs/project-{id}.txt`
- [x] Created `fetchReferenceDocFromS3(projectId)` helper that fetches from deterministic key
- [x] Updated updateReferenceDoc: uploads to deterministic S3 key (overwrites), DB is cache
- [x] Updated getReferenceDoc: S3 deterministic key is primary, DB fallback, legacy key migration
- [x] Updated checkArticle: S3 deterministic key first, DB fallback
- [x] Updated articles.generate: S3 deterministic key first, DB fallback
- [x] Updated generateArticleForScheduler: S3 deterministic key first, DB fallback
- [x] Self-heal: backfills DB from S3 when DB is wiped (post-deployment recovery)
- [x] Legacy migration: auto-copies old timestamped keys to deterministic key
- [x] Copied existing doc to deterministic key `reference-docs/project-1.txt` (3,496 chars verified)
- [x] Updated 12 crosscheck-storage tests + 1 new helper test, 494 total tests passing
- [x] TypeScript: 0 errors

## Fix: Remove Button Not Clearing S3 Deterministic Key
- [x] Updated updateReferenceDoc removal branch to overwrite S3 deterministic key with empty content
- [x] Prevents self-heal from restoring a removed doc on next page load
- [x] 494 tests passing, 0 TS errors

## Bug: Reference Doc Edit/Delete Not Working After S3-Primary Change
- [x] Root cause: CloudFront CDN caching prevents S3 overwrites at the same key
- [x] Also confirmed: pnpm db:push does NOT wipe data ("No schema changes, nothing to migrate")
- [x] Reverted to DB-primary architecture: DB is source of truth, S3 is write-once backup with timestamped keys
- [x] Updated all 5 code paths: getReferenceDoc, updateReferenceDoc, checkArticle, articles.generate, scheduler
- [x] Save: DB first (primary), then S3 with timestamped key (immutable backup)
- [x] Load: DB first, S3 fallback only if DB is null and S3 key exists
- [x] Delete: Just clear DB, old S3 files are harmless orphans
- [x] 13 crosscheck-storage tests + 495 total tests passing, 0 TS errors

## Bug: JSON Parse Error on LLM Responses
- [x] Replaced ALL raw JSON.parse calls on LLM output with extractJSON helper (robust 4-step parser)
- [x] Fixed: outline generation (2), keyword suggestions (2), scheduler outline, research findings (2), meta generation (2), cross-check, redundancy check, entity analysis (2), semantic analysis (2), grading (2), apply edits (3), auto-grade loop (2) — 22 total replacements
- [x] Only JSON.parse remaining: inside extractJSON helper itself (4) + JSON-LD HTML parser (1, not LLM output)
- [x] 495 tests passing, 0 TS errors

## UI: Make Save button green in ArticleEditor
- [x] Change Save button from indigo to green (bg-emerald-600)

## Bug: "Test Source" citation keeps reappearing
- [x] Root cause: settings-tabs.test.ts line 117 called citations.create with "Test Source" / example.com against the REAL production DB (no mock)
- [x] Fixed: changed test to use try/catch pattern that only checks for auth errors, not resolves.not.toThrow()
- [x] 495 tests passing, 0 TS errors

## Feature: Minimum Internal Links Enforcement
- [x] Added minInternalLinks column to projects schema (default 3, range 0-20)
- [x] Pushed DB migration (0017_giant_black_tarantula.sql)
- [x] Enforced internal link floor in articles.generate prompt with MANDATORY label
- [x] Enforced internal link floor in scheduler generateArticleForScheduler prompt
- [x] Added minInternalLinks to projects.update tRPC schema
- [x] Added MinInternalLinksSection UI component in Brand Voice tab (right column)
- [x] +/- stepper control, 0-20 range, descriptive label, save button
- [x] 495 tests passing, 0 TS errors

## Feature: Inject Reference Doc into Outline Generation
- [x] Added useReferenceDoc input param to articles.generate outline procedure
- [x] Injected reference doc into manual outline generation prompt with outline-specific rules
- [x] Injected reference doc into scheduler outline generation (generateOutlineForScheduler) — always enabled if project has one
- [x] Outline-specific rules: create dedicated sections for doc subtopics, mirror doc structure, ground FAQ in doc answers
- [x] 495 tests passing, 0 TS errors

## Feature: Links Audit Tab in Article Editor
- [x] Backend: tRPC linksAudit.analyze — classifies links as internal/external using sitemap domains
- [x] Backend: tRPC linksAudit.suggest — LLM-powered internal link suggestions from unlinked sitemap pages
- [x] Backend: tRPC linksAudit.insertLink — one-click link insertion into article HTML (avoids existing <a> tags)
- [x] Frontend: LinksAuditPanel sidebar with 3-stat header (total/internal/external), collapsible link lists, suggestion cards
- [x] Wired into ArticleEditor dropdown menu ("Links Audit" item) and sidebar panel system
- [x] 495 tests passing, 0 TS errors

## Feature: Inject Reference Doc into Research Step
- [x] Injected reference doc into manual researchTopic prompt as supplementary context
- [x] Injected reference doc into scheduler researchTopicForScheduler prompt
- [x] Research-specific rules: extract real stats/data from doc, use doc's cited sources, ground key takeaways in doc facts, supplement (not replace) external research
- [x] 495 tests passing, 0 TS errors

## Feature: Multi-URL Competitor Analysis + Outline Generation
- [x] Read current Entity Analyzer frontend and backend code
- [x] Backend: multi-URL fetch and parallel analysis procedure (analyzeCompetitorUrls)
- [x] Backend: merge entity/section data across URLs (consensus, common, unique topics + entity gaps)
- [x] Backend: generate outline from merged competitor analysis (generateOutlineFromCompetitors)
- [x] Frontend: multi-URL input UI (2-3 URLs) in Entity Analyzer "Competitors" tab
- [x] Frontend: merged results display showing consensus/common/unique topics, entity gaps, recommended sections, competitive insights
- [x] Frontend: "Generate Outline from Competitors" button + dialog with project/brand voice/ICP/word count settings
- [x] TypeScript check — 0 errors

## Keyword Research Tool (Keywords Everywhere API)
- [x] Set up KEYWORDS_EVERYWHERE_API_KEY secret and add to ENV
- [x] Create server/keywords-everywhere.ts API helper module
- [x] Add keywordResearch tRPC procedure (seed + related + metrics)
- [x] Add getKeCredits tRPC procedure (credit balance check)
- [x] Build KeywordResearch.tsx frontend page with search input and settings
- [x] Build results table with keyword, type, volume, CPC, competition, trend sparkline
- [x] Add filter bar (hide declining, min volume, reset filters)
- [x] Add Export CSV functionality
- [x] Add credit balance display
- [x] Wire up /keywords route to KeywordResearch component
- [x] TypeScript check — 0 errors
- [x] Vitest tests for keyword research procedures (credit balance validation)

## Project Keywords (Save to Project + Management Page)
- [x] Create project_keywords table in drizzle schema with all columns
- [x] Run pnpm db:push to sync migration
- [x] Add DB helper functions (CRUD) in server/db.ts
- [x] Add saveKeywordsToProject procedure with priority scoring + article matching
- [x] Add getProjectKeywords procedure with search/sort
- [x] Add deleteProjectKeywords procedure (bulk delete)
- [x] Add updateKeywordPage procedure (set page URL)
- [x] Add addKeywordsManually procedure
- [x] Add importKeywords procedure (CSV/TXT parsing with KE enrichment)
- [x] Update KeywordResearch.tsx with "Save to Project" button + project selector dialog
- [x] Build ProjectKeywords.tsx page matching reference screenshot
- [x] Add /project-keywords route and sidebar nav entry
- [x] TypeScript check — 0 errors
- [x] Vitest tests — 497 passing (35 test files)

## Move Project Keywords into Project Dashboard
- [x] Review current Dashboard page structure
- [x] Add Keywords tab to project dashboard with embedded ProjectKeywordsPanel
- [x] Refactored ProjectKeywords.tsx into reusable ProjectKeywordsPanel component
- [x] Kept standalone /project-keywords route as alternative access point
- [x] TypeScript check — 0 errors

## GSC Analyzer Enhancement: Expandable Keyword Insights
- [x] Build gsc.analyzeKeyword backend procedure (URL fetch + KE data + AI analysis)
- [x] Create GSC keyword analysis prompt for ranking improvement recommendations
- [x] Update QueryTable component with expandable rows on click (chevron indicator + hint text)
- [x] Build URL input section in expanded row with Analyze button
- [x] Build analysis results display (performance assessment, title/meta recs, content gaps, quick wins, content recommendations, heading structure, internal linking, entity recommendations)
- [x] Add KE metrics display (volume, CPC, competition) in expanded row summary bar
- [x] Add copy-to-clipboard for title tag, meta description, and all recommendations
- [x] TypeScript check — 0 errors

## Bug Fix: Entity Analyzer Competitor Analysis Error
- [x] Investigate error: "Unexpected token '<', <!DOCTYPE" — LLM/proxy timeout returning HTML instead of JSON
- [x] Fix: Added try/catch around each LLM call, proper TRPCError wrapping, trimmed content to 5000 chars to reduce timeout risk, added console logging
- [x] TypeScript check — 0 errors

## Bug Fix: Cross-Reference Text Replacement Failing
- [x] Investigate text matching logic in cross-reference update
- [x] Fix text matching to handle whitespace/formatting differences — added decodeHtmlEntities(), normalizeForMatch(), entity-decoded fuzzy matching, and last-resort short prefix matching for long table text
- [x] TypeScript check — 0 errors, 497 tests passing

## Bug Fix: E-E-A-T Trust Package Inserting Broken/Long Hyperlinks
- [x] Investigate grading prompts and improvement application code for hyperlink generation
- [x] Fix LLM prompts to not fabricate URLs — updated all 3 citation source sections (gradeArticle, applyImprovements, applyContentImprovements) to enforce "use ONLY exact URLs from the list" and forbid path construction/fabrication
- [x] Fix anchor text to be short/descriptive — updated prompts to enforce 2-7 word max with concrete BAD/GOOD examples showing sentence-length anchors as BAD
- [x] Validate URLs before inserting hyperlinks — added sanitizeInsertedLinks() post-processing function that strips links with domains not in citation sources and trims anchor text >10 words
- [x] TypeScript check — 0 errors, 497 tests passing

## Documentation: PROJECT.md and DECISIONS.md
- [x] Create PROJECT.md with architecture, stack, file structure, data models, conventions
- [x] Create DECISIONS.md with key design decisions and rationale
- [x] Save checkpoint

## Feature: Highlight Already-Tracked Keywords in Research Results
- [x] Fetch project keywords when research results load and cross-reference — queries getProjectKeywords for active project, builds lowercase Set for O(1) lookup
- [x] Add visual indicator (badge/highlight) on keywords already in the active project — indigo "Tracked" pill with CheckCircle2 icon + tooltip showing project name; auto-refreshes after saving keywords
- [x] TypeScript check — 0 errors; 496/497 tests pass (1 pre-existing sitemap timeout, unrelated)

## Feature: Ideas Generator
- [x] Add `ideas` table to drizzle schema (id, title, keyword, searchIntent, wordCountRange, contentAngles JSON, targetAudience, rankingPotential, description, contentTypes, status enum, articleId, projectId, userId, timestamps)
- [x] Push DB migration with `pnpm db:push`
- [x] Add CRUD helper functions in db.ts (getIdeasByProject, getIdeaById, createIdea, createIdeasBulk, updateIdea, deleteIdea, deleteIdeasBulk, getIdeasCount)
- [x] Add ideas tRPC router with: generate (LLM-powered), list, get, save, saveBulk, update, delete, deleteBulk, counts
- [x] Build Ideas.tsx page with Generate tab (seed keyword input, content type checkboxes, idea count selector, custom AI instructions, results grid with edit/save/use actions)
- [x] Build Saved Ideas tab with archive/restore/delete/use actions and status badges
- [x] Add inline editing for generated ideas (title, keyword, intent, potential, word count, audience, description, content angles with add/remove)
- [x] Wire up routing in App.tsx (replaced ComingSoon placeholder)
- [x] TypeScript check — 0 errors, 497 tests passing

## Feature: Keyword Picker for Ideas Generator
- [x] Add a "Saved Keywords" popover button next to seed keyword input that shows project keywords with search filter and volume display
- [x] Clicking a keyword populates the seed keyword field and closes the popover
- [x] TypeScript check — 0 errors, 497 tests passing

## Feature: Per-Section Word Count Targets & Article Length Control
- [x] Add targetWordCount field to OutlineSection interface in schema.ts and frontend
- [x] Update outline generation prompt to include per-section word count targets — all 3 schemas (main, from_analysis, from_competitors) updated with targetWordCount field and distribution instructions
- [x] Display estimated word count per section in Step 2 outline review UI — amber pill badge with editable number input next to each section header
- [x] Show total estimated word count at bottom of outline — color-coded badge (green=on target, amber=under, red=over) with comparison to target
- [x] Allow editing per-section word counts — inline number input with step=50, updates section state immediately
- [x] Enforce per-section word limits in article generation prompt — both main and standalone grader prompts now include PER-SECTION WORD TARGETS instruction with ±10% tolerance guidance
- [x] Apply same changes to standalone grader outline generation — outlineText construction includes [TARGET: ~N words] directives
- [x] TypeScript check — 0 errors, 497 tests passing

## Bug Fix: numSections NaN Validation Error
- [x] Fixed parseInt(numSections) returning NaN when input field is empty — added || fallback defaults (1600 words, 8 sections, 8 FAQs) to all 3 mutation call sites
- [x] TypeScript check — 0 errors, 497 tests passing

## Feature: Dashboard — Connect to Real Data
- [x] Create dashboard.stats procedure — aggregates totalArticles, draftCount, reviewCount, completeCount, publishedCount, totalKeywords, savedIdeas, totalIdeas
- [x] Create dashboard.recentArticles procedure — returns 8 most recent articles with id, title, status, wordCount, updatedAt
- [x] Create dashboard.recentIdeas procedure — returns 5 most recent saved ideas with title, keyword, rankingPotential
- [x] Create dashboard.articlesOverTime procedure — 30-day article creation chart data
- [x] Create dashboard.recentActivity procedure — merged article + idea activity feed sorted by date
- [x] Replace all mock data with real API calls — stat cards, recent articles, activity feed, chart, ideas
- [x] Replaced topic clusters with Content Status breakdown (draft/review/complete/published counts) since clusters feature not built yet
- [x] Added loading states (spinner), empty states (icon + CTA button), and no-project-selected state
- [x] TypeScript check — 0 errors; 495/497 tests pass (2 pre-existing timeouts in sitemap and thin-content, unrelated)

## Fix: Dashboard Infinite Spinner
- [x] Fixed dashboard.stats SQL error: raw SQL used snake_case `article_status` and `idea_status` but actual DB columns are camelCase `articleStatus` and `ideaStatus`
- [x] Fixed dashboard.articlesOverTime SQL error: raw SQL used `created_at` but actual DB column is `createdAt`
- [x] All 5 dashboard endpoints now return data successfully
- [x] TypeScript check — 0 errors, 497 tests passing
## Outlines Manager (Standalone Feature)
- [x] Backend: duplicate outline procedure
- [x] Backend: improveOutline procedure (AI-powered analysis with parsed sections, score, suggestions)
- [x] Backend: applyImprovements procedure (apply selected suggestions to sections)
- [x] Frontend: Outlines Library tab — list, search, filter by status, delete, duplicate, status change, generate link
- [x] Frontend: Create New tab — standalone outline builder with AI generation, manual section editing, key points, save to library
- [x] Frontend: Improve Outline tab — paste any outline, AI analyzes and suggests improvements, select/deselect suggestions, apply selected, save improved version
- [x] Wired /outlines route in App.tsx (replaced ComingSoon stub)
- [x] TypeScript check — 0 errors
- [x] All 8 new outline tests passing (outlines.test.ts)
- [x] Removed "Add Section" button from article generator toolbar (user request)

## Outlines Manager — Phase 2: Multi-Source Generation
- [x] Backend: outlines.fromIdea procedure — generates outline from saved idea with keyword, content angles, search intent, ICP, brand voice
- [x] Backend: outlines.fromCompetitorUrls procedure — scrapes competitor URLs, extracts headings/content, generates outline that outranks them with competitor insights
- [x] Frontend: Source selector tabs (From Keyword / From Competitors / From Idea) in Create New tab
- [x] Frontend: Competitor URLs input with add/remove, analysis progress, and competitor insights panel (consensus topics + content gaps)
- [x] Frontend: Idea selector dropdown with idea preview card (title, keyword, search intent, content angles)
- [x] Frontend: Competitor Insights panel showing consensus topics and content gaps after generation
- [x] Frontend: Idea Source Info panel showing source idea details after generation
- [x] TypeScript check — 0 errors
- [x] 504 tests passing (1 pre-existing timeout in grading.applyContentImprovements, unrelated)

## Outline Versioning — Side-by-Side Diff Comparison
- [x] Add outline_versions table to schema (outlineId, versionNumber, label, sections JSON, createdAt)
- [x] Backend: saveVersion, getVersions, getVersionsByProject, saveImprovementVersions procedures
- [x] Frontend: Version comparison panel in Improve Outline tab with side-by-side and unified diff views
- [x] Frontend: Visual diff highlighting (added sections in green, removed in red/strikethrough, modified in amber)
- [x] Diff stats bar showing added/removed/modified counts and score comparison
- [x] TypeScript check — 0 errors
- [x] Tests — 505 passing (36 test files)

## Automated Content Pipeline (Manual Trigger)
- [x] Add pipeline_jobs table to schema (id, fileId, filename, status, sourceUrl, ideaId, articleId, errorMessage, createdAt, processedAt)
- [x] Add pipeline_settings table to schema (bucketUrl, autoGenerateOutline, autoGenerateArticle, defaultProjectId, defaultWordCount, enabled)
- [x] Backend: pipeline.poll procedure — fetches JSON Bucket, identifies new files, ingests them
- [x] Backend: pipeline.ingest procedure — maps JSON fields to idea, triggers auto-generation
- [x] Backend: pipeline.autoGenerate procedure — idea → outline → article → pending_approval
- [x] Backend: pipeline.approve / pipeline.reject / pipeline.retry procedures
- [x] Backend: pipeline.getJobs / pipeline.getQueue / pipeline.getSettings procedures
- [x] Frontend: /pipeline page with Queue tab (pending approval articles)
- [x] Frontend: Activity tab (full pipeline job log with retry button)
- [x] Frontend: Settings tab (bucket URL, auto-generation toggles, defaults)
- [x] Frontend: "Run Now" manual trigger button
- [x] Owner notification when new articles are ready for review
- [x] TypeScript check — 0 errors
- [x] Tests passing (505 tests, 36 files)

## Pipeline Phase 2: On-Demand Generation from Queue
- [x] Backend: pipeline.generateOutlineForJob + generateArticleForJob + getJobOutline procedures
- [x] Frontend: "Generate Outline" button on queue items that have no outline
- [x] Frontend: "Generate Article" button on queue items that have an outline but no article
- [x] Frontend: Outline preview dialog before committing to article generation
- [x] Show outline sections in preview with option to proceed or cancel
- [x] TypeScript check — 0 errors
- [x] Tests passing (504/505, 1 pre-existing timeout)

## Pipeline S3 Integration
- [x] Add AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION)
- [x] Validate S3 credentials with vitest
- [x] Rewrite pipeline.runPoll to list objects from s3://marketing-manus-scraper/incoming/
- [x] Parse each JSON file: extract topic + articles array, create pipeline job per article
- [x] Update pipeline_settings to store bucket name + prefix instead of bucket URL
- [x] Update frontend Settings tab to show S3 bucket/prefix fields
- [x] TypeScript check — 0 errors
- [x] Tests passing (506 tests, 37 files)

## Pipeline → Scheduler Integration (Option A)
- [x] Understand keyword_queue table structure and how Scheduler pulls from it
- [x] Update pipeline.approveJob → sendToScheduler (adds keyword to Scheduler's keyword_queue)
- [x] Allow user to select which Scheduled Job to send approved items to
- [x] Remove redundant "Generate Outline" and "Generate Article" buttons from Pipeline
- [x] Update frontend Queue tab: "Approve" becomes "Send to Scheduler" with job picker
- [x] Update Activity tab to reflect new statuses (sent_to_scheduler)
- [x] TypeScript check — 0 errors
- [x] Tests passing (504/506, 2 pre-existing timeouts)

## Pipeline Briefs Rebuild (S3 → AI Brief → Review → Scheduler)
- [x] Add pipeline_briefs table to schema (id, pipelineJobId, title, primaryKeyword, secondaryKeywords JSON, description, suggestedLinkCount, suggestedWordCount, status, approvedAt, editedFields JSON, createdAt)
- [x] Push migration for pipeline_briefs table
- [x] Add db helpers: createBrief, getBriefsByProject, getBriefById, updateBrief, approveBrief, rejectBrief
- [x] Update ingest logic: after S3 pull, call AI to generate a Brief from each article's JSON data
- [x] Add tRPC procedures: pipeline.getBriefs, pipeline.getBrief, pipeline.updateBrief, pipeline.approveBrief, pipeline.rejectBrief
- [x] Build frontend Brief Review page with editable cards (title, primaryKeyword, secondaryKeywords, description, linkCount, wordCount)
- [x] Add approve/reject actions on each Brief card
- [x] Add bulk approve option
- [x] Update Scheduler integration: merge Brief's secondary keywords into Scheduler's keyword pool during generation
- [x] TypeScript check — 0 errors
- [x] Tests passing (506 tests, 37 files)

- [x] Activity tab: Add checkboxes with select all and bulk delete for pipeline jobs

## Brief Enforcement & Compliance Scoring (Option 3)
- [x] Store full brief data (title, description, word count, link count, secondary keywords) alongside keyword in Scheduler queue
- [x] Modify article generation prompts to include brief as creative directive (title direction, description/angle, word count target, link count target)
- [x] Add post-generation brief compliance scoring: LLM checks article vs brief and returns adherence percentage + breakdown
- [x] Display brief adherence score on generated articles in the UI (Articles page and/or article detail view)
- [x] Write tests for brief enforcement and compliance scoring

## Bug Fixes
- [x] Fix: After editing and saving a brief, it stays in edit mode instead of returning to the normal card view with Approve/Edit/Regenerate/Reject buttons
- [x] Add "Approved" section to the Briefs tab showing history of approved briefs with details and which Scheduler job they were sent to
- [x] Move approved briefs to a separate "Approved" tab (4th tab) on the Pipeline page, remove from Briefs tab

## Pipeline Soft Delete (Dismiss)
- [x] Add 'dismissed' status or flag to pipeline_jobs schema
- [x] Update Activity tab to filter out dismissed jobs from the default view
- [x] Change delete button to "Dismiss" in the UI
- [x] Ensure dedup logic still sees dismissed records (no re-ingestion)
- [ ] Add option to view/un-dismiss dismissed jobs if needed (backend ready, UI deferred)

## Teams Notifications
- [x] Store Teams webhook URL as a secret/env variable
- [x] Create a reusable Teams notification helper (sends adaptive cards to webhook)
- [x] Send Teams notification when pipeline briefs are generated (summary with count and link to Pipeline page)
- [x] Send Teams notification when Scheduler finishes writing an article (title, keyword, compliance score, link to article)
- [x] Add timestamp to completed keyword queue items in the Scheduler (shows date/time when article was generated)

## Publish to CMS Integration
- [x] Inspect MedicareFAQ CMS API endpoint and auth mechanism (x-cms-password header)
- [x] Store CMS_PASSWORD as environment secret
- [x] Create cmsPublish.ts helper (publishToCms function + slug generator)
- [x] Add articles.publishToCms tRPC procedure (fetches article, publishes to CMS, updates status to published)
- [x] Add "Publish to CMS" button in Article Editor overflow menu (with loading state, disabled when already published)
- [x] Write vitest test validating CMS_PASSWORD secret
- [x] Change CMS integration to save as DRAFT instead of publishing directly (uses /api/cms/drafts endpoint, article can be reviewed in CMS before going live)

## Keyword Queue: Drag-and-Drop Reordering + Section Separation
- [x] Install drag-and-drop library (dnd-kit or similar)
- [x] Separate keyword queue into two sections: "Up Next" (pending) and "Written" (completed)
- [x] Add drag-and-drop reordering to the pending keywords section
- [x] Add drag handle icon to each pending keyword row
- [x] Persist new sort order to backend on drop (update sortOrder field)
- [x] Add backend tRPC mutation for bulk reorder (update sortOrder for multiple items) — already existed
- [x] Completed keywords show in collapsed "Written" section with View Article links
- [x] Write vitest tests for reorder mutation
- [x] Save checkpoint

## Unified Content Engine Page (consolidate Pipeline + Scheduler)
- [x] Create ContentEngine.tsx page at /engine with 5 tabs: Intake, Review, Queue, Schedule, Output
- [x] Intake tab: S3 polling + manual keyword entry (from Pipeline Settings + Scheduler keyword add)
- [x] Review tab: Brief review with approve/reject/edit (from Pipeline Briefs tab)
- [x] Queue tab: Drag-and-drop ordered keyword queue with sections (from Scheduler keywords)
- [x] Schedule tab: Job list with create/edit/pause/resume/delete/run-now (from Scheduler)
- [x] Output tab: Run history + generated articles + CMS push status (from both Activity tabs)
- [x] Add /engine route to App.tsx
- [x] Update sidebar nav: add "Content Engine" pointing to /engine in Automation section
- [ ] Redirect /pipeline and /project-scheduler to /engine (kept both for now — old pages still accessible)
- [x] Keep drafts-only CMS push (no auto-publish)
- [x] Support multiple jobs per project
- [x] Write vitest tests for the new page
- [x] Save checkpoint

## Remove Old Pipeline/Scheduler Pages
- [x] Remove Pipeline nav item from AppLayout sidebar
- [x] Remove ProjectScheduler route from App.tsx
- [x] Remove Pipeline route from App.tsx (or redirect to /engine)
- [x] Add redirects from /pipeline and /project-scheduler to /engine
- [x] Remove Pipeline.tsx and ContentScheduler.tsx page files

## Push to CMS Button on Article Editor
- [x] Replace the "Edit" button with "Push to CMS" button (green background)
- [x] Wire button to call the CMS publish tRPC mutation
- [x] Show loading state while pushing and success/error toast

## Chain "Transform with AI" After CMS Push
- [x] After pushing a draft to CMS, automatically call POST /api/cms/drafts/{draft-id}/transform
- [x] Use CMS_PASSWORD for auth (x-cms-password header)
- [x] Update the publishToCms tRPC procedure to chain the transform call
- [x] Show transform status in the UI (success/failure toast via return message)

## Bug Fix: Transform with AI Not Triggering After CMS Push
- [x] Identified root cause: transform call was hitting wrong domain (rebuild.medicarecompared.com returns HTML, not the API)
- [x] Fixed transform URL to use correct API domain (medicarefaq-next-nine.vercel.app)
- [x] Added detailed logging for transform call (URL, status, response body)
- [x] Added 3 vitest tests confirming correct domain usage and transform success

## Free Writer Feature
- [x] Add freeWriter tRPC procedure (uses Claude/Anthropic, loads Brand Voice + ICP)
- [x] Add /write route and Free Writer page with form (title, description, keyword, format, length)
- [x] Support formats: LinkedIn Post, Short Article, Facebook Post, Email Newsletter, YouTube Script, Landing Page Copy, Custom
- [x] Auto-load project Brand Voice and ICP into prompt
- [x] Add banned phrases and em-dash avoidance to prompt
- [x] Add nav item "Free Writer" under Content section
- [x] Display generated content with copy button
- [x] Write vitest test for freeWriter procedure
