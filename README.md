# Project Idea to Plan

An AI-powered tool that transforms abstract app ideas into structured, actionable project plans. Enter your idea, configure an AI provider, answer a few clarifying questions, and get a full-width Decision Trace across Purpose, People, Product, Architecture, Delivery, and Handoff domains. Every section of the generated brief is fully editable, with accessible visual graphs and one-click export.
The application is 100% created by AI with Opencode as AI agent. Model usage is ChatGPT 5.5 and Opencode big pickle for the code and Chat GPT 5.6 for the final UI.

Inspired by the application created in this Youtube: https://youtu.be/uZGDO0L-Dr4?si=VK214o3bgol-9e6A 
Discover more of the creator on https://www.youtube.com/@leonvanzyl and https://github.com/leonvanzyl

## Features

- **Clarifying Questions** — Before generating, the AI asks interactive multiple-choice questions to sharpen the brief. Regenerate, add, or skip questions as needed.
- **Full Project Brief** — Generates app summary, target users, core features, recommended tech stack, pages & routes, data model, build phases/roadmap, and risks & edge cases.
- **Starter Prompt** — Produces a ready-to-use prompt for bootstrapping the project, with feedback-driven refinement.
- **Editable Sections** — Every part of the generated brief is inline-editable. Tweak users, features, tech stack, entities, or roadmap directly in the UI.
- **Visual Graphs** — Interactive Data Model and Planner Flow diagrams powered by React Flow.
- **11 Built-in Themes** — Switch between Blueprint, Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour, Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, and Midnight Galaxy.
- **Export** — Copy or download the markdown brief and starter prompt with one click.
- **Real-time Streaming** — Watch the brief generate token by token as the AI works.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4, `class-variance-authority`, `clsx`, `tailwind-merge` |
| AI Integration | Vercel AI SDK + `@ai-sdk/openai-compatible` |
| Graphs | React Flow (`@xyflow/react`) |
| Drag & Drop | `@dnd-kit/react` |
| UI Primitives | Radix UI (`@radix-ui/react-slot`) |
| Icons | Lucide React |
| Validation | Zod v4 |
| Package Manager | npm |

No database, authentication, or environment variables required. All configuration is handled through the UI.

## Installation

### Prerequisites

- Node.js v20.9 or later
- npm (bundled with Node.js)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/timdeclerck2100-Deurne/Project-idea-to-plan
   cd Project-idea-to-plan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

That's it. No `.env` file is needed — the app accepts all configuration through its UI.

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Enter your app idea in the text area.

4. Configure your AI provider in the settings panel:
   - **Base URL** — Endpoint for any OpenAI-compatible provider (OpenAI, Anthropic, Ollama, LM Studio, etc.)
   - **Model** — The model name to use (e.g., `gpt-4o`, `claude-sonnet-4-20250514`)
   - **API Key** — Your provider's API key (never persisted, always entered fresh)

5. Click **Generate**. The AI will first produce a set of clarifying questions — answer them to sharpen the brief, regenerate any you don't like, add your own, or skip straight to generation.

6. Review the generated Decision Trace. Every domain and section (app summary, target users, features, tech stack, pages, data model, roadmap, risks, and handoff artifacts) is inline-editable.

7. Export via the **Copy** or **Download** buttons on the Markdown Brief and Starter Prompt cards. You can also refine the starter prompt by clicking **Update** and providing feedback.

Non-secret settings (base URL and model) are saved to `localStorage` automatically.

## Deployment

Up to you to decide.

### Self-Hosted

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

> **Note:** In production, the app enforces HTTPS for AI provider URLs and blocks private/internal endpoints (localhost, `127.x`, `10.x`, `192.168.x`, etc.). Ensure your provider's API endpoint uses HTTPS and is publicly accessible from your server. This restriction is lifted in development mode.

## Warranty 

The app is provided as is. Issues can be reported but no guarantee they will be fixed. Feature requests will be analyzed and implemented if I feel them to be useful. 

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
