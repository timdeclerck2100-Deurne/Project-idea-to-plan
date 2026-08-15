"use client";

import * as React from "react";
import { BadgePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AppNameEditorProps {
  name: string;
  onCommitName: (name: string) => void;
  onGenerateName?: () => void;
  isGeneratingName?: boolean;
  generationError?: string | null;
  generatedSuggestion?: string | null;
  onUseGeneratedName: (name: string) => void;
  onDismissGeneratedName: () => void;
  embedded?: boolean;
  className?: string;
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
  embedded = false,
  className,
}: AppNameEditorProps) {
  const [edit, setEdit] = React.useState({ base: name, draft: name });
  const draft = edit.base === name ? edit.draft : name;
  const id = React.useId();
  const inputId = `${id}-app-name`;
  const errorId = `${id}-error`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const generateButtonRef = React.useRef<HTMLButtonElement>(null);

  const useGeneratedName = () => {
    if (!generatedSuggestion) return;
    onUseGeneratedName(generatedSuggestion);
    inputRef.current?.focus();
  };

  const dismissGeneratedName = () => {
    onDismissGeneratedName();
    generateButtonRef.current?.focus();
  };

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
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3",
        embedded ? "py-2" : "paper-card rounded-xl p-3",
        className,
      )}
    >
      <div className="flex max-w-4xl min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {embedded ? (
            <h3 className="leading-none">
              <Label htmlFor={inputId} className="micro-label !text-sm">
                App name
              </Label>
            </h3>
          ) : (
            <Label htmlFor={inputId} className="micro-label !text-sm">
              App name
            </Label>
          )}
          <Input
            ref={inputRef}
            id={inputId}
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
            name="appName"
            autoComplete="off"
            aria-invalid={generationError ? true : undefined}
            aria-describedby={generationError ? errorId : undefined}
            className={cn(
              "h-auto min-w-0 border-none bg-transparent py-0 font-display font-bold tracking-tight shadow-none",
              embedded ? "text-3xl sm:text-4xl" : "text-xl",
            )}
          />
        </div>
        <Button
          ref={generateButtonRef}
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
            <BadgePlus data-icon="inline-start" />
          )}
          {isGeneratingName ? "Generating..." : "Generate name"}
        </Button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {generationError && (
          <p id={errorId} className="break-words text-base text-destructive">
            {generationError}
          </p>
        )}
        {generatedSuggestion && (
          <div className="blueprint-surface flex min-w-0 flex-col gap-2 rounded-lg border border-accent/20 p-2.5 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-words text-base font-medium">{generatedSuggestion}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={useGeneratedName}>
                Use name
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={dismissGeneratedName}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
