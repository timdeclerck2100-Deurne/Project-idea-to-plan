import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assistantSectionSchema,
  assistantSectionSchemas,
  briefOverviewSchema,
} from "@/lib/brief-schema";
import {
  buildBriefAssistanceSystemPrompt,
  buildBriefAssistanceUserPrompt,
} from "@/lib/planner-prompt";
import { sanitizeError, validateEndpointUrl } from "@/lib/provider-validation";

const MAX_BRIEF_BYTES = 100 * 1024;

const requestBodySchema = z.object({
  baseUrl: z.string().trim().min(1, "Base URL is required.").max(2048),
  model: z.string().trim().min(1, "Model name is required.").max(200),
  apiKey: z.string().max(4096).optional(),
  section: assistantSectionSchema,
  question: z.string().trim().min(1, "Question is required.").max(1000),
  brief: briefOverviewSchema,
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    const parsed = requestBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { baseUrl, model, apiKey, section, question, brief } = parsed.data;
    if (new TextEncoder().encode(JSON.stringify(brief)).byteLength > MAX_BRIEF_BYTES) {
      return Response.json(
        { error: "Invalid request.", details: { brief: ["Brief is too large."] } },
        { status: 400 }
      );
    }

    const validation = validateEndpointUrl(baseUrl, process.env.NODE_ENV === "development");
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const provider = createOpenAICompatible({
      name: "custom",
      baseURL: validation.url.href.replace(/\/+$/, ""),
      apiKey: apiKey || "no-key",
    });
    const responseSchema = z.object({
      answer: z.string().min(1).max(4000),
      proposedValue: assistantSectionSchemas[section].nullable(),
    });
    const { object } = await generateObject({
      model: provider(model),
      schema: responseSchema,
      system: buildBriefAssistanceSystemPrompt(section),
      messages: [
        { role: "user", content: buildBriefAssistanceUserPrompt(section, question, brief) },
      ],
      temperature: 0.4,
      abortSignal: request.signal,
    });

    return Response.json(object);
  } catch (error) {
    if (request.signal.aborted) {
      return Response.json({ error: "Request cancelled." }, { status: 499 });
    }
    const details = sanitizeError(error);
    console.error("Brief assistance error:", details);
    return Response.json(
      { error: "Failed to assist with this brief section.", details },
      { status: 500 }
    );
  }
}
