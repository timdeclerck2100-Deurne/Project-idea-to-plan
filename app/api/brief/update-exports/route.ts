import { NextRequest } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import {
  buildUpdateExportsSystemPrompt,
  buildUpdateExportsUserPrompt,
  generateMarkdownBrief,
} from "@/lib/planner-prompt";
import { validateEndpointUrl, sanitizeError } from "@/lib/provider-validation";
import { projectBriefSchema, starterPromptSchema } from "@/lib/brief-schema";

const requestBodySchema = z.object({
  brief: projectBriefSchema,
  baseUrl: z.string().min(1, "Base URL is required."),
  model: z.string().min(1, "Model name is required."),
  apiKey: z.string().optional(),
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

    const { brief, baseUrl, model, apiKey } = parsed.data;

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

    const { object } = await generateObject({
      model: provider(model),
      schema: starterPromptSchema,
      system: buildUpdateExportsSystemPrompt(),
      messages: [{ role: "user", content: buildUpdateExportsUserPrompt(brief) }],
      temperature: 0.7,
      abortSignal: request.signal,
    });

    return Response.json({
      starterPrompt: object.starterPrompt,
      markdownBrief: generateMarkdownBrief(brief),
    });
  } catch (error) {
    if (request.signal.aborted) {
      return Response.json({ error: "Request cancelled." }, { status: 499 });
    }
    console.error("Export update error:", sanitizeError(error));
    return Response.json(
      { error: "Failed to update exports.", details: sanitizeError(error) },
      { status: 500 }
    );
  }
}
