# Decision Trace Redesign

## Status

- [x] Redesign source-of-truth document created.
- [x] Phase 1 baseline protection. **Complete; extended characterization remains ongoing.**
- [x] Phase 2 rendering/orchestration separation. **Complete.**
- [x] Phase 3 CSS cascade and theme foundation. **Complete.**
- [x] Phase 4 accessible primitives and typography. **Complete.**
- [x] Phase 5 full-width shell and workflow states. **Complete.**
- [x] Phase 6 Decision Trace workspace. **Complete.**
- [x] Phase 7 roadmap and graphs. **Complete.**
- [x] Phase 8 responsive, accessibility, and theme hardening. **Complete.**
- [ ] Phase 9 final regression and documentation alignment. **Automated checks and docs complete; manual review pending.**

## Thesis

The product should read as a **Decision Trace**, not a dashboard of equal cards. A project idea moves through six ordered domains that turn intent into a buildable handoff. The interface may show answered questions and real generation stages, but it must not claim that a specific answer caused a specific section because the current data model does not store that provenance.

The command surface starts the trace. Purpose establishes intent; People identifies who matters; Product defines what must exist; Architecture makes it feasible; Delivery sequences the work; Handoff packages the current decisions. Generated content remains directly editable, AI assistance remains contextual, and exports remain derived from the latest brief.

## Constraints

- Use the full browser width. Do not introduce a centered `max-width` application container.
- Sustained reading and editing text is at least `16px` with comfortable line height.
- Controls, labels, badges, and metadata are at least `14px`; icons may be smaller only when paired with an accessible label.
- Preserve all 11 themes: Blueprint, Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour, Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, and Midnight Galaxy.
- Use one type system across every theme. Themes may change color and surface expression, not font families or hierarchy.
- Preserve the current workflow, API routes, request/response behavior, `ProjectBrief` schema, export behavior, and storage keys.
- Keep the API key in memory only. Continue persisting only approved non-secret settings and the selected theme.
- Do not add a database or change storage architecture.
- Do not use Playwright. Verification uses Vitest unit tests, Vitest Browser Mode with WebdriverIO/Chromium, axe, visual baselines, static checks, build checks, and manual responsive review.
- Continue using CSS for motion; do not add Framer Motion or another animation runtime.
- Follow `DESIGN.md` token usage unless this document explicitly supersedes its layout, typography-size, or per-theme font guidance.

## Domain Composition

| Order | Domain | Existing brief content | Interface responsibility |
| --- | --- | --- | --- |
| 1 | Purpose | `appName`, `appSummary` | State the product promise and make the trace identifiable. |
| 2 | People | `targetUsers` | Capture audiences and keep user value adjacent to the purpose. |
| 3 | Product | `coreFeatures`, `pagesRoutes` | Connect capabilities to the surfaces through which users receive them. |
| 4 | Architecture | `recommendedTechStack`, `dataModel`, data-model graph | Explain how the product can be implemented and how its information relates. |
| 5 | Delivery | `buildPhases`, `risksEdgeCases`, planner-flow graph | Sequence execution and expose uncertainty before handoff. |
| 6 | Handoff | `markdownBrief`, `starterPrompt` | Package the current trace for people and implementation agents. |

Each domain is a semantic section with a numbered marker, concise orientation copy, its existing editors, and visible completion/state cues. Domains are not separate routes and do not create a second source of state.

## Responsive Composition

### Wide: `>= 1280px`

- Fill the viewport width with bounded page gutters, not a bounded page container.
- Use a fluid 12-column composition for the command surface and domain bands; do not divide the application into six narrow content columns.
- Keep the editable plan as the visual center; allow Architecture and Delivery content to span the available width.
- Keep provider settings available without competing visually with Generate, Stop, Retry, or Reset.
- Use sticky side regions only when their content fits the viewport; the document remains the primary scroll owner.

### Medium: `768px-1279px`

- Move the command surface to a full-width top panel.
- Use a two-column domain composition only where content remains readable at `16px`; otherwise span the domain.
- Convert trace navigation to a compact horizontal index with wrapping or horizontal overflow that does not clip focus states.
- Keep graphs full-width within their domain and preserve their text fallback.

### Mobile: `< 768px`

- Use one ordered column: command surface, status/questions, then Purpose through Handoff.
- Stack all controls and editors without horizontal page scrolling.
- Keep Generate/Stop and current status easy to reach; do not use a permanent side rail.
- Collapse secondary explanation before controls or generated content, but do not hide required decisions.
- Give graphs a bounded viewport and retain a readable text outline.

