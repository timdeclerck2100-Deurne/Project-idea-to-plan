"use client";

import * as React from "react";
import { BriefSectionCard } from "./brief-section-card";
import { ExpandableGraphCard } from "./expandable-graph-card";
import { DataModelFlow } from "./data-model-flow";
import { PlannerProcessFlow } from "./planner-process-flow";
import { MarkdownExportCard } from "./markdown-export-card";
import { StarterPromptCard } from "./starter-prompt-card";
import { RoadmapCard } from "./roadmap-card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import type { ProjectBrief, Entity } from "@/lib/brief-schema";

type TechStack = ProjectBrief["recommendedTechStack"];
type PageRoute = ProjectBrief["pagesRoutes"][number];

interface BriefWorkspaceProps {
  brief: ProjectBrief;
  onBriefChange: (brief: ProjectBrief) => void;
  onUpdateExports?: () => void;
  isUpdatingExports?: boolean;
  onUpdateStarterPrompt?: (feedback: string) => void;
  isUpdatingStarterPrompt?: boolean;
}

function ArrayEditor({
  items,
  onChange,
  placeholder = "Add item...",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = React.useState("");

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs cursor-pointer hover:bg-destructive/20 transition-colors"
            onClick={() => removeItem(index)}
          >
            {item}
            <span className="ml-1 text-muted-foreground">&times;</span>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
      </div>
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
    <div className="space-y-1.5">
      {categories.map((category) => (
        <div key={category} className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {category}
          </div>
          <ArrayEditor
            items={stack[category] || []}
            onChange={(items) => onChange({ ...stack, [category]: items })}
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
    }
  };

  const removePage = (index: number) => {
    onChange(pages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {pages.map((page, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 text-xs bg-secondary/50 rounded px-2 py-1 cursor-pointer hover:bg-destructive/20 transition-colors"
          onClick={() => removePage(index)}
        >
          <Badge variant="outline" className="text-[10px] font-mono">
            {page.path}
          </Badge>
          <span className="text-muted-foreground flex-1 truncate">{page.purpose}</span>
          <span className="text-muted-foreground text-[10px]">&times;</span>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/route"
          className="h-7 text-xs w-20"
        />
        <Input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose"
          className="h-7 text-xs flex-1"
        />
        <Input
          value={components}
          onChange={(e) => setComponents(e.target.value)}
          placeholder="Components"
          className="h-7 text-xs flex-1"
        />
        <button
          onClick={addPage}
          className="h-7 px-2 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
        >
          Add
        </button>
      </div>
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
    }
  };

  const removeEntity = (index: number) => {
    onChange(entities.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {entities.map((entity, index) => (
        <div
          key={index}
          className="text-sm bg-secondary/50 rounded px-2 py-1.5 cursor-pointer hover:bg-destructive/20 transition-colors"
          onClick={() => removeEntity(index)}
        >
          <div className="font-medium">{entity.name}</div>
          <div className="text-muted-foreground text-xs">
            {entity.fields.map((f) => f.name).join(", ")}
          </div>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Entity"
          className="h-7 text-xs flex-1"
        />
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          className="h-7 text-xs flex-1"
        />
        <Input
          value={fieldsStr}
          onChange={(e) => setFieldsStr(e.target.value)}
          placeholder="field1, field2"
          className="h-7 text-xs flex-1"
        />
        <button
          onClick={addEntity}
          className="h-7 px-2 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function BriefWorkspace({
  brief,
  onBriefChange,
  onUpdateExports,
  isUpdatingExports = false,
  onUpdateStarterPrompt,
  isUpdatingStarterPrompt = false,
}: BriefWorkspaceProps) {
  return (
    <div className="space-y-3 pb-8">
      {/* Row 0: App Name — full width */}
      <div className="flex items-center gap-3">
        <Input
          value={brief.appName}
          onChange={(e) => onBriefChange({ ...brief, appName: e.target.value })}
          placeholder="App name"
          className="font-display text-xl font-bold tracking-tight bg-transparent border-none shadow-none focus-visible:ring-0 h-auto py-0"
        />
      </div>

      {/* Row 1: App Summary — full width */}
      <BriefSectionCard title="App Summary" eyebrow="Overview">
        <Textarea
          value={brief.appSummary}
          onChange={(e) =>
            onBriefChange({ ...brief, appSummary: e.target.value })
          }
          rows={4}
        />
      </BriefSectionCard>

      {/* Row 2: Export cards — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        {brief.markdownBrief && (
          <MarkdownExportCard markdown={brief.markdownBrief} isUpdating={isUpdatingExports} />
        )}
        {brief.starterPrompt && (
          <StarterPromptCard
            prompt={brief.starterPrompt}
            isUpdating={isUpdatingExports || isUpdatingStarterPrompt}
            onUpdate={onUpdateStarterPrompt}
          />
        )}
      </div>

      {/* Refresh exports button */}
      {onUpdateExports && brief.appSummary && (
        <div className="flex justify-end">
          <button
            onClick={onUpdateExports}
            disabled={isUpdatingExports}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingExports ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isUpdatingExports ? "Regenerating Exports..." : "Regenerate Exports"}
          </button>
        </div>
      )}

      {/* Row 3: Audience, Features, Recommended, Navigation — 4 columns */}
      <div className="grid grid-cols-4 gap-3">
        <BriefSectionCard title="Target Users" eyebrow="Audience">
          <ArrayEditor
            items={brief.targetUsers}
            onChange={(targetUsers) => onBriefChange({ ...brief, targetUsers })}
          />
        </BriefSectionCard>

        <BriefSectionCard title="Core Features" eyebrow="Features">
          <ArrayEditor
            items={brief.coreFeatures}
            onChange={(coreFeatures) => onBriefChange({ ...brief, coreFeatures })}
          />
        </BriefSectionCard>

        <BriefSectionCard title="Tech Stack" eyebrow="Recommended">
          <TechStackEditor
            stack={brief.recommendedTechStack}
            onChange={(recommendedTechStack) =>
              onBriefChange({ ...brief, recommendedTechStack })
            }
          />
        </BriefSectionCard>

        <BriefSectionCard title="Pages & Routes" eyebrow="Navigation">
          <PagesEditor
            pages={brief.pagesRoutes}
            onChange={(pagesRoutes) => onBriefChange({ ...brief, pagesRoutes })}
          />
        </BriefSectionCard>
      </div>

      {/* Row 4: Entities, Roadmap, Watch Out — 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        <BriefSectionCard title="Data Model" eyebrow="Entities">
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

        <RoadmapCard
          roadmap={brief.buildPhases}
          onChange={(buildPhases) => onBriefChange({ ...brief, buildPhases })}
        />

        <BriefSectionCard title="Risks & Edge Cases" eyebrow="Watch Out">
          <ArrayEditor
            items={brief.risksEdgeCases}
            onChange={(risksEdgeCases) =>
              onBriefChange({ ...brief, risksEdgeCases })
            }
          />
        </BriefSectionCard>
      </div>

      {/* Row 5: Data Model Graph + Planner Flow — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <ExpandableGraphCard title="Data Model Graph" eyebrow="Visual">
          {(expanded) =>
            expanded ? (
              <DataModelFlow dataModel={brief.dataModel} />
            ) : null
          }
        </ExpandableGraphCard>

        <ExpandableGraphCard title="Planner Flow" eyebrow="Visual">
          {(expanded) =>
            expanded ? (
              <PlannerProcessFlow
                completedSteps={brief.appSummary ? ["idea"] : []}
              />
            ) : null
          }
        </ExpandableGraphCard>
      </div>
    </div>
  );
}
