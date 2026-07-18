import { z } from "zod";

export const entitySchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string().optional(),
    })
  ),
});

export const relationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
  type: z.string(),
});

export const pageRouteSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  keyComponents: z.array(z.string()),
});

export const buildPhaseSchema = z.object({
  name: z.string(),
  goals: z.array(z.string()),
  deliverables: z.array(z.string()),
});

export const briefOverviewSchema = z.object({
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
  pagesRoutes: z.array(pageRouteSchema),
  dataModel: z.object({
    entities: z.array(entitySchema),
    relationships: z.array(relationshipSchema),
  }),
  buildPhases: z.array(buildPhaseSchema),
  risksEdgeCases: z.array(z.string()),
});

export const starterPromptSchema = z.object({
  starterPrompt: z.string(),
});

export const projectBriefSchema = briefOverviewSchema.extend({
  starterPrompt: z.string(),
  markdownBrief: z.string(),
});

export type BriefOverview = z.infer<typeof briefOverviewSchema>;
export type StarterPromptResult = z.infer<typeof starterPromptSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type PageRoute = z.infer<typeof pageRouteSchema>;
export type BuildPhase = z.infer<typeof buildPhaseSchema>;
export type ProjectBrief = z.infer<typeof projectBriefSchema>;
