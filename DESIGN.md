# Design System

This document defines the visual design system for Project Idea to Plan. All UI components and pages must follow these conventions.

## 1. Design Philosophy

**Blueprint Aesthetic** — The app uses an engineering/blueprint metaphor with a dark, immersive, layered visual language.

Core principles:
- **Dark-first**: All themes use dark backgrounds (lightness < 0.30 in oklch)
- **Layered depth**: Multiple translucent surface layers create visual hierarchy
- **Functional glassmorphism**: Backdrop blur and transparency serve readability, not decoration
- **Technical precision**: Grid patterns, monospace labels, and structured layouts reinforce the "planning tool" identity
- **Thematic flexibility**: 11 built-in themes swap the entire palette at runtime without changing component structure

## 2. Color System

### Color Space

All colors use **oklch** (OKLab + lightness/chroma/hue) for perceptually uniform color manipulation. Example: `oklch(0.80 0.19 61)` = lightness 80%, chroma 0.19, hue 61° (amber).

### Architecture

Colors flow through three layers:

1. **CSS custom properties** on `:root` — raw oklch values
2. **`@theme inline` block** in `globals.css` — maps custom properties to Tailwind utility names
3. **Tailwind classes** in components — consumed as `bg-primary`, `text-muted-foreground`, etc.

### Token Categories

| Category | Prefix | Purpose | Example |
|----------|--------|---------|---------|
| Semantic | (none) | Core UI colors | `--background`, `--primary`, `--accent` |
| Semantic FG | `-foreground` | Text on semantic bg | `--primary-foreground`, `--card-foreground` |
| Utility | `--ut-` | Surface/effect colors | `--ut-glass-bg`, `--ut-paper-shadow` |
| Blueprint | `--ut-bp-` | Blueprint surface colors | `--ut-bp-grid`, `--ut-bp-bg` |
| Command | `--ut-cmd-` | Command strip gradient | `--ut-cmd-from`, `--ut-cmd-via`, `--ut-cmd-to` |

### Semantic Color Tokens

| Token | Usage | Default (Blueprint) |
|-------|-------|---------------------|
| `--background` | Page background | `oklch(0.17 0.055 252)` |
| `--foreground` | Primary text | `oklch(0.95 0.04 88)` |
| `--card` | Card surface | `oklch(0.22 0.06 252 / 80%)` |
| `--primary` | Primary actions, highlights | `oklch(0.80 0.19 61)` (amber) |
| `--secondary` | Secondary surfaces | `oklch(0.28 0.08 244 / 78%)` |
| `--muted` | Subdued surfaces | `oklch(0.28 0.07 252 / 68%)` |
| `--accent` | Accent highlights | `oklch(0.79 0.16 178)` (teal) |
| `--destructive` | Error/danger states | `oklch(0.70 0.23 31)` (red) |
| `--border` | Subtle borders | `oklch(0.98 0.02 88 / 18%)` |
| `--ring` | Focus ring color | `oklch(0.82 0.17 178)` |

## 3. Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-body` | IBM Plex Sans | Body text, UI labels, descriptions |
| `--font-display` | Fraunces (serif) | Headings, app names, hero text |
| `--font-code` | IBM Plex Mono | Micro-labels, code, monospace contexts |

Fallback stacks are defined in `lib/themes.ts` and injected via CSS custom properties.

### Micro-Label Pattern

A signature design element used for section eyebrows and category headers:

```css
.micro-label {
  font-family: var(--font-code);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ut-micro-color);
}
```

Usage: Apply the `.micro-label` class to small uppercase labels above section titles.

### Typography Scale

| Element | Class | Size | Weight | Font |
|---------|-------|------|--------|------|
| Card title | `font-display text-xl font-bold` | 1.25rem | 700 | Display |
| Body text | `text-sm` | 0.875rem | 400 | Body |
| Button text | `text-sm font-semibold` | 0.875rem | 600 | Body |
| Badge text | `text-xs font-semibold font-mono uppercase tracking-widest` | 0.75rem | 600 | Mono |
| Micro-label | `.micro-label` | 0.65rem | 600 | Mono |

## 4. Surface System

The app uses a layered depth hierarchy. Each layer has increasing opacity and decreasing blur, creating visual depth.

### Layer Hierarchy

