"use client";

import * as React from "react";
import { Bot, Loader2, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const briefSectionIds = [
  "appName",
  "appSummary",
  "targetUsers",
  "coreFeatures",
  "recommendedTechStack",
  "pagesRoutes",
  "dataModel",
  "buildPhases",
  "risksEdgeCases",
] as const;

export type BriefSectionId = (typeof briefSectionIds)[number];
export type AssistantSectionId = Exclude<BriefSectionId, "appName">;

export interface BriefAssistantState {
  isLoading: boolean;
  error?: string | null;
  answer?: string | null;
  canApply?: boolean;
}

export interface InlineCardAssistantProps {
  sectionId: AssistantSectionId;
  state?: BriefAssistantState;
  onAsk: (prompt: string) => void;
  onApplySuggestion?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function InlineCardAssistant({
  sectionId,
  state = { isLoading: false },
  onAsk,
  onApplySuggestion,
  onDismiss,
  className,
}: InlineCardAssistantProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const id = React.useId();
  const panelId = `${id}-assistant-panel`;
  const promptId = `${id}-assistant-prompt`;
  const statusId = `${id}-assistant-status`;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const canSubmit = draft.trim().length > 0 && !state.isLoading;

  const submit = () => {
    if (canSubmit) onAsk(draft.trim());
  };

  const dismiss = () => {
    onDismiss?.();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const applySuggestion = () => {
    onApplySuggestion?.();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn("min-w-0", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MessageCircleQuestion data-icon="inline-start" />
        Ask AI
      </Button>

      {isOpen && (
        <div
          id={panelId}
          className="blueprint-surface mt-2 flex min-w-0 flex-col gap-2 rounded-lg border border-border/60 p-2.5"
        >
          <label htmlFor={promptId} className="micro-label !text-sm">
            Ask about this section
          </label>
          <Textarea
            id={promptId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="What should be clearer, stronger, or more specific?"
            name={`${sectionId}AssistantPrompt`}
            autoComplete="off"
            aria-describedby={statusId}
            className="min-h-20 bg-background/70 text-base"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={submit} disabled={!canSubmit}>
              {state.isLoading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Bot data-icon="inline-start" />
              )}
              {state.isLoading ? "Thinking..." : "Ask AI"}
            </Button>
            <span className="text-base text-muted-foreground">Ctrl/⌘ + Enter</span>
          </div>

          <div id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
            {state.isLoading
              ? "Thinking..."
              : state.error
                ? `Assistant error: ${state.error}`
                : state.answer
                  ? "Assistant response ready."
                  : ""}
          </div>

          <div>
            {state.error && (
              <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-destructive/30 bg-background/70 p-2.5">
                <p className="break-words text-base text-destructive">{state.error}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={submit} disabled={!canSubmit}>
                    <RotateCcw data-icon="inline-start" />
                    Retry
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
                    <X data-icon="inline-start" />
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {!state.error && state.answer && (
              <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-accent/20 bg-background/70 p-2.5">
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground [overflow-wrap:anywhere]">
                  {state.answer}
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.canApply && onApplySuggestion && (
                    <Button type="button" size="sm" onClick={applySuggestion}>
                      Use suggestion
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
