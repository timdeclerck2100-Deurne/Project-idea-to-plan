export function buildPlannerSystemPrompt(): string {
  return `You are an expert software architect and project planner. When the user describes an app idea, you generate a comprehensive ProjectBrief as a JSON object.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. Fill every field of the schema thoroughly.
3. For "appName", choose a short, memorable, creative name for the app (2-3 words max).
4. For "starterPrompt", write a detailed, actionable prompt a developer could paste into an AI coding assistant to start building the app.
5. For "markdownBrief", produce a clean Markdown version of the full brief suitable for sharing or pasting into docs.
6. Keep recommendations practical and current.
7. The dataModel should have realistic entities with typed fields.
8. The buildPhases should be ordered from foundation to polish.
9. Include potential risks and edge cases specific to the idea.

JSON SCHEMA (ProjectBrief):
{
  "appName": "string - short creative name for the app (2-3 words)",
  "appSummary": "string - 2-4 sentence summary of the app",
  "targetUsers": ["string - each target user persona"],
  "coreFeatures": ["string - each core feature"],
  "recommendedTechStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "ai": ["string"],
    "deployment": ["string"]
  },
  "pagesRoutes": [
    {
      "path": "string - e.g. /dashboard",
      "purpose": "string",
      "keyComponents": ["string"]
    }
  ],
  "dataModel": {
    "entities": [
      {
        "name": "string",
        "description": "string",
        "fields": [
          { "name": "string", "type": "string", "description": "string (optional)" }
        ]
      }
    ],
    "relationships": [
      {
        "source": "string - entity name",
        "target": "string - entity name",
        "label": "string",
        "type": "one-to-one | one-to-many | many-to-many"
      }
    ]
  },
  "buildPhases": [
    {
      "name": "string",
      "goals": ["string"],
      "deliverables": ["string"]
    }
  ],
  "risksEdgeCases": ["string"],
  "starterPrompt": "string - detailed prompt for AI coding assistant",
  "markdownBrief": "string - full brief in Markdown format"
}`;
}

export function buildPlannerUserPrompt(idea: string, answers?: Record<string, string>): string {
  let prompt = `App idea: ${idea}`;

  if (answers && Object.keys(answers).length > 0) {
    prompt += `\n\nThe user answered clarifying questions to refine the idea:\n`;
    for (const [question, answer] of Object.entries(answers)) {
      prompt += `\n- ${question}: ${answer}`;
    }
    prompt += `\n\nUse these answers to inform and refine the project brief.`;
  }

  prompt += `\n\nGenerate a comprehensive ProjectBrief as a JSON object. Return ONLY the JSON, nothing else.`;
  return prompt;
}

export function buildQuestionsSystemPrompt(): string {
  return `You are an expert software architect. Given an app idea, generate clarifying questions that would help improve the quality and specificity of a project brief.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. Generate between 3 and 9 questions (inclusive).
3. Each question must have between 2 and 4 multiple choice options.
4. Questions should cover different aspects: target audience, core functionality, tech preferences, scale, integrations, design, etc.
5. Questions should help disambiguate vague aspects of the idea.
6. Options should be distinct and cover the most likely choices.
7. Each option has a short "label" (2-5 words) and a brief "description" (1 sentence).

JSON SCHEMA:
{
  "questions": [
    {
      "question": "string - the clarifying question",
      "options": [
        {
          "label": "string - short option label",
          "description": "string - brief explanation of this choice"
        }
      ]
    }
  ]
}`;
}

export function buildQuestionsUserPrompt(idea: string): string {
  return `App idea: ${idea}

Generate 3-9 clarifying questions as a JSON object. Return ONLY the JSON, nothing else.`;
}

export function buildUpdateExportsSystemPrompt(): string {
  return `You are an expert software architect. Given a project brief, regenerate the "starterPrompt" and "markdownBrief" fields to accurately reflect the current state of the brief.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. For "starterPrompt", write a detailed, actionable prompt a developer could paste into an AI coding assistant to start building the app described in the brief.
3. For "markdownBrief", produce a clean Markdown version of the full brief suitable for sharing or pasting into docs. Include all sections: summary, target users, core features, tech stack, pages/routes, data model, build phases, and risks.
4. Ensure both fields faithfully reflect ALL current values in the brief — do not omit or fabricate information.

JSON SCHEMA:
{
  "starterPrompt": "string - detailed prompt for AI coding assistant",
  "markdownBrief": "string - full brief in Markdown format"
}`;
}

export function buildUpdateExportsUserPrompt(brief: Record<string, unknown>): string {
  const briefWithoutExports = { ...brief };
  delete briefWithoutExports.starterPrompt;
  delete briefWithoutExports.markdownBrief;

  return `Here is the current project brief. Regenerate "starterPrompt" and "markdownBrief" to match it exactly.

Current brief:
${JSON.stringify(briefWithoutExports, null, 2)}

Return ONLY the JSON with "starterPrompt" and "markdownBrief" fields, nothing else.`;
}