## Visual Rules

- Preserve the technical blueprint character while reducing glass-on-glass layering and repeated equal-weight cards.
- Use one primary page field, one elevated command surface, and restrained domain separators. Reserve `.paper-card` for meaningful grouped content rather than every field.
- Express the trace with order, connective rules, answered-question state, and real generation stages; do not add decorative timelines or unsupported causal links.
- Use semantic theme tokens only. No hardcoded product colors in components.
- Maintain clear contrast across all 11 themes for text, borders, focus rings, status, destructive actions, and graph labels.
- Keep primary actions visually singular. Secondary AI, edit, regenerate, copy, download, and expand actions must not compete with Generate.
- Use whitespace and alignment before borders and shadows to establish hierarchy.

## Type Rules

- Use IBM Plex Sans for interface and sustained text, Fraunces for display headings, and IBM Plex Mono for code values and short technical labels.
- Apply the same three-family roles to every theme; remove theme-specific font substitutions.
- Set body copy, generated prose, textarea content, list content, and editor values to at least `1rem` (`16px`).
- Set buttons, inputs, labels, tabs, badges, statuses, and metadata to at least `0.875rem` (`14px`).
- Replace the current `0.65rem`, `10px`, and `12px` microcopy patterns. Uppercase labels must remain readable and use moderate tracking.
- Keep readable prose measures inside wide sections without constraining the full application shell.

## Theme Rules

- `lib/themes.ts` remains the canonical list and color-token source for all 11 themes.
- Theme selection and `planner-theme` persistence remain unchanged.
- Theme objects retain a compatible shape unless tests first prove a safe internal simplification.
- Color, surface, grid, and graph accents may vary by theme; typography, spacing logic, layout, and interaction semantics do not.
- Validate every theme against default, hover, focus, disabled, loading, success, and error states.

## Motion Rules

- Motion communicates entry, progress, expansion, or reordering; it does not decorate static content.
- Use CSS transitions/keyframes only, with short durations and restrained distance/scale.
- Respect `prefers-reduced-motion` by removing nonessential transforms and animations.
- Do not animate layout continuously during streamed updates.
- Keep drag feedback immediate and preserve keyboard-operable roadmap behavior.

## Implementation Phases

### 1. Test Foundation - Complete

- [x] Add Vitest, jsdom, React Testing Library, user-event, jest-dom, and axe without Playwright.
- [x] Configure unit, Chromium browser, accessibility, and visual-baseline test projects.
- [x] Characterize all 11 theme definitions, theme persistence, required planner fields, question generation, empty API-key omission, brief rendering, summary editing, exports, and graph controls.
- [x] Characterize reset, stop, late question responses, question failure/retry, roadmap mutation, clipboard, downloads, and starter-prompt feedback.
- [ ] Extend coverage for streamed overview stages, brief retry snapshots, assistants, and stale export regeneration before changing those workflows.
- [x] Record discovered defects before production restructuring.

Major files: `package.json`, `package-lock.json`, `vitest.config.mts`, `vitest.browser.config.mts`, `vitest.visual.config.mts`, `tests/setup.unit.ts`, `tests/setup.browser.ts`, `tests/unit/`, `tests/browser/`, `tests/visual/`.

### 2. Separate Rendering From Orchestration - Complete

- [x] Move the existing page JSX into a typed `PlannerView` without changing DOM order, class names, or behavior.
- [x] Move existing orchestration into one `usePlannerController` hook while preserving refs, abort ownership, retry snapshots, request counters, and stale-response guards.
- [x] Keep `app/page.tsx` as a thin entry point and do not combine extraction with a reducer rewrite, API-client rewrite, or visual changes.
- [x] Require the Phase 1 behavior, accessibility, and visual baselines to remain unchanged.

Major files: `app/page.tsx`, `components/planner/planner-view.tsx`, `hooks/use-planner-controller.ts`, `tests/unit/planner-workflow.test.tsx`.

### 3. CSS Cascade And Theme Foundation - Complete

- [x] Establish explicit theme, base, vendor, components, and utilities cascade layers.
- [x] Import React Flow CSS once in the vendor layer and remove conflicting unlayered surface recipes.
- [x] Separate invariant structural tokens from the 11 explicit palette records while preserving theme IDs and `planner-theme`.
- [x] Standardize all themes on one type system and add reduced-motion and forced-colors foundations.

