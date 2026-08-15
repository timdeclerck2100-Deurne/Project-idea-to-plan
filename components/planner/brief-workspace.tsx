"use client";

import * as React from "react";
import { BriefSectionCard } from "./brief-section-card";
import { ExpandableGraphCard } from "./expandable-graph-card";
import { DataModelFlow, DataModelOutline } from "./data-model-flow";
import { PlannerProcessFlow, PlannerProcessOutline } from "./planner-process-flow";
import { MarkdownExportCard } from "./markdown-export-card";
import { StarterPromptCard } from "./starter-prompt-card";
import { RoadmapCard } from "./roadmap-card";
import { AppNameEditor } from "./app-name-editor";
import { DecisionDomain, type DecisionDomainState } from "./decision-domain";
import {
  decisionDomains,
  DecisionTraceNav,
  type DecisionDomainId,
} from "./decision-trace-nav";
import {
  InlineCardAssistant,
  type AssistantSectionId,
  type BriefAssistantState,
} from "./inline-card-assistant";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, X } from "lucide-react";
import type { ProjectBrief, Entity } from "@/lib/brief-schema";

type TechStack = ProjectBrief["recommendedTechStack"];
type PageRoute = ProjectBrief["pagesRoutes"][number];

export interface BriefWorkspaceProps {
  brief: ProjectBrief;
  handoffFresh?: boolean;
  onBriefChange: (brief: ProjectBrief) => void;
  onUpdateExports?: () => void;
  isUpdatingExports?: boolean;
  onUpdateStarterPrompt?: (feedback: string) => void;
  isUpdatingStarterPrompt?: boolean;
  onCommitName?: (name: string) => void;
  onGenerateName?: () => void;
  isGeneratingName?: boolean;
  nameGenerationError?: string | null;
  generatedNameSuggestion?: string | null;
  onUseGeneratedName?: (name: string) => void;
  onDismissGeneratedName?: () => void;
  assistantStates?: Partial<Record<AssistantSectionId, BriefAssistantState>>;
  onAskAssistant?: (sectionId: AssistantSectionId, prompt: string) => void;
  onApplyAssistantSuggestion?: (sectionId: AssistantSectionId) => void;
  onDismissAssistant?: (sectionId: AssistantSectionId) => void;
}

