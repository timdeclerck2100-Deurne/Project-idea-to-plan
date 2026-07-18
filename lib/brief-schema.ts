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

export const roadmapSchema = z.object({
  initialPhase: buildPhaseSchema,
  milestones: z.array(buildPhaseSchema),
});

export const appNameSchema = z.string();
export const appSummarySchema = z.string();
export const targetUsersSchema = z.array(z.string());
export const coreFeaturesSchema = z.array(z.string());
export const recommendedTechStackSchema = z.object({
  frontend: z.array(z.string()),
  backend: z.array(z.string()),
  database: z.array(z.string()),
  ai: z.array(z.string()),
  deployment: z.array(z.string()),
});
export const pagesRoutesSchema = z.array(pageRouteSchema);
export const dataModelSchema = z.object({
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
});
export const risksEdgeCasesSchema = z.array(z.string());

export const briefOverviewSchema = z.object({
  appName: appNameSchema,
  appSummary: appSummarySchema,
  targetUsers: targetUsersSchema,
  coreFeatures: coreFeaturesSchema,
  recommendedTechStack: recommendedTechStackSchema,
  pagesRoutes: pagesRoutesSchema,
  dataModel: dataModelSchema,
  buildPhases: roadmapSchema,
  risksEdgeCases: risksEdgeCasesSchema,
});

export const starterPromptSchema = z.object({
  starterPrompt: z.string().min(1).max(600),
});

export const projectBriefSchema = briefOverviewSchema.extend({
  starterPrompt: z.string(),
  markdownBrief: z.string(),
});

export const generatedProjectBriefSchema = projectBriefSchema.extend({
  starterPrompt: starterPromptSchema.shape.starterPrompt,
});

export const assistantSectionSchema = z.enum([
  "appName",
  "appSummary",
  "targetUsers",
  "coreFeatures",
  "recommendedTechStack",
  "pagesRoutes",
  "dataModel",
  "buildPhases",
  "risksEdgeCases",
]);

export const assistantSectionSchemas = {
  appName: appNameSchema,
  appSummary: appSummarySchema,
  targetUsers: targetUsersSchema,
  coreFeatures: coreFeaturesSchema,
  recommendedTechStack: recommendedTechStackSchema,
  pagesRoutes: pagesRoutesSchema,
  dataModel: dataModelSchema,
  buildPhases: roadmapSchema,
  risksEdgeCases: risksEdgeCasesSchema,
} satisfies Record<z.infer<typeof assistantSectionSchema>, z.ZodType>;

export type BriefOverview = z.infer<typeof briefOverviewSchema>;
export type StarterPromptResult = z.infer<typeof starterPromptSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type PageRoute = z.infer<typeof pageRouteSchema>;
export type BuildPhase = z.infer<typeof buildPhaseSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
export type ProjectBrief = z.infer<typeof projectBriefSchema>;
export type AppName = z.infer<typeof appNameSchema>;
export type AppSummary = z.infer<typeof appSummarySchema>;
export type TargetUsers = z.infer<typeof targetUsersSchema>;
export type CoreFeatures = z.infer<typeof coreFeaturesSchema>;
export type RecommendedTechStack = z.infer<typeof recommendedTechStackSchema>;
export type PagesRoutes = z.infer<typeof pagesRoutesSchema>;
export type DataModel = z.infer<typeof dataModelSchema>;
export type RisksEdgeCases = z.infer<typeof risksEdgeCasesSchema>;
export type AssistantSection = z.infer<typeof assistantSectionSchema>;
