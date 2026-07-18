import { NextRequest } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import { buildQuestionsSystemPrompt, buildQuestionsUserPrompt } from "@/lib/planner-prompt";
import { validateEndpointUrl, sanitizeError } from "@/lib/provider-validation";

const optionSchema = z.object({
  label: z.string(),
  description: z.string(),
});

const questionSchema = z.object({
  question: z.string(),
  options: z.array(optionSchema).min(2).max(4),
});

const questionsResponseSchema = z.object({
  questions: z.array(questionSchema).min(3).max(9),
});

const requestBodySchema = z.object({
  idea: z.string().min(1, "App idea is required."),
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

    const { idea, baseUrl, model, apiKey } = parsed.data;

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
      schema: questionsResponseSchema,
      system: buildQuestionsSystemPrompt(),
      messages: [{ role: "user", content: buildQuestionsUserPrompt(idea) }],
      temperature: 0.7,
    });

    return Response.json(object);
  } catch (error) {
    console.error("Questions generation error:", sanitizeError(error));
    return Response.json(
      { error: "Failed to generate questions.", details: sanitizeError(error) },
      { status: 500 }
    );
  }
}
