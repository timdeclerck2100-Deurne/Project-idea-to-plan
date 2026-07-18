"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AppNameEditorProps {
  name: string;
  onCommitName: (name: string) => void;
  onGenerateName?: () => void;
  isGeneratingName?: boolean;
  generationError?: string | null;
  generatedSuggestion?: string | null;
  onUseGeneratedName: (name: string) => void;
  onDismissGeneratedName: () => void;
}

export function AppNameEditor({
  name,
  onCommitName,
  onGenerateName,
  isGeneratingName = false,
  generationError,
  generatedSuggestion,
  onUseGeneratedName,
  onDismissGeneratedName,
}: AppNameEditorProps) {
  const [edit, setEdit] = React.useState({ base: name, draft: name });
  const draft = edit.base === name ? edit.draft : name;
  const errorId = "planner-app-name-error";

  const commit = () => {
    const nextName = draft.trim();
    if (!nextName) {
      setEdit({ base: name, draft: name });
      return;
    }
    setEdit({ base: name, draft: nextName });
    if (nextName !== name) onCommitName(nextName);
  };

  return (
    <div className="paper-card flex min-w-0 flex-col gap-2 rounded-xl p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="planner-app-name" className="micro-label">
            App name
          </Label>
          <Input
            id="planner-app-name"
            value={draft}
            onChange={(event) => setEdit({ base: name, draft: event.target.value })}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            placeholder="App name"
            aria-invalid={generationError ? true : undefined}
            aria-describedby={generationError ? errorId : undefined}
            className="h-auto min-w-0 border-none bg-transparent py-0 font-display text-xl font-bold tracking-tight shadow-none"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerateName?.()}
          disabled={isGeneratingName || !onGenerateName}
          className="shrink-0 self-start sm:self-auto"
        >
          {isGeneratingName ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Sparkles data-icon="inline-start" />
          )}
          {isGeneratingName ? "Generating..." : "Generate name"}
        </Button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {generationError && (
          <p id={errorId} className="text-xs text-destructive">
            {generationError}
          </p>
        )}
        {generatedSuggestion && (
          <div className="blueprint-surface flex min-w-0 flex-col gap-2 rounded-lg border border-accent/20 p-2.5 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-words text-sm font-medium">{generatedSuggestion}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onUseGeneratedName(generatedSuggestion)}>
                Use name
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onDismissGeneratedName}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
