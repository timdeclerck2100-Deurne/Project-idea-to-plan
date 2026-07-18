# AI Project Planner Plan

## Confirmed Choices

- API key: optional.
- Generation UX: streaming progress.
- Export: starter prompt and Markdown brief export.
- Graphs: both data model graph and planning-process graph in tabs.
- Persistence: remember non-secret settings only.

## Architecture

Use a single-page Next.js App Router app.

```txt
app/
  page.tsx
  api/
    brief/
      route.ts
```

Client responsibilities:

- App idea input.
- Custom OpenAI-compatible URL input.
- Optional API key input.
- Model name input.
- Editable generated brief.
- Graph tabs.
- Copy/export actions.
- `localStorage` for non-secret settings only.

Server responsibilities:

- Validate request body.
- Validate and sanitize custom endpoint URL.
- Call AI SDK with an OpenAI-compatible provider.
- Return streamed generation progress/output.

## Key Dependencies

```txt
ai
@ai-sdk/openai-compatible
zod
@xyflow/react
lucide-react
class-variance-authority
clsx
tailwind-merge
```

Add shadcn/ui primitives as needed.

## Component Structure

```txt
components/
  planner/
    planner-shell.tsx
    command-rail.tsx
    idea-input.tsx
    provider-settings.tsx
    generation-status.tsx
    brief-workspace.tsx
    brief-section-card.tsx
    data-model-editor.tsx
    graph-tabs.tsx
    data-model-flow.tsx
    planner-process-flow.tsx
    markdown-export-card.tsx
    starter-prompt-card.tsx

components/ui/
  button.tsx
  card.tsx
  input.tsx
  textarea.tsx
  label.tsx
  badge.tsx
  tabs.tsx
  separator.tsx
  scroll-area.tsx
```

## Data Flow

1. User enters idea, base URL, model, and optional API key.
2. Non-secret settings are saved to `localStorage`:
   - base URL
   - model
   - possibly last idea
3. API key is never persisted.
4. Client sends request to `/api/brief`.
5. Server validates endpoint URL and request input.
6. Server uses AI SDK with a custom OpenAI-compatible provider.
7. Response streams progress/output to the client.
8. Client builds the final editable `ProjectBrief`.
9. User edits sections locally.
10. Graphs and exports update from current edited state.

## Brief Schema

Core shape:

```ts
type ProjectBrief = {
  appSummary: string;
  targetUsers: string[];
  coreFeatures: string[];
  recommendedTechStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    ai: string[];
    deployment: string[];
  };
  pagesRoutes: {
    path: string;
    purpose: string;
    keyComponents: string[];
  }[];
  dataModel: {
    entities: Entity[];
    relationships: Relationship[];
  };
  buildPhases: {
    name: string;
    goals: string[];
    deliverables: string[];
  }[];
  risksEdgeCases: string[];
  starterPrompt: string;
  markdownBrief: string;
};
```

## Graph Tabs

Use `@xyflow/react`.

Data Model tab:

- Nodes: entities.
- Edges: relationships.
- Node content: name, description, fields.
- Derived from editable `brief.dataModel`.

Planner Flow tab:

- Nodes:
  - Idea
  - Provider Settings
  - AI Generation
  - Project Brief
  - Editable Sections
  - Markdown Export
  - Starter Prompt
- Edges show how input becomes usable implementation output.

Always include a text fallback/outline for accessibility.

## Streaming Approach

Because custom OpenAI-compatible endpoints may vary, use streaming for UX but keep the response contract simple.

Recommended tutorial approach:

- Stream status/progress text while generating.
- Accumulate the final structured JSON/validated brief at the end.
- If provider streaming fails, show a clear compatibility error.

## Security Requirements

For custom base URLs:

- Require `https://` in production.
- Allow `localhost` only in development.
- Reject private/internal IP ranges.
- Reject invalid protocols.
- Avoid logging API keys.
- Avoid persisting API keys.
- Sanitize provider errors.
- Add timeout handling.

## Implementation Steps

1. Install dependencies.
2. Set up shadcn/ui primitives.
3. Update `globals.css` with `DESIGN.md` tokens/utilities.
4. Create `lib/brief-schema.ts`.
5. Create `lib/planner-prompt.ts`.
6. Create `lib/provider-validation.ts`.
7. Create `/api/brief` streaming route.
8. Build planner shell and command rail.
9. Add editable brief workspace.
10. Add graph tabs with React Flow.
11. Add Markdown export and starter prompt copy actions.
12. Add localStorage for non-secret settings.
13. Run `npm run lint`.
14. Run `npm run build`.
