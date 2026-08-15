import { PlannerShell } from "@/components/planner/planner-shell";
import { IdeaInput } from "@/components/planner/idea-input";
import { ProviderSettings } from "@/components/planner/provider-settings";
import { GenerationStatus } from "@/components/planner/generation-status";
import { GenerationTrace } from "@/components/planner/generation-trace";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClarifyingQuestions,
  type ClarifyingQuestion,
} from "@/components/planner/clarifying-questions";
import { RotateCcw, Square, Workflow } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import type { ProjectBrief } from "@/lib/brief-schema";
import type {
  AssistantSectionId,
  BriefAssistantState,
} from "@/components/planner/inline-card-assistant";
import { decisionDomains } from "@/components/planner/decision-trace-nav";

type PlannerStatus = "idle" | "questions" | "generating" | "done" | "error";
type GenerationSection = "overview" | "starter-prompt" | "formatting" | "done";
export type ClarificationOutcome = "none" | "answered" | "skipped";

export interface PlannerViewProps {
  idea: string;
  onIdeaChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  status: PlannerStatus;
  progress: string;
  section: GenerationSection;
  error?: string;
  hasBrief: boolean;
  hasRetryableBriefError: boolean;
  isGeneratingQuestions: boolean;
  clarificationOutcome: ClarificationOutcome;
  questions: ClarifyingQuestion[];
  regeneratingIndex: number | null;
  isAddingQuestion: boolean;
  brief: ProjectBrief;
  handoffFresh: boolean;
  isUpdatingExports: boolean;
  isUpdatingStarterPrompt: boolean;
  isGeneratingName: boolean;
  nameGenerationError: string | null;
  generatedNameSuggestion: string | null;
  assistantStates: Partial<Record<AssistantSectionId, BriefAssistantState>>;
  onStop: () => void;
  onGenerate: () => void;
  onReset: () => void;
  onRetryBrief: () => void;
  onConfirmQuestions: (answers: Record<string, string>) => void;
  onSkipQuestions: () => void;
  onRegenerateQuestion: (index: number) => void;
  onAddQuestion: () => void;
  onBriefChange: (brief: ProjectBrief) => void;
  onUpdateExports: () => void;
  onUpdateStarterPrompt: (feedback: string) => void;
  onCommitName: (name: string) => void;
  onGenerateName: () => void;
  onUseGeneratedName: (name: string) => void;
  onDismissGeneratedName: () => void;
  onAskAssistant: (sectionId: AssistantSectionId, question: string) => void;
  onApplyAssistantSuggestion: (sectionId: AssistantSectionId) => void;
  onDismissAssistant: (sectionId: AssistantSectionId) => void;
}