function ArrayEditor({
  items,
  onChange,
  name,
  placeholder = "Add item...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  name: string;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = React.useState("");
  const [removedItem, setRemovedItem] = React.useState<{ item: string; index: number } | null>(null);

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
      setRemovedItem(null);
    }
  };

  const removeItem = (index: number) => {
    setRemovedItem({ item: items[index], index });
    onChange(items.filter((_, i) => i !== index));
  };

  const undoRemove = () => {
    if (!removedItem) return;
    const restored = [...items];
    restored.splice(Math.min(removedItem.index, restored.length), 0, removedItem.item);
    onChange(restored);
    setRemovedItem(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex min-w-0 items-center rounded-full bg-secondary">
            <Badge
              variant="secondary"
              className="min-w-0 max-w-full break-words py-2 pl-3 pr-1 text-base normal-case tracking-normal"
            >
              {item}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item}`}
              onClick={() => removeItem(index)}
              className="size-10 shrink-0 rounded-full"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder.replace(/\.+$/, "")}
          name={name}
          autoComplete="off"
          className="h-10 min-w-32 flex-1 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addItem}
          disabled={!newItem.trim()}
        >
          Add Item
        </Button>
      </div>
      {removedItem && (
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground" role="status">
          <span className="min-w-0 break-words">Removed {removedItem.item}.</span>
          <Button type="button" variant="ghost" size="sm" onClick={undoRemove}>
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

function TechStackEditor({
  stack,
  onChange,
}: {
  stack: TechStack;
  onChange: (stack: TechStack) => void;
}) {
  const categories = Object.keys(stack) as (keyof TechStack)[];

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {categories.map((category) => (
        <div key={category} className="flex min-w-0 flex-col gap-1">
          <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
            {category}
          </div>
          <ArrayEditor
            items={stack[category] || []}
            onChange={(items) => onChange({ ...stack, [category]: items })}
            name={`techStack${category.charAt(0).toUpperCase()}${category.slice(1)}`}
            placeholder={`Add ${category}...`}
          />
        </div>
      ))}
    </div>
  );
}

function PagesEditor({
  pages,
  onChange,
}: {
  pages: PageRoute[];
  onChange: (pages: PageRoute[]) => void;
}) {
  const [path, setPath] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [components, setComponents] = React.useState("");
  const [removedPage, setRemovedPage] = React.useState<{ page: PageRoute; index: number } | null>(null);

  const addPage = () => {
    if (path.trim() && purpose.trim()) {
      const keyComponents = components
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      onChange([...pages, { path: path.trim(), purpose: purpose.trim(), keyComponents }]);
      setPath("");
      setPurpose("");
      setComponents("");
      setRemovedPage(null);
    }
  };

  const removePage = (index: number) => {
    setRemovedPage({ page: pages[index], index });
    onChange(pages.filter((_, i) => i !== index));
  };

  const undoRemove = () => {
    if (!removedPage) return;
    const restored = [...pages];
    restored.splice(Math.min(removedPage.index, restored.length), 0, removedPage.page);
    onChange(restored);
    setRemovedPage(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {pages.map((page, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded bg-secondary/50 py-1 pl-2"
        >
          <Badge variant="outline" className="min-w-0 max-w-full whitespace-normal text-base font-mono normal-case tracking-normal [overflow-wrap:anywhere]">
            {page.path}
          </Badge>
          <span className="min-w-32 flex-1 break-words text-base text-muted-foreground [overflow-wrap:anywhere]">{page.purpose}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove page ${page.path}`}
            onClick={() => removePage(index)}
            className="ml-auto shrink-0"
          >
            <X />
          </Button>
        </div>
      ))}
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/route"
          aria-label="Page route"
          name="pageRoute"
          autoComplete="off"
          className="h-10 min-w-20 flex-1 text-base sm:max-w-28"
        />
        <Input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose"
          aria-label="Page purpose"
          name="pagePurpose"
          autoComplete="off"
          className="h-10 min-w-32 flex-1 text-base"
        />
        <Input
          value={components}
          onChange={(e) => setComponents(e.target.value)}
          placeholder="Components"
          aria-label="Page components"
          name="pageComponents"
          autoComplete="off"
          className="h-10 min-w-32 flex-1 text-base"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addPage}
          disabled={!path.trim() || !purpose.trim()}
        >
          Add Page
        </Button>
      </div>
      {removedPage && (
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground" role="status">
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">Removed page {removedPage.page.path}.</span>
          <Button type="button" variant="ghost" size="sm" onClick={undoRemove}>
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

function EntityEditor({
  entities,
  onChange,
}: {
  entities: Entity[];
  onChange: (entities: Entity[]) => void;
}) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [fieldsStr, setFieldsStr] = React.useState("");
  const [removedEntity, setRemovedEntity] = React.useState<{ entity: Entity; index: number } | null>(null);

  const addEntity = () => {
    if (name.trim()) {
      const fields = fieldsStr
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => ({ name: f, type: "string" }));
      onChange([...entities, { name: name.trim(), description: desc.trim(), fields }]);
      setName("");
      setDesc("");
      setFieldsStr("");
      setRemovedEntity(null);
    }
  };

  const removeEntity = (index: number) => {
    setRemovedEntity({ entity: entities[index], index });
    onChange(entities.filter((_, i) => i !== index));
  };

  const undoRemove = () => {
    if (!removedEntity) return;
    const restored = [...entities];
    restored.splice(Math.min(removedEntity.index, restored.length), 0, removedEntity.entity);
    onChange(restored);
    setRemovedEntity(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {entities.map((entity, index) => (
        <div
          key={index}
          className="flex min-w-0 items-center gap-2 rounded bg-secondary/50 py-1 pl-2"
        >
          <div className="min-w-0 flex-1">
            <div className="break-words text-base font-medium">{entity.name}</div>
            <div className="break-words text-sm text-muted-foreground">
              {entity.fields.map((f) => f.name).join(", ")}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove entity ${entity.name}`}
            onClick={() => removeEntity(index)}
            className="shrink-0"
          >
            <X />
          </Button>
        </div>
      ))}
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Entity"
          aria-label="Entity name"
          name="entityName"
          autoComplete="off"
          className="h-10 min-w-28 flex-1 text-base"
        />
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          aria-label="Entity description"
          name="entityDescription"
          autoComplete="off"
          className="h-10 min-w-32 flex-1 text-base"
        />
        <Input
          value={fieldsStr}
          onChange={(e) => setFieldsStr(e.target.value)}
          placeholder="field1, field2"
          aria-label="Entity fields"
          name="entityFields"
          autoComplete="off"
          className="h-10 min-w-32 flex-1 text-base"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addEntity}
          disabled={!name.trim()}
        >
          Add Entity
        </Button>
      </div>
      {removedEntity && (
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground" role="status">
          <span className="min-w-0 break-words">Removed entity {removedEntity.entity.name}.</span>
          <Button type="button" variant="ghost" size="sm" onClick={undoRemove}>
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

export function BriefWorkspace({
  brief,
  handoffFresh = false,
  onBriefChange,
  onUpdateExports,
  isUpdatingExports = false,
  onUpdateStarterPrompt,
  isUpdatingStarterPrompt = false,
  onCommitName,
  onGenerateName,
  isGeneratingName = false,
  nameGenerationError,
  generatedNameSuggestion,
  onUseGeneratedName,
  onDismissGeneratedName,
  assistantStates,
  onAskAssistant,
  onApplyAssistantSuggestion,
  onDismissAssistant,
}: BriefWorkspaceProps) {
  const hasText = (value: string) => value.trim().length > 0;
  const hasBuildPhaseData =
    hasText(brief.buildPhases.initialPhase.name) ||
    brief.buildPhases.initialPhase.goals.length > 0 ||
    brief.buildPhases.initialPhase.deliverables.length > 0 ||
    brief.buildPhases.milestones.length > 0;
  const hasExports = hasText(brief.markdownBrief) || hasText(brief.starterPrompt);
  const availableProcessSteps = [
    "idea",
    "provider",
    "ai",
    "brief",
    "edit",
    ...(hasText(brief.markdownBrief) ? ["export"] : []),
    ...(hasText(brief.starterPrompt) ? ["prompt"] : []),
  ];
  const domainStates: Record<DecisionDomainId, DecisionDomainState> = {
    purpose: hasText(brief.appName) || hasText(brief.appSummary) ? "Populated" : "Needs input",
    people: brief.targetUsers.length > 0 ? "Populated" : "Needs input",
    product:
      brief.coreFeatures.length > 0 || brief.pagesRoutes.length > 0
        ? "Populated"
        : "Needs input",
    architecture:
      Object.values(brief.recommendedTechStack).some((items) => items.length > 0) ||
      brief.dataModel.entities.length > 0 ||
      brief.dataModel.relationships.length > 0
        ? "Populated"
        : "Needs input",
    delivery:
      hasBuildPhaseData || brief.risksEdgeCases.length > 0 ? "Populated" : "Needs input",
    handoff: hasExports ? (handoffFresh ? "Populated" : "Refresh needed") : "Needs input",
  };
  const domainMetadata = Object.fromEntries(
    decisionDomains.map((domain) => [domain.id, domain]),
  ) as Record<DecisionDomainId, (typeof decisionDomains)[number]>;

  const assistantFor = (sectionId: AssistantSectionId) => {
    if (!onAskAssistant) return undefined;

    return (
      <InlineCardAssistant
        sectionId={sectionId}
        state={assistantStates?.[sectionId]}
        onAsk={(prompt) => onAskAssistant(sectionId, prompt)}
        onApplySuggestion={
          onApplyAssistantSuggestion
            ? () => onApplyAssistantSuggestion(sectionId)
            : undefined
        }
        onDismiss={
          onDismissAssistant ? () => onDismissAssistant(sectionId) : undefined
        }
      />
    );
  };

  return (
    <div className="min-w-0 pb-8">
      <DecisionTraceNav projectName={brief.appName} states={domainStates} />

      <DecisionDomain
        {...domainMetadata.purpose}
        state={domainStates.purpose}
        contentClassName="flex flex-col gap-8"
      >
        <AppNameEditor
          embedded
          name={brief.appName}
          onCommitName={(name) =>
            onCommitName ? onCommitName(name) : onBriefChange({ ...brief, appName: name })
          }
          onGenerateName={onGenerateName}
          isGeneratingName={isGeneratingName}
          generationError={nameGenerationError}
          generatedSuggestion={generatedNameSuggestion}
          onUseGeneratedName={(name) => {
            if (onUseGeneratedName) onUseGeneratedName(name);
            else onBriefChange({ ...brief, appName: name });
          }}
          onDismissGeneratedName={onDismissGeneratedName ?? (() => undefined)}
        />
        <BriefSectionCard
          embedded
          title="App Summary"
          eyebrow="Overview"
          className="max-w-[var(--measure-readable)]"
          assistant={assistantFor("appSummary")}
        >
          <Textarea
            aria-label="App summary"
            name="appSummary"
            autoComplete="off"
            value={brief.appSummary}
            onChange={(e) => onBriefChange({ ...brief, appSummary: e.target.value })}
            rows={5}
            className="text-base leading-relaxed"
          />
        </BriefSectionCard>
      </DecisionDomain>

      <DecisionDomain
        {...domainMetadata.people}
        state={domainStates.people}
      >
        <BriefSectionCard
          embedded
          title="Target Users"
          eyebrow="Audience"
          className="max-w-3xl"
          assistant={assistantFor("targetUsers")}
        >
          <ArrayEditor
            items={brief.targetUsers}
            onChange={(targetUsers) => onBriefChange({ ...brief, targetUsers })}
            name="targetUser"
          />
        </BriefSectionCard>
      </DecisionDomain>

      <DecisionDomain
        {...domainMetadata.product}
        state={domainStates.product}
      >
        <div className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-12">
          <BriefSectionCard
            embedded
            title="Core Features"
            eyebrow="Features"
            className="xl:col-span-5"
            assistant={assistantFor("coreFeatures")}
          >
            <ArrayEditor
              items={brief.coreFeatures}
              onChange={(coreFeatures) => onBriefChange({ ...brief, coreFeatures })}
              name="coreFeature"
            />
          </BriefSectionCard>
          <BriefSectionCard
            embedded
            title="Pages & Routes"
            eyebrow="Navigation"
            className="xl:col-span-7"
            assistant={assistantFor("pagesRoutes")}
          >
            <PagesEditor
              pages={brief.pagesRoutes}
              onChange={(pagesRoutes) => onBriefChange({ ...brief, pagesRoutes })}
            />
          </BriefSectionCard>
        </div>
      </DecisionDomain>

      <DecisionDomain
        {...domainMetadata.architecture}
        state={domainStates.architecture}
        wide={
          <ExpandableGraphCard
            title="Data Model Graph"
            eyebrow="Technical plate"
            description="Explore entities and valid relationships without changing the brief data."
            outline={<DataModelOutline dataModel={brief.dataModel} />}
          >
            {(expanded) => (expanded ? <DataModelFlow dataModel={brief.dataModel} /> : null)}
          </ExpandableGraphCard>
        }
      >
        <div className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-12">
          <BriefSectionCard
            embedded
            title="Tech Stack"
            eyebrow="Recommended"
            className="xl:col-span-5"
            assistant={assistantFor("recommendedTechStack")}
          >
            <TechStackEditor
              stack={brief.recommendedTechStack}
              onChange={(recommendedTechStack) =>
                onBriefChange({ ...brief, recommendedTechStack })
              }
            />
          </BriefSectionCard>
          <BriefSectionCard
            embedded
            title="Data Model"
            eyebrow="Entities"
            className="xl:col-span-7"
            assistant={assistantFor("dataModel")}
          >
            <EntityEditor
              entities={brief.dataModel.entities}
              onChange={(entities) =>
                onBriefChange({
                  ...brief,
                  dataModel: { ...brief.dataModel, entities },
                })
              }
            />
          </BriefSectionCard>
        </div>
      </DecisionDomain>

      <DecisionDomain
        {...domainMetadata.delivery}
        state={domainStates.delivery}
        wide={
          <div className="flex min-w-0 flex-col gap-8">
            <div data-phase-seven-roadmap>
              <RoadmapCard
                roadmap={brief.buildPhases}
                onChange={(buildPhases) => onBriefChange({ ...brief, buildPhases })}
                assistant={assistantFor("buildPhases")}
              />
            </div>
            <BriefSectionCard
              embedded
              title="Risks & Edge Cases"
              eyebrow="Watch Out"
              className="max-w-3xl"
              assistant={assistantFor("risksEdgeCases")}
            >
              <ArrayEditor
                items={brief.risksEdgeCases}
                onChange={(risksEdgeCases) =>
                  onBriefChange({ ...brief, risksEdgeCases })
                }
                name="riskEdgeCase"
              />
            </BriefSectionCard>
            <ExpandableGraphCard
              title="Planner Flow"
              eyebrow="Edit and export system flow"
              description="Shows how provider settings and the app idea become an editable brief and export artifacts."
              outline={<PlannerProcessOutline availableSteps={availableProcessSteps} />}
            >
              {(expanded) =>
                expanded ? (
                  <PlannerProcessFlow availableSteps={availableProcessSteps} />
                ) : null
              }
            </ExpandableGraphCard>
          </div>
        }
      />

      <DecisionDomain
        {...domainMetadata.handoff}
        state={domainStates.handoff}
        contextAction={
          onUpdateExports && brief.appSummary ? (
            <div className="flex max-w-[var(--measure-readable)] flex-col items-start gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onUpdateExports}
                disabled={isUpdatingExports}
              >
                {isUpdatingExports ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {isUpdatingExports ? "Regenerating Exports…" : "Regenerate Exports"}
              </Button>
              {hasExports && (
                <p className="text-base leading-relaxed text-muted-foreground">
                  {handoffFresh
                    ? "Current. The brief and starter prompt are ready to use."
                    : "Refresh needed. These artifacts do not include the latest brief changes."}
                </p>
              )}
            </div>
          ) : undefined
        }
        wide={
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {brief.markdownBrief && (
              <MarkdownExportCard
                markdown={brief.markdownBrief}
                filename={`${brief.appName}-project-brief.md`}
                isUpdating={isUpdatingExports}
              />
            )}
            {brief.starterPrompt && (
              <StarterPromptCard
                prompt={brief.starterPrompt}
                filename={`${brief.appName}-starter-prompt.txt`}
                isUpdating={isUpdatingExports || isUpdatingStarterPrompt}
                onUpdate={onUpdateStarterPrompt}
              />
            )}
          </div>
        }
      />
    </div>
  );
}
