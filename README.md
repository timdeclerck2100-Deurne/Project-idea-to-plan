# Project Idea to Plan

An AI-powered tool that transforms abstract app ideas into structured, actionable project plans. Enter your idea, configure an AI provider, and get a comprehensive blueprint including clarifying questions, a project brief, data models, build phases, and starter prompts — all streamed in real time.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| AI Integration | Vercel AI SDK + `@ai-sdk/openai-compatible` |
| Graphs | React Flow (`@xyflow/react`) |
| Validation | Zod v4 |
| Package Manager | npm |

No database, authentication, or environment variables required. All configuration is handled through the UI.

## Installation

### Prerequisites

- Node.js v18.17 or later
- npm (bundled with Node.js)

### Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
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

5. Click **Generate** to start streaming your project plan.

Non-secret settings (base URL and model) are saved to `localStorage` automatically.

## Deployment

### Vercel (Recommended)

1. Push your repository to GitHub.

2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.

3. Vercel detects Next.js automatically — no configuration needed. Click **Deploy**.

Your app will be live on a `.vercel.app` URL within seconds.

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

> **Note:** In production, the app enforces HTTPS for AI provider URLs. Ensure your provider's API endpoint uses HTTPS and is accessible from your server.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
