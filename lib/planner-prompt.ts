import type { AssistantSection, BriefOverview } from "@/lib/brief-schema";

export function buildPlannerSystemPrompt(): string {
  return `You are an expert application marketer with 30 years of experience, as well as an expert software architect and project planner. When the user describes an app idea, you generate a comprehensive ProjectBrief as a JSON object, using your marketing expertise for product positioning and your architecture and planning expertise for technical fields.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. Fill every field of the schema thoroughly.
3. For "appName", choose a brandable, memorable name (2-3 words max) that is relevant to the target audience, communicates or evokes the core value proposition, and helps sell and position the product. Avoid generic or random names.
4. For "appSummary", write 4-8 concise sentences (maximum 2500 characters) for prospective users that sell the app by framing their problem or need, its distinctive value, the key benefit, and the desired outcome. Ground every claim in the supplied idea and answers; do not invent claims or use hype, guarantees, or unsupported superlatives.
5. For "starterPrompt", write 4-8 short plain-language sentences (maximum 2500 characters) describing what to build, communicating the product's value, and covering the essential user experience. Keep it non-technical, grounded in the brief, and exclude file names, routes, schemas, framework setup, and deployment steps.
6. For "markdownBrief", produce a comprehensive Markdown version of every section of the brief, suitable for sharing or pasting into docs.
7. Choose technology only after considering platform, constraints, expected scale, integrations, cost, and stated preferences. Do not default to any framework or host. Use the lowest-complexity suitable stack when requirements are unclear, and leave irrelevant stack categories empty.
8. The dataModel should have realistic entities with typed fields.
9. The buildPhases initialPhase must be the minimum viable functionality, exactly what is needed to make the core user flow work and no more. Every subsequent milestone must incrementally build on prior phases and add functionality until the user's full stated idea is implemented. Generate at least 5 milestones. The progression should clearly move from MVP to complete product.
10. Include potential risks and edge cases specific to the idea.

JSON SCHEMA (ProjectBrief):
{
  "appName": "string - brandable, memorable product name (2-3 words max) relevant to the audience that communicates or evokes the core value proposition and helps sell and position the product; avoid generic or random names",
  "appSummary": "string - 4-8 concise sentences, maximum 2500 characters, for prospective users framing their problem or need, the app's distinctive value, key benefit, and desired outcome; grounded in supplied information with no invented claims, hype, guarantees, or unsupported superlatives",
  "targetUsers": ["string - each target user persona"],
  "coreFeatures": ["string - each core feature"],
  "recommendedTechStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "ai": ["string"],
    "database": ["string (optional - only if the app needs persistent data storage)"]
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
  "buildPhases": {
    "initialPhase": {
      "name": "string - e.g. 'Core Foundation'",
      "goals": ["string"],
      "deliverables": ["string"]
    },
    "milestones": [
      {
        "name": "string - descriptive name like 'User Authentication' or 'Payment Integration'",
        "goals": ["string"],
        "deliverables": ["string"]
      }
    ]
  },
  "risksEdgeCases": ["string"],
  "starterPrompt": "string - 4-8 plain-language, non-technical sentences, maximum 2500 characters",
  "markdownBrief": "string - comprehensive full brief in Markdown format"
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

export function buildBriefOverviewSystemPrompt(): string {
  return `You are an expert application marketer with 30 years of experience, as well as an expert software architect and project planner. When the user describes an app idea, you generate the structured data portion of a ProjectBrief as a JSON object, using your marketing expertise for product positioning and your architecture and planning expertise for technical fields.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. Fill every field of the schema thoroughly.
3. For "appName", choose a brandable, memorable name (2-3 words max) that is relevant to the target audience, communicates or evokes the core value proposition, and helps sell and position the product. Avoid generic or random names.
4. For "appSummary", write 4-8 concise sentences (maximum 2500 characters) for prospective users that sell the app by framing their problem or need, its distinctive value, the key benefit, and the desired outcome. Ground every claim in the supplied idea and answers; do not invent claims or use hype, guarantees, or unsupported superlatives.
5. Choose technology only after considering platform, constraints, expected scale, integrations, cost, and stated preferences. Do not default to any framework or host. Use the lowest-complexity suitable stack when requirements are unclear, and leave irrelevant stack categories empty.
6. The dataModel should have realistic entities with typed fields.
7. The buildPhases initialPhase must be the minimum viable functionality, exactly what is needed to make the core user flow work and no more. Every subsequent milestone must incrementally build on prior phases and add functionality until the user's full stated idea is implemented. Generate at least 5 milestones. The progression should clearly move from MVP to complete product.
8. Include potential risks and edge cases specific to the idea.

JSON SCHEMA (BriefOverview):
{
  "appName": "string - brandable, memorable product name (2-3 words max) relevant to the audience that communicates or evokes the core value proposition and helps sell and position the product; avoid generic or random names",
  "appSummary": "string - 4-8 concise sentences, maximum 2500 characters, for prospective users framing their problem or need, the app's distinctive value, key benefit, and desired outcome; grounded in supplied information with no invented claims, hype, guarantees, or unsupported superlatives",
  "targetUsers": ["string - each target user persona"],
  "coreFeatures": ["string - each core feature"],
  "recommendedTechStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "ai": ["string"],
    "database": ["string (optional - only if the app needs persistent data storage)"]
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
  "buildPhases": {
    "initialPhase": {
      "name": "string - e.g. 'Core Foundation'",
      "goals": ["string"],
      "deliverables": ["string"]
    },
    "milestones": [
      {
        "name": "string - descriptive name like 'User Authentication' or 'Payment Integration'",
        "goals": ["string"],
        "deliverables": ["string"]
      }
    ]
  },
  "risksEdgeCases": ["string"]
}`;
}

export function buildBriefOverviewUserPrompt(idea: string, answers?: Record<string, string>): string {
  let prompt = `App idea: ${idea}`;

  if (answers && Object.keys(answers).length > 0) {
    prompt += `\n\nThe user answered clarifying questions to refine the idea:\n`;
    for (const [question, answer] of Object.entries(answers)) {
      prompt += `\n- ${question}: ${answer}`;
    }
    prompt += `\n\nUse these answers to inform and refine the project brief.`;
  }

  prompt += `\n\nGenerate a comprehensive BriefOverview as a JSON object. Return ONLY the JSON, nothing else.`;
  return prompt;
}

export function buildStarterPromptSystemPrompt(): string {
  return `Given a completed project brief, write a short prompt that clearly describes the product to build and communicates its value in plain language.

RULES:
1. Return ONLY valid JSON with a "starterPrompt" field — no markdown fences, no commentary.
2. Write roughly 4-8 sentences and no more than 2500 characters.
3. Help sell the product by clearly conveying the user problem or need, the product's distinctive value, its key benefit, the intended outcome, and the essential user experience.
4. Use plain, non-technical language. Exclude technologies, file names, routes, schemas, framework setup, and deployment steps.
5. Ground every statement in the supplied brief. Do not invent claims or requirements, and avoid hype, guarantees, or unsupported superlatives.

JSON SCHEMA:
{
  "starterPrompt": "string - 4-8 plain-language sentences, maximum 2500 characters"
}`;
}

export function buildStarterPromptUserPrompt(brief: Record<string, unknown>, feedback?: string): string {
  let prompt = `Here is the completed project brief. Write a short, plain-language starter prompt for this app.

Project Brief:
${JSON.stringify(brief, null, 2)}`;

  if (feedback) {
    prompt += `\n\nThe user wants the following changes to the starter prompt:\n${feedback}\n\nIncorporate this feedback while keeping the result within the system rules.`;
  }

  prompt += `\n\nReturn ONLY the JSON with the "starterPrompt" field, nothing else.`;
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

export function buildSingleQuestionSystemPrompt(): string {
  return `You are an expert software architect. Given an app idea and its existing clarifying questions, generate exactly one new, distinct clarifying question.

RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary before or after.
2. Return exactly one question with between 2 and 4 multiple choice options.
3. The question must cover a different aspect of the app idea than the existing questions.
4. Options should be distinct and cover the most likely choices.
5. Each option has a short "label" (2-5 words) and a brief "description" (1 sentence).

JSON SCHEMA:
{
  "question": "string - the clarifying question",
  "options": [
    {
      "label": "string - short option label",
      "description": "string - brief explanation of this choice"
    }
  ]
}`;
}

export function buildReplaceQuestionUserPrompt(
  idea: string,
  existingQuestions: { question: string }[]
): string {
  const existingList = existingQuestions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join("\n");

  return `App idea: ${idea}

Existing clarifying questions (do NOT duplicate these):
${existingList}

Generate exactly 1 NEW, distinct clarifying question that covers a different aspect than the ones listed above. Return ONLY a JSON object with a single "question" field and "options" array (2-4 options). Return ONLY the JSON, nothing else.`;
}

export function buildUpdateExportsSystemPrompt(): string {
  return `Given the structured portion of a project brief, write only its short starter prompt.

RULES:
1. Return ONLY valid JSON with a "starterPrompt" field - no markdown fences or commentary.
2. Write roughly 4-8 sentences and no more than 2500 characters.
3. Focus on purpose, users, and essential behavior in plain, non-technical language.
4. Exclude technologies, file names, routes, schemas, framework setup, and deployment steps.
5. Faithfully reflect the supplied brief without inventing requirements.

JSON SCHEMA:
{
  "starterPrompt": "string - 4-8 plain-language sentences, maximum 2500 characters"
}`;
}

export function buildUpdateExportsUserPrompt(brief: Record<string, unknown>): string {
  const briefWithoutExports = { ...brief };
  delete briefWithoutExports.starterPrompt;
  delete briefWithoutExports.markdownBrief;

  return `Here is the current structured project brief. Generate its starter prompt.

Current brief:
${JSON.stringify(briefWithoutExports, null, 2)}

Return ONLY the JSON with the "starterPrompt" field, nothing else.`;
}

const SECTION_GUIDANCE: Record<AssistantSection, string> = {
  appName:
    "one brandable, memorable product name of 2-3 words maximum that is relevant to the audience, communicates or evokes the core value proposition, helps sell and position the product, and is neither generic nor random",
  appSummary:
    "a complete 4-8 sentence summary, maximum 2500 characters, for prospective users that sells the app by framing their problem or need, its distinctive value, key benefit, and desired outcome, while remaining grounded in the supplied brief without invented claims, hype, guarantees, or unsupported superlatives",
  targetUsers: "the complete list of target user groups",
  coreFeatures: "the complete list of core features",
  recommendedTechStack:
    "the complete requirement-fit stack; consider platform, constraints, scale, integrations, cost, and preferences, leave irrelevant categories empty, and prefer the lowest-complexity suitable option when unclear",
  pagesRoutes: "the complete list of pages or routes and their purposes and key components",
  dataModel: "the complete data model, including entities and relationships",
  buildPhases: "the complete roadmap, including the initial phase and all milestones",
  risksEdgeCases: "the complete list of risks and edge cases",
};

export function buildBriefAssistanceSystemPrompt(section: AssistantSection): string {
  const role =
    section === "appName" || section === "appSummary"
      ? "You are an expert application marketer with 30 years of experience. You help refine one selected section of a structured project brief."
      : "You help refine one selected section of a structured project brief.";

  return `${role}

RULES:
1. Return only the requested JSON object with "answer" and "proposedValue" fields.
2. Answer the user's question directly and concisely using the supplied brief as context.
3. You may change only the "${section}" section. Never propose changes to another section.
4. If a change is useful, "proposedValue" must contain ${SECTION_GUIDANCE[section]}, not a patch or partial value.
5. For an informational question that does not request or benefit from a change, set "proposedValue" to null.
6. Do not include existing starterPrompt or markdownBrief exports; they are not source context.
7. Technology recommendations must fit requirements and must not default to a particular framework or host.`;
}

export function buildBriefAssistanceUserPrompt(
  section: AssistantSection,
  question: string,
  brief: BriefOverview
): string {
  return `Selected section: ${section}
Question: ${question}

Current structured brief:
${JSON.stringify(brief, null, 2)}

Return only JSON. Keep every unselected section unchanged by proposing a value only for "${section}".`;
}

export function buildAppNameSuggestionUserPrompt(brief: BriefOverview): string {
  return buildBriefAssistanceUserPrompt(
    "appName",
    "Suggest one short, memorable app name that fits this brief.",
    brief
  );
}

export function buildAppNameSuggestionSystemPrompt(): string {
  return buildBriefAssistanceSystemPrompt("appName");
}

export function generateMarkdownBrief(brief: {
  appName: string;
  appSummary: string;
  targetUsers: string[];
  coreFeatures: string[];
  recommendedTechStack: {
    frontend: string[];
    backend: string[];
    ai: string[];
    database?: string[];
  };
  pagesRoutes: { path: string; purpose: string; keyComponents: string[] }[];
  dataModel: {
    entities: { name: string; description: string; fields: { name: string; type: string; description?: string }[] }[];
    relationships: { source: string; target: string; label: string; type: string }[];
  };
  buildPhases: {
    initialPhase: { name: string; goals: string[]; deliverables: string[] };
    milestones: { name: string; goals: string[]; deliverables: string[] }[];
  };
  risksEdgeCases: string[];
}): string {
  const lines: string[] = [];

  lines.push(`# ${brief.appName}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(brief.appSummary);
  lines.push('');

  lines.push('## Target Users');
  lines.push('');
  if (brief.targetUsers.length > 0) {
    for (const user of brief.targetUsers) {
      lines.push(`- ${user}`);
    }
  } else {
    lines.push('_None specified._');
  }
  lines.push('');

  lines.push('## Core Features');
  lines.push('');
  if (brief.coreFeatures.length > 0) {
    for (const feature of brief.coreFeatures) {
      lines.push(`- ${feature}`);
    }
  } else {
    lines.push('_None specified._');
  }
  lines.push('');

  lines.push('## Recommended Tech Stack');
  lines.push('');
  const stack = brief.recommendedTechStack;
  for (const [category, items] of Object.entries(stack)) {
    if (Array.isArray(items) && items.length > 0) {
      const value = items.join(', ');
      lines.push(`**${category.charAt(0).toUpperCase() + category.slice(1)}:** ${value}`);
    }
  }
  lines.push('');

  lines.push('## Pages & Routes');
  lines.push('');
  if (brief.pagesRoutes.length > 0) {
    for (const page of brief.pagesRoutes) {
      lines.push(`### \`${page.path}\``);
      lines.push('');
      lines.push(page.purpose);
      if (page.keyComponents.length > 0) {
        lines.push('');
        lines.push(`Key components: ${page.keyComponents.join(', ')}`);
      }
      lines.push('');
    }
  } else {
    lines.push('_None specified._');
    lines.push('');
  }

  lines.push('## Data Model');
  lines.push('');
  lines.push('### Entities');
  lines.push('');
  if (brief.dataModel.entities.length > 0) {
    for (const entity of brief.dataModel.entities) {
      lines.push(`**${entity.name}** — ${entity.description}`);
      if (entity.fields.length > 0) {
        lines.push('');
        for (const field of entity.fields) {
          const desc = field.description ? ` — ${field.description}` : '';
          lines.push(`- \`${field.name}\` (${field.type})${desc}`);
        }
      }
      lines.push('');
    }
  } else {
    lines.push('_None specified._');
    lines.push('');
  }

  lines.push('### Relationships');
  lines.push('');
  if (brief.dataModel.relationships.length > 0) {
    for (const rel of brief.dataModel.relationships) {
      lines.push(`- **${rel.source}** ${rel.label} **${rel.target}** (${rel.type})`);
    }
  } else {
    lines.push('_None specified._');
  }
  lines.push('');

  if (brief.buildPhases) {
    lines.push('## Build Phases');
    lines.push('');
    const { initialPhase, milestones } = brief.buildPhases;
    if (initialPhase) {
      lines.push(`### Initial Phase: ${initialPhase.name}`);
      lines.push('');
      if (initialPhase.goals.length > 0) {
        lines.push('**Goals:**');
        for (const goal of initialPhase.goals) {
          lines.push(`- ${goal}`);
        }
      }
      if (initialPhase.deliverables.length > 0) {
        lines.push('');
        lines.push('**Deliverables:**');
        for (const del of initialPhase.deliverables) {
          lines.push(`- ${del}`);
        }
      }
      lines.push('');
    }
    if (milestones && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        lines.push(`### Milestone ${i + 1}: ${milestone.name}`);
        lines.push('');
        if (milestone.goals.length > 0) {
          lines.push('**Goals:**');
          for (const goal of milestone.goals) {
            lines.push(`- ${goal}`);
          }
        }
        if (milestone.deliverables.length > 0) {
          lines.push('');
          lines.push('**Deliverables:**');
          for (const del of milestone.deliverables) {
            lines.push(`- ${del}`);
          }
        }
        lines.push('');
      }
    }
  }

  lines.push('## Risks & Edge Cases');
  lines.push('');
  if (brief.risksEdgeCases.length > 0) {
    for (const risk of brief.risksEdgeCases) {
      lines.push(`- ${risk}`);
    }
  } else {
    lines.push('_None specified._');
  }
  lines.push('');

  return lines.join('\n');
}
