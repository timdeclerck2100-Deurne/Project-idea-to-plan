import { NextRequest } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import {
  buildQuestionsSystemPrompt,
  buildQuestionsUserPrompt,
  buildReplaceQuestionUserPrompt,
  buildSingleQuestionSystemPrompt,
} from "@/lib/planner-prompt";
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

const singleQuestionResponseSchema = z.object({
  question: z.string(),
  options: z.array(optionSchema).min(2).max(4),
});

const existingQuestionSchema = z.object({
  question: z.string(),
});

const requestBodySchema = z.object({
  idea: z.string().min(1, "App idea is required."),
  baseUrl: z.string().min(1, "Base URL is required."),
  model: z.string().min(1, "Model name is required."),
  apiKey: z.string().optional(),
  replaceIndex: z.number().int().min(0).optional(),
  addQuestion: z.boolean().optional(),
  existingQuestions: z.array(existingQuestionSchema).optional(),
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

    const { idea, baseUrl, model, apiKey, replaceIndex, addQuestion, existingQuestions } = parsed.data;

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

    const isSingleQuestion =
      (replaceIndex !== undefined && existingQuestions !== undefined) ||
      (addQuestion === true && existingQuestions !== undefined);

    if (isSingleQuestion) {
      const { object } = await generateObject({
        model: provider(model),
        schema: singleQuestionResponseSchema,
        system: buildSingleQuestionSystemPrompt(),
        messages: [
          {
            role: "user",
            content: buildReplaceQuestionUserPrompt(idea, existingQuestions!),
          },
        ],
        temperature: 0.8,
      });

      if (replaceIndex !== undefined) {
        return Response.json({ question: object, replaceIndex });
      }

      return Response.json({ question: object, addQuestion: true });
    }

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