Major files: `app/globals.css`, `app/layout.tsx`, `lib/themes.ts`, `components/theme-provider.tsx`, `components/planner/data-model-flow.tsx`, `components/planner/planner-process-flow.tsx`.

### 4. Accessible Primitives And Typography - Complete

- [x] Add complete button, field, status, icon-button, and mutually exclusive surface variants where active consumers require them.
- [x] Establish the `16px` sustained-text and `14px` control/metadata floors.
- [x] Replace clickable containers and unlabeled icon actions with semantic controls, explicit labels, and local undo for removals.
- [x] Migrate consumers with their layouts so larger text does not create temporary overflow regressions.

Major files: `components/ui/`, `components/planner/provider-settings.tsx`, `components/planner/clarifying-questions.tsx`, `components/planner/brief-workspace.tsx`, `components/planner/roadmap-card.tsx`.

### 5. Full-Width Shell And Workflow States - Complete

- [x] Replace the viewport-locked dashboard shell with a `100dvh`-aware full-width frame and one document scroll owner.
- [x] Recompose idea input, provider settings, theme selection, status, and primary actions using the fluid 12-column structure.
- [x] Recompose idle, questions, generating, complete, and error states without changing workflow behavior.
- [x] Use native grouped-choice semantics and bind the compact responsive trace only to real preparing, awaiting, answered, skipped, generation, completion, and error states.

Major files: `components/planner/planner-shell.tsx`, `components/planner/planner-view.tsx`, `components/planner/idea-input.tsx`, `components/planner/provider-settings.tsx`, `components/planner/generation-status.tsx`, `components/planner/clarifying-questions.tsx`, `components/theme-selector.tsx`.

### 6. Decision Trace Workspace - Complete

- [x] Replace the equal-card workspace grid with Purpose, People, Product, Architecture, Delivery, and Handoff domain bands.
- [x] Map every existing field to one domain while keeping risks cross-cutting in meaning and outputs as the terminal handoff.
- [x] Preserve every editor, assistant, export, and stale-result callback while exposing truthful domain population and Handoff freshness.
- [x] Let the generation trace recede after completion so the editable domain trace remains dominant.

Major files: `components/planner/brief-workspace.tsx`, `components/planner/brief-section-card.tsx`, `components/planner/app-name-editor.tsx`, `components/planner/inline-card-assistant.tsx`, `components/planner/markdown-export-card.tsx`, `components/planner/starter-prompt-card.tsx`.

### 7. Roadmap And Graphs - Complete

- [x] Render roadmap milestones in one sequential DOM list and use CSS for wide distribution.
- [x] Preserve pointer drag/reorder behavior with equivalent keyboard operations and announcements.
- [x] Keep roadmap milestones on stable identities and provide explicit add, remove, and undo controls.
- [x] Theme React Flow through shared semantic tokens, responsive sizing, semantic structure, and labels of at least `14px`.
- [x] Add synchronized textual graph outlines and retire duplicate process visualization only after equivalence is verified.

Major files: `components/planner/roadmap-card.tsx`, `components/planner/data-model-flow.tsx`, `components/planner/planner-process-flow.tsx`, `components/planner/expandable-graph-card.tsx`, `app/globals.css`.

### 8. Responsive, Accessibility, And Theme Hardening - Complete

- [x] Verify wide, medium, and mobile compositions without clipped content or horizontal page overflow.
- [x] Verify landmarks, heading order, labels, focus order, visible focus, keyboard actions, live status, and graph text alternatives.
- [x] Verify all 11 themes and reduced-motion behavior against the same interaction matrix.
- [x] Remove obsolete compact typography and redundant dashboard-only styles after usages are gone.

Major files: `app/page.tsx`, `app/globals.css`, `components/planner/planner-shell.tsx`, `components/planner/brief-workspace.tsx`, `components/planner/decision-domain.tsx`, `components/planner/decision-trace-nav.tsx`, `components/planner/expandable-graph-card.tsx`, `lib/themes.ts`, `tests/responsive-structure.test.tsx`, `tests/accessibility.test.tsx`, `tests/themes.test.ts`.

### 9. Final Regression And Documentation Alignment - Pending

