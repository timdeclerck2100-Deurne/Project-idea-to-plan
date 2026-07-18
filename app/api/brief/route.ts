import { NextRequest } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamObject } from "ai";
import { z } from "zod";
import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  buildBriefOverviewSystemPrompt,
  buildBriefOverviewUserPrompt,
  buildStarterPromptSystemPrompt,
  buildStarterPromptUserPrompt,
} from "@/lib/planner-prompt";
import { validateEndpointUrl, sanitizeError } from "@/lib/provider-validation";
import {
  briefOverviewSchema,
  generatedProjectBriefSchema,
  starterPromptSchema,
} from "@/lib/brief-schema";

const sectionSchema = z.enum(["overview", "starter-prompt"]);

const requestBodySchema = z.object({
  idea: z.string().min(1, "App idea is required.").optional(),
  baseUrl: z.string().min(1, "Base URL is required."),
  model: z.string().min(1, "Model name is required."),
  apiKey: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  section: sectionSchema.optional(),
  brief: z.record(z.string(), z.unknown()).optional(),
  feedback: z.string().optional(),
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

    const { idea, baseUrl, model, apiKey, answers, section, brief, feedback } = parsed.data;

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

    if (section === "starter-prompt") {
      if (!brief) {
        return Response.json(
          { error: "Brief data is required for starter-prompt section." },
          { status: 400 }
        );
      }

      const parsedBrief = briefOverviewSchema.safeParse(brief);
      if (!parsedBrief.success) {
        return Response.json(
          { error: "Invalid brief data.", details: parsedBrief.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const result = streamObject({
        model: provider(model),
        schema: starterPromptSchema,
        system: buildStarterPromptSystemPrompt(),
        messages: [
          { role: "user", content: buildStarterPromptUserPrompt(parsedBrief.data, feedback) },
        ],
        temperature: 0.7,
        abortSignal: request.signal,
      });

      return result.toTextStreamResponse();
    }

    if (section === "overview") {
      if (!idea) {
        return Response.json(
          { error: "Idea is required for overview section." },
          { status: 400 }
        );
      }

      const result = streamObject({
        model: provider(model),
        schema: briefOverviewSchema,
        system: buildBriefOverviewSystemPrompt(),
        messages: [{ role: "user", content: buildBriefOverviewUserPrompt(idea, answers) }],
        temperature: 0.7,
        abortSignal: request.signal,
      });

      return result.toTextStreamResponse();
    }

    // Backward compatibility: no section = full brief generation
    if (!idea) {
      return Response.json(
        { error: "App idea is required." },
        { status: 400 }
      );
    }

    const result = streamObject({
      model: provider(model),
      schema: generatedProjectBriefSchema,
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
