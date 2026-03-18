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
- [ ] Add Cross Check button/action to Article Editor
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