- [x] Run the complete automated verification sequence and resolve failures.
- [ ] Manually review all workflow states at wide, medium, and mobile widths in representative themes, then spot-check all remaining themes.
- [x] Confirm API routes, schema, prompt generation, exports, and local-storage keys have no unintended changes.
- [x] Update `DESIGN.md` only after implementation to align it with the shipped Decision Trace system.

Major files: `DESIGN.md`, `README.md`, `package.json`, `app/api/brief/route.ts`, `app/api/brief/questions/route.ts`, `app/api/brief/assist/route.ts`, `app/api/brief/update-exports/route.ts`, `lib/brief-schema.ts`, `lib/provider-validation.ts`, `tests/`.

## Verification Commands

Run after the Phase 1 scripts and dependencies exist:

```bash
npm run verify
npm run build
```

No Playwright command is part of this redesign. Vitest Browser Mode uses WebdriverIO with local Chromium; manual review must still cover at least `1440px`, `1024px`, `768px`, `390px`, and `320px` viewport widths.

## Acceptance Criteria

- The interface presents one ordered Decision Trace with Purpose, People, Product, Architecture, Delivery, and Handoff.
- The application uses available browser width at every breakpoint and has no application-level centered maximum-width wrapper.
- Sustained text is never below `16px`; controls and metadata are never below `14px`.
- All 11 existing themes remain selectable, persist under `planner-theme`, and use one shared type system.
- Idea entry, provider configuration, optional in-memory API key, questions, generation, stop, retry, reset, inline assistance, editing, graphs, roadmap, exports, and theme selection retain their behavior.
- API paths and contracts, `ProjectBrief`, generated Markdown/starter prompt behavior, and local-storage keys remain compatible.
- Keyboard and screen-reader users can identify domains, operate controls, follow status changes, and access graph information as text.
- Wide, medium, and mobile layouts have no clipped controls, unreadable columns, or horizontal page scroll.
- Reduced-motion preferences are honored.
- Unit/component tests, lint, TypeScript checking, and production build pass.
- No Playwright dependency, configuration, test, or command is added.

## Risks

- `app/page.tsx` owns substantial workflow state; visual decomposition can accidentally alter cancellation, stale-response, or retry semantics. Protect behavior with baseline tests before moving markup.
- Increasing text and control sizes may expose overflow in dense editors, theme selection, graphs, and roadmap controls. Resolve through composition and wrapping, not font-size exceptions.
- Standardizing fonts can change text metrics across themes and reveal layout assumptions. Test long labels and generated content in every theme.
- React Flow depends on measurable containers; responsive or collapsed layouts can produce zero-size canvases. Mount graphs only in visible, dimensioned regions and retain text fallbacks.
- Sticky wide-layout regions can trap content on short viewports. Disable stickiness when content cannot fit and preserve normal document flow.
- Export freshness and assistant suggestions depend on source snapshots. Recomposition must pass existing callbacks and values without introducing parallel state.
- Manual viewport review is less repeatable without browser automation. Keep responsive structure assertions focused and record the required review matrix.

## Known Baseline Defects

- Abort handling depends on `instanceof DOMException`; if a fetch implementation ignores abort and rejects differently, Stop can surface an error instead of returning cleanly to idle.
- These defects were characterized before restructuring; clipboard failures were fixed in Phase 4, while abort classification remains deferred to a workflow-focused change.

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-06 | Adopt Decision Trace as the revised thesis. | The brief is a sequence of consequential decisions, not a collection of equal dashboard widgets. |
| 2026-08-06 | Organize existing content into six domains. | This creates a coherent narrative without changing schema or workflow. |
| 2026-08-06 | Use full browser width with responsive composition changes. | Architecture graphs, delivery plans, and editing controls need room while mobile still requires a linear flow. |
| 2026-08-06 | Enforce `16px` sustained text and `14px` minimum controls/metadata. | The current compact scale harms readability and control clarity. |
| 2026-08-06 | Preserve all palettes but use one type system. | Theme identity should come from color and surfaces, while typography remains predictable and legible. |
| 2026-08-06 | Establish tests before production restructuring. | Existing async generation, cancellation, stale-response, persistence, and export behavior are regression-sensitive. |
| 2026-08-06 | Exclude Playwright. | The approved verification strategy is unit/component coverage, static/build checks, and manual responsive review. |
| 2026-08-06 | Use Vitest Browser Mode with WebdriverIO. | This provides real Chromium accessibility and visual testing without Playwright. |
| 2026-08-06 | Show only truthful trace states. | The current schema does not store question-to-section provenance, so visual connections cannot claim it. |
| 2026-08-06 | Keep all question descriptions visible. | Persistent descriptions improve comprehension and radio accessibility without changing the selected answer payload. |