```
┌─────────────────────────────────────────┐
│  planner-bg (full screen)               │  Layer 0: Background
│  ┌─────────────────────────────────┐    │
│  │  glass-panel                    │    │  Layer 1: Elevated overlays
│  │  ┌─────────────────────────┐    │    │
│  │  │  paper-card             │    │    │  Layer 2: Content containers
│  │  │  ┌─────────────────┐    │    │    │
│  │  │  │ blueprint-surface│    │    │    │  Layer 3: Technical areas
│  │  │  └─────────────────┘    │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Surface Definitions

| Surface | Class | Blur | Opacity | Use For |
|---------|-------|------|---------|---------|
| Planner BG | `.planner-bg` | none | gradient | Full-screen background with grid pattern and radial color overlays |
| Glass Panel | `.glass-panel` | 16px | 72% | Elevated overlays, settings panels, modals |
| Paper Card | `.paper-card` | 8px | 62% | Content cards, section containers, editable regions |
| Blueprint | `.blueprint-surface` | none | 85% bg | Graph containers, technical/flow diagrams |

### CSS Properties

Each surface uses these property groups:
- **Background**: Semi-transparent oklch color
- **Backdrop filter**: `blur(Xpx) saturate(1.2-1.4)`
- **Border**: 1px solid with low-opacity foreground color
- **Box shadow**: Inset highlight (top) + outer shadow (depth)
- **Inset**: `inset 0 1px 0` with very low opacity foreground for subtle inner glow

## 5. Component Library

### Base Components (`components/ui/`)

All base components follow shadcn/ui patterns: CVA for variants, `cn()` for class composition, `forwardRef` for ref forwarding.

#### Button

| Variant | Style | Usage |
|---------|-------|-------|
| `default` | Command strip gradient (amber → teal → purple), white text | Primary actions (Generate, Export) |
| `destructive` | `bg-destructive` | Delete, cancel, error actions |
| `outline` | Glass-like: `bg-card/30 backdrop-blur-sm border` | Secondary actions, toggles |
| `secondary` | `bg-secondary` | Tertiary actions |
| `ghost` | Transparent, `hover:bg-muted/50` | Inline actions, icon buttons |
| `link` | `text-primary underline` | Navigation links |

| Size | Dimensions | Usage |
|------|-----------|-------|
| `default` | h-10, px-5 | Standard buttons |
| `sm` | h-8, px-3, rounded-lg | Compact/inline buttons |
| `lg` | h-12, px-8 | Hero/CTA buttons |
| `icon` | h-10, w-10 | Icon-only buttons |

All buttons: `rounded-xl`, `font-semibold`, `hover:-translate-y-0.5 active:translate-y-0`

#### Card

Anatomy: `Card` → `CardHeader` → `CardTitle` / `CardDescription` → `CardContent` → `CardFooter`

- Base: `.paper-card rounded-2xl`
- Header padding: `p-5`
- Content padding: `p-5 pt-0`
- Title: `font-display text-xl font-bold tracking-tight`

#### Badge

| Variant | Style | Usage |
|---------|-------|-------|
| `default` | `bg-primary text-primary-foreground` | Active/selected items |
| `secondary` | `bg-secondary text-secondary-foreground` | Inactive items |
| `destructive` | `bg-destructive text-destructive-foreground` | Error states |
| `outline` | `border-border text-foreground` | Neutral tags |
| `accent` | `bg-accent/20 text-accent` | Accent highlights |

All badges: `rounded-full font-mono uppercase tracking-widest text-xs`

#### Input / Textarea

```css
rounded-xl border border-border bg-background/30 backdrop-blur-sm
```

With shadow inset for depth. Textarea adds `resize-none` by default.

#### Tabs

- Tab list: `rounded-xl bg-muted/50`
- Tab triggers: `rounded-lg uppercase font-mono tracking-wider`
- Active: `data-[state=active]:bg-card`

## 6. Interaction Patterns

### Hover States

- **Buttons**: `hover:-translate-y-0.5 active:translate-y-0` (subtle lift)
- **Cards**: No hover transform (static surfaces)
- **Outline buttons**: `hover:bg-card/50 hover:border-accent/30`

### Focus States

All interactive elements: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### Disabled States

`disabled:pointer-events-none disabled:opacity-50`

### Input Focus

Inputs and textareas inherit the global focus ring. No custom focus styling beyond the ring.

## 7. Animations

The app uses **CSS-only animations** — no Framer Motion.

### Keyframes

| Animation | Name | Duration | Easing | Effect |
|-----------|------|----------|--------|--------|
| Fade Up | `fade-up` | 0.5s | ease-out | `opacity: 0 → 1`, `translateY(12px → 0)` |
| Scale In | `scale-in` | 0.35s | ease-out | `opacity: 0 → 1`, `scale(0.96 → 1)` |

### Usage

```html
<div class="animate-fade-up">...</div>
<div class="animate-scale-in">...</div>
```

Both use `animation-fill-mode: both` (start hidden, end visible).

### Drag States

```css
.roadmap-drop-active {
  background: color-mix(in oklch, var(--accent) 8%, transparent);
  border: 1px dashed color-mix(in oklch, var(--accent) 40%, transparent);
}

