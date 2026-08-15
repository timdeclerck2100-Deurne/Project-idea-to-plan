import type { ProjectBrief } from "@/lib/brief-schema";

export const completeProjectBrief = {
  appName: "Fieldnote",
  appSummary:
    "A collaborative research workspace that turns field observations into structured, searchable project knowledge.",
  targetUsers: ["Research teams", "Product managers"],
  coreFeatures: [
    "Capture tagged observations",
    "Link evidence to research themes",
    "Share living project briefs",
  ],
  recommendedTechStack: {
    frontend: ["Next.js", "React"],
    backend: ["Next.js Route Handlers"],
    ai: ["Vercel AI SDK"],
    database: ["PostgreSQL", "Drizzle ORM"],
  },
  pagesRoutes: [
    {
      path: "/projects",
      purpose: "Browse and create research projects",
      keyComponents: ["Project list", "Project form"],
    },
    {
      path: "/projects/[projectId]",
      purpose: "Review observations and synthesized themes",
      keyComponents: ["Observation feed", "Theme board"],
    },
  ],
  dataModel: {
    entities: [
      {
        name: "Project",
        description: "A research initiative and its shared context",
        fields: [
          { name: "id", type: "uuid" },
          { name: "name", type: "string" },
        ],
      },
      {
        name: "Observation",
        description: "A tagged piece of field evidence",
        fields: [
          { name: "id", type: "uuid" },
          { name: "notes", type: "text" },
          { name: "projectId", type: "uuid" },
        ],
      },
    ],
    relationships: [
      {
        source: "Project",
        target: "Observation",
        label: "contains",
        type: "one-to-many",
      },
    ],
  },
  buildPhases: {
    initialPhase: {
      name: "Research foundation",
      goals: ["Validate the capture workflow"],
      deliverables: ["Clickable capture prototype"],
    },
    milestones: [
      {
        name: "Team workspace",
        goals: ["Support collaborative synthesis"],
        deliverables: ["Shared project dashboard"],
      },
      {
        name: "Insight automation",
        goals: ["Surface recurring themes"],
        deliverables: ["AI-assisted theme suggestions"],
      },
    ],
  },
  risksEdgeCases: [
    "Conflicting edits from multiple researchers",
    "Sensitive notes require strict project access controls",
  ],
  starterPrompt:
    "Build Fieldnote as a collaborative research workspace with project-scoped observations and themes.",
  markdownBrief: "# Fieldnote\n\n## Summary\n\nA collaborative research workspace.",
} satisfies ProjectBrief;
