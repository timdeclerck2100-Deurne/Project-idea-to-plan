import { NextRequest } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamObject } from "ai";
import { z } from "zod";
import { buildPlannerSystemPrompt, buildPlannerUserPrompt } from "@/lib/planner-prompt";
import { validateEndpointUrl, sanitizeError } from "@/lib/provider-validation";

const relationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
  type: z.string(),
});

const projectBriefSchema = z.object({
  appName: z.string(),
  appSummary: z.string(),
  targetUsers: z.array(z.string()),
  coreFeatures: z.array(z.string()),
  recommendedTechStack: z.object({
    frontend: z.array(z.string()),
    backend: z.array(z.string()),
    database: z.array(z.string()),
    ai: z.array(z.string()),
    deployment: z.array(z.string()),
  }),
  pagesRoutes: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
      keyComponents: z.array(z.string()),
    })
  ),
  dataModel: z.object({
    entities: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        fields: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            description: z.string().optional(),
          })
        ),
      })
    ),
    relationships: z.array(relationshipSchema),
  }),
  buildPhases: z.array(
    z.object({
      name: z.string(),
      goals: z.array(z.string()),
      deliverables: z.array(z.string()),
    })
  ),
  risksEdgeCases: z.array(z.string()),
  starterPrompt: z.string(),
  markdownBrief: z.string(),
});

const requestBodySchema = z.object({
  idea: z.string().min(1, "App idea is required."),
  baseUrl: z.string().min(1, "Base URL is required."),
  model: z.string().min(1, "Model name is required."),
  apiKey: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { idea, baseUrl, model, apiKey, answers } = parsed.data;

    const isDev = process.env.NODE_ENV === "development";
    const validation = validateEndpointUrl(baseUrl, isDev);

    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const provider = createOpenAICompatible({
      name: "custom",
      baseURL: validation.url.href.replace(/\/+$/, ""),
      apiKey: apiKey || "no-key",
    });

    const result = streamObject({
      model: provider(model),
      schema: projectBriefSchema,
      system: buildPlannerSystemPrompt(),
      messages: [{ role: "user", content: buildPlannerUserPrompt(idea, answers) }],
      temperature: 0.7,
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Brief generation error:", sanitizeError(error));
    return Response.json(
      { error: "Failed to generate brief.", details: sanitizeError(error) },
      { status: 500 }
    );
  }
}