.roadmap-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}
```

## 8. Theme System

### Architecture

Themes are defined in `lib/themes.ts` as an array of `Theme` objects. Each theme provides:
- `colors`: 22 semantic color tokens (oklch values)
- `fonts`: 3 font family stacks (body, display, code)
- `utilities`: 18 utility surface colors
- `swatches`: 4 hex preview colors

### Runtime Injection

1. `buildThemeStyleString(theme)` generates a `<style>` string with all `:root` custom properties
2. `ThemeProvider` injects this via a `<style>` element in `<head>` (SSR-safe via `beforeInteractive` script)
3. Theme changes update the `<style>` element content reactively via `useSyncExternalStore`

### Persistence

Selected theme ID is stored in `localStorage` under key `planner-theme`.

### Adding a New Theme

1. Add a new `Theme` object to the `themes` array in `lib/themes.ts`
2. Define all 22 colors, 3 fonts, 18 utilities, and 4 swatches
3. The theme automatically appears in the theme selector UI

## 9. Layout Conventions

### Page Structure

```
PlannerShell (.planner-bg, full screen, flex column, overflow-hidden)
├── Top bar / settings
├── IdeaInput (flex-1 textarea)
├── ClarifyingQuestions (conditional)
├── BriefWorkspace (scrollable content area)
│   ├── Responsive grid (1/2/4 columns)
│   │   └── BriefSectionCard × N
│   ├── DataModelFlow (React Flow graph)
│   ├── PlannerProcessFlow (React Flow graph)
│   ├── MarkdownExportCard
│   └── StarterPromptCard
└── Footer / status
```

### Spacing Patterns

| Context | Padding | Gap |
|---------|---------|-----|
| Card internal | `p-3` or `p-5` | `gap-2` / `gap-3` |
| Card header | `p-5` | `space-y-1.5` |
| Card content | `p-5 pt-0` | — |
| Grid layouts | — | `gap-3` / `gap-4` |
| Button groups | — | `gap-2` |

### Responsive Grid

BriefWorkspace uses responsive CSS grid:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 4 columns (for section cards)

### Overflow

- `PlannerShell`: `overflow-hidden` (prevents body scroll)
- `BriefWorkspace`: `overflow-y-auto` (scrollable content)
- `ScrollArea` component: `overflow-auto` wrapper

## 10. Design Tokens Reference

### Semantic Colors

| CSS Variable | Tailwind | Description |
|-------------|----------|-------------|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Primary text |
| `--card` | `bg-card` | Card surface |
| `--card-foreground` | `text-card-foreground` | Text on card |
| `--primary` | `bg-primary` | Primary action color |
| `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `--secondary` | `bg-secondary` | Secondary surface |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `--muted` | `bg-muted` | Subdued surface |
| `--muted-foreground` | `text-muted-foreground` | Subdued text |
| `--accent` | `bg-accent` | Accent color |
| `--accent-foreground` | `text-accent-foreground` | Text on accent |
| `--destructive` | `bg-destructive` | Error/danger |
| `--destructive-foreground` | `text-destructive-foreground` | Text on destructive |
| `--border` | `border-border` | Border color |
| `--ring` | `ring-ring` | Focus ring |
| `--input` | `border-input` | Input borders |

### Utility Colors

| CSS Variable | Purpose |
|-------------|---------|
| `--ut-planner-gradient` | Background gradient overlay |
| `--ut-planner-grid` | Grid line color |
| `--ut-planner-radial1` | Radial glow 1 (top-left) |
| `--ut-planner-radial2` | Radial glow 2 (bottom-right) |
| `--ut-glass-bg` | Glass panel background |
| `--ut-glass-border` | Glass panel border |
| `--ut-glass-shadow` | Glass panel shadow |
| `--ut-glass-inset` | Glass panel inner glow |
| `--ut-paper-bg` | Paper card background |
| `--ut-paper-border` | Paper card border |
| `--ut-paper-shadow` | Paper card shadow |
| `--ut-paper-inset` | Paper card inner glow |
| `--ut-bp-grid` | Blueprint grid lines |
| `--ut-bp-bg` | Blueprint background |
| `--ut-bp-border` | Blueprint border |
| `--ut-cmd-from` | Command strip gradient start |
| `--ut-cmd-via` | Command strip gradient middle |
| `--ut-cmd-to` | Command strip gradient end |
| `--ut-cmd-text` | Command strip text |
| `--ut-micro-color` | Micro-label text color |

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.375rem | Small elements |
| `--radius-md` | 0.5rem | Medium elements |
| `--radius-lg` | 0.75rem | Tab triggers |
| `--radius-xl` | 1rem | Buttons, inputs, badges |
| `--radius-full` | 9999px | Fully round (badges, avatars) |

## 11. Do's and Don'ts

### Do

- Use `cn()` from `@/lib/utils` for all class composition
- Use `rounded-xl` for interactive elements (buttons, inputs, badges)
- Use `rounded-2xl` for content containers (cards)
- Use `.micro-label` class for all section eyebrow text
- Use theme tokens (e.g., `bg-primary`) instead of hardcoded colors
- Use `.paper-card` for content containers that need depth
- Use `.glass-panel` for elevated overlays and settings
- Use CVA for component variants
- Use `forwardRef` for all base components

### Don't

- Don't use hardcoded hex/rgb colors — always use theme tokens
- Don't use Framer Motion — use CSS animations only
- Don't add comments to component code unless requested
- Don't use `.glass-panel` for simple content cards (use `.paper-card` instead)
- Don't use `rounded-lg` for buttons (use `rounded-xl`)
- Don't skip the `cn()` utility — never concatenate class strings
- Don't add new font families without updating all themes in `lib/themes.ts`