export function PlannerView({
  idea,
  onIdeaChange,
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  status,
  progress,
  section,
  error,
  hasBrief,
  hasRetryableBriefError,
  isGeneratingQuestions,
  clarificationOutcome,
  questions,
  regeneratingIndex,
  isAddingQuestion,
  brief,
  handoffFresh,
  isUpdatingExports,
  isUpdatingStarterPrompt,
  isGeneratingName,
  nameGenerationError,
  generatedNameSuggestion,
  assistantStates,
  onStop,
  onGenerate,
  onReset,
  onRetryBrief,
  onConfirmQuestions,
  onSkipQuestions,
  onRegenerateQuestion,
  onAddQuestion,
  onBriefChange,
  onUpdateExports,
  onUpdateStarterPrompt,
  onCommitName,
  onGenerateName,
  onUseGeneratedName,
  onDismissGeneratedName,
  onAskAssistant,
  onApplyAssistantSuggestion,
  onDismissAssistant,
}: PlannerViewProps) {
  const inputsDisabled =
    status === "generating" || status === "questions" || hasRetryableBriefError;

  return (
    <PlannerShell>
      <header className="animate-fade-up">
        <p className="micro-label mb-1">Project drafting workspace</p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Project Idea to Plan
        </h1>
      </header>

      <Card variant="glass" className="animate-fade-up rounded-2xl p-4 sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <section
            aria-labelledby="idea-bench-heading"
            className="min-w-0 lg:col-span-7 [&_textarea]:max-w-[var(--measure-readable)]"
          >
            <h2 id="idea-bench-heading" className="sr-only">
              Project idea
            </h2>
            <IdeaInput value={idea} onChange={onIdeaChange} disabled={inputsDisabled} />
          </section>

          <section
            aria-labelledby="provider-bench-heading"
            className="flex min-w-0 flex-col gap-3 lg:col-span-5"
          >
            <h2 id="provider-bench-heading" className="sr-only">
              Provider and actions
            </h2>
            <ProviderSettings
              baseUrl={baseUrl}
              onBaseUrlChange={onBaseUrlChange}
              model={model}
              onModelChange={onModelChange}
              apiKey={apiKey}
              onApiKeyChange={onApiKeyChange}
              disabled={inputsDisabled}
            />

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <ThemeSelector />
              <div className="flex flex-wrap items-center justify-end gap-2">
                {status === "generating" ||
                (status === "questions" && isGeneratingQuestions) ? (
                  <Button variant="destructive" onClick={onStop}>
                    <Square data-icon="inline-start" />
                    Stop
                  </Button>
                ) : status !== "questions" ? (
                  <Button
                    onClick={onGenerate}
                    disabled={
                      !idea.trim() ||
                      !baseUrl.trim() ||
                      !model.trim() ||
                      hasRetryableBriefError
                    }
                  >
                    <Workflow data-icon="inline-start" />
                    Generate
                  </Button>
                ) : null}
                {status !== "idle" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onReset}
                    aria-label="Reset planner"
                  >
                    <RotateCcw />
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>

      </Card>

      {!(status === "done" && hasBrief) && (
        <GenerationTrace
          status={status}
          section={section}
          isGeneratingQuestions={isGeneratingQuestions}
          clarificationOutcome={clarificationOutcome}
          hasRetryableBriefError={hasRetryableBriefError}
        />
      )}

      {status !== "questions" && (
        <GenerationStatus
          status={status}
          progress={progress}
          section={section}
          error={error}
          onRetry={status === "error" ? (hasRetryableBriefError ? onRetryBrief : onGenerate) : undefined}
        />
      )}

      {status === "questions" && (
        <section aria-labelledby="clarification-heading" className="animate-fade-up">
          <h2 id="clarification-heading" className="sr-only">
            Clarifying questions
          </h2>
          {isGeneratingQuestions ? (
            <div className="flex min-h-52 items-center justify-center border-y border-border py-10">
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col gap-2 px-6 text-center"
              >
                <div className="font-display text-xl font-bold text-muted-foreground">
                  Thinking of questions…
                </div>
                <p className="max-w-md text-base text-muted-foreground/70">
                  Analyzing your idea to find the best clarifying questions.
                </p>
              </div>
            </div>
          ) : (
            <ClarifyingQuestions
              questions={questions}
              onConfirm={onConfirmQuestions}
              onSkip={onSkipQuestions}
              onRegenerate={onRegenerateQuestion}
              onAddQuestion={onAddQuestion}
              regeneratingIndex={regeneratingIndex}
              isAddingQuestion={isAddingQuestion}
            />
          )}
        </section>
      )}

      {status !== "questions" && !hasBrief && status === "idle" && (
        <section
          aria-labelledby="decision-trace-heading"
          className="animate-scale-in py-3 sm:py-6"
        >
          <p className="micro-label mb-2">Open decision trace</p>
          <h2
            id="decision-trace-heading"
            className="max-w-3xl font-display text-2xl font-bold leading-tight sm:text-3xl"
          >
            Give the plan a starting point.
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Describe the project and choose a provider. These decision areas will open as the
            workflow advances.
          </p>
          <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {decisionDomains.map((domain) => (
              <li key={domain.id} className="flex min-w-0 items-baseline gap-3 text-base">
                <span className="font-mono text-muted-foreground" aria-hidden="true">
                  {domain.number}
                </span>
                <span>
                  <strong className="font-semibold text-foreground">{domain.title}</strong>
                  <span className="block text-muted-foreground">{domain.orientation}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {hasBrief && (
        <section aria-label="Project brief workspace" className="min-w-0 animate-fade-up">
          <BriefWorkspace
            brief={brief}
            handoffFresh={handoffFresh}
            onBriefChange={onBriefChange}
            onUpdateExports={onUpdateExports}
            isUpdatingExports={isUpdatingExports}
            onUpdateStarterPrompt={onUpdateStarterPrompt}
            isUpdatingStarterPrompt={isUpdatingStarterPrompt}
            onCommitName={onCommitName}
            onGenerateName={onGenerateName}
            isGeneratingName={isGeneratingName}
            nameGenerationError={nameGenerationError}
            generatedNameSuggestion={generatedNameSuggestion}
            onUseGeneratedName={onUseGeneratedName}
            onDismissGeneratedName={onDismissGeneratedName}
            assistantStates={assistantStates}
            onAskAssistant={onAskAssistant}
            onApplyAssistantSuggestion={onApplyAssistantSuggestion}
            onDismissAssistant={onDismissAssistant}
          />
        </section>
      )}
    </PlannerShell>
  );
}