## Progress Log

| Date | Status | Entry |
| --- | --- | --- |
| 2026-08-06 | Planning complete; implementation not started | Audit and design plan completed; test foundation starting. No production code or test work is recorded as complete. |
| 2026-08-06 | Phase 1 in progress | Added Vitest unit, jsdom, Testing Library, axe, WebdriverIO Chromium, and visual-baseline infrastructure without Playwright. Added 14 unit tests, one browser accessibility test, and one visual regression test. Initial lint, typecheck, tests, and build passed. |
| 2026-08-06 | Phase 1 complete | Expanded baseline to 28 unit tests covering themes, planner questions/lifecycle, brief rendering/editing, roadmap mutations, copy/download, and starter-prompt feedback. Browser accessibility and visual tests remain green. |
| 2026-08-06 | Phase 2 complete | Extracted `PlannerView` and `usePlannerController`; reduced `app/page.tsx` from 1,245 lines to a 10-line entry without changing DOM, styling, or workflow behavior. Full verification and production build passed. |
| 2026-08-06 | Phase 3 complete | Added deterministic CSS layers, centralized React Flow vendor CSS, introduced invariant structural tokens, normalized all 11 themes to one typography system, synchronized `data-theme`, and added reduced-motion/forced-colors foundations. Accepted the intentional larger, higher-contrast field-label baseline. Verification passed with 31 unit tests plus browser accessibility and visual tests. |
| 2026-08-06 | Phase 4 complete | Raised editable and explanatory content to 16px and labels/metadata to 14px; enlarged shared controls; introduced exclusive surface variants; converted questions to native radios; made removals keyboard-operable with undo; added focus restoration, clipboard error recovery, field metadata, and viewport-safe theme selection. Verification passed with 71 unit tests, 3 Chromium accessibility/interaction tests, visual regression, and production build. |
| 2026-08-06 | Phase 5 complete | Replaced the clipped viewport shell with a safe-area-aware full-width `100dvh` document flow; introduced the 12-column drafting bench, authored idle state, and truthful responsive generation trace; removed competing clarification actions and redundant completion banners; added adjacent error recovery and in-memory API-key guidance. Verification passed with 90 unit tests, 15 responsive Chromium state/accessibility tests across 320-1440px, 3 visual baselines, and production build. |
| 2026-08-06 | Phase 6 complete | Replaced the equal-card brief with six full-width semantic decision bands and anchor navigation; centralized domain metadata; added populated/needs-input/refresh-needed states and guarded Handoff freshness; preserved editors, assistants, exports, and name workflows; added integrated completion and Architecture/Delivery/Handoff baselines on mobile and desktop. Verification passed with 100 unit tests, 21 Chromium tests, 7 visual tests, and production build. |
| 2026-08-07 | Phase 7 complete | Shipped a sequential-DOM roadmap with pointer and equivalent announced keyboard operations, stable milestone identities, undo/add controls, semantic responsive React Flow graphs, and synchronized textual outlines. Phase verification passed with 129 unit, 34 browser, and 11 visual tests plus full verify, build, and diff-check passes; subsequent dead-code cleanup removed one obsolete tabs primitive unit test. Native pointer synthesis remains a residual test-environment limitation, not a feature failure. |
| 2026-08-07 | Phase 8 complete | Hardened all-theme semantic contrast, browser-rendered contrast checks, reduced-motion behavior, React Flow attribution accessibility, five-width real workspace coverage, focus/live-region assertions, graph keyboard reachability, and obsolete dashboard-code cleanup. Verification passed with 173 unit tests, 39 Chromium browser tests, 11 visual tests, production build, and diff-check. Manual screen-reader quality review and real pointer synthesis remain residual non-automated checks. |
| 2026-08-07 | Phase 9 automated/docs complete | Confirmed API routes, schemas, prompt generation, exports, provider validation, and approved storage keys are unchanged. Aligned `README.md`, `PLAN.md`, and `DESIGN.md` with the shipped Decision Trace system and current Node/dependency requirements. Full verification passed with 173 unit tests, 39 Chromium browser tests, 11 visual tests, production build, and diff-check; manual viewport/theme and screen-reader review remains pending before Phase 9 can be fully closed. |
