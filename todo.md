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
