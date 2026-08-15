import { AlertCircle, Check, Circle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClarificationOutcome } from "@/components/planner/planner-view";

export type GenerationTraceStatus =
  | "idle"
  | "questions"
  | "generating"
  | "done"
  | "error";

export type GenerationTraceSection =
  | "overview"
  | "starter-prompt"
  | "formatting"
  | "done";

interface GenerationTraceProps {
  status: GenerationTraceStatus;
  section: GenerationTraceSection;
  isGeneratingQuestions?: boolean;
  clarificationOutcome?: ClarificationOutcome;
  hasRetryableBriefError?: boolean;
}

const stages = ["Idea", "Clarify", "Plan", "Handoff"] as const;

function getActiveStage(
  status: GenerationTraceStatus,
  section: GenerationTraceSection,
  hasRetryableBriefError: boolean
) {
  if (status === "idle") return 0;
  if (status === "questions") return 1;
  if (status === "done") return -1;
  if (status === "error" && !hasRetryableBriefError) return 1;
  if (section === "starter-prompt" || section === "formatting") return 3;
  return 2;
}

export function GenerationTrace({
  status,
  section,
  isGeneratingQuestions = false,
  clarificationOutcome = "none",
  hasRetryableBriefError = false,
}: GenerationTraceProps) {
  const activeStage = getActiveStage(status, section, hasRetryableBriefError);
  const traceStatus =
    status === "questions"
      ? isGeneratingQuestions
        ? "Preparing Questions"
        : "Awaiting Answers"
      : status === "idle"
        ? "Ready"
        : status === "generating"
          ? "Generating…"
          : status === "done"
            ? "Complete"
            : "Error";

  return (
    <section
      aria-labelledby="generation-trace-heading"
      className="min-w-0 border-y border-border py-3 sm:py-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="generation-trace-heading" className="micro-label">
          Generation trace
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">{traceStatus}</p>
      </div>
      <ol className="grid grid-cols-4 gap-0" aria-label="Project generation stages">
        {stages.map((stage, index) => {
          const isActive = index === activeStage;
          const isError = status === "error" && isActive;
          const isComplete = status === "done" || index < activeStage;
          const isClarification = index === 1;
          const wasSkipped = isClarification && clarificationOutcome === "skipped";
          const wasAnswered = isClarification && clarificationOutcome === "answered";
          const stateLabel = isError
            ? "Error"
            : wasSkipped
              ? "Skipped"
              : wasAnswered
                ? "Answered"
                : isActive
                  ? status === "questions"
                    ? isGeneratingQuestions
                      ? "Preparing Questions"
                      : "Awaiting Answers"
                    : "Current step"
                  : isComplete
                    ? "Complete"
                    : "Waiting";
          const Icon = isError ? AlertCircle : wasSkipped ? SkipForward : isComplete ? Check : Circle;

          return (
            <li
              key={stage}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "relative min-w-0 border-t border-border pt-3 sm:pt-4",
                isActive && "border-accent",
                isError && "border-destructive"
              )}
            >
              <span
                className={cn(
                  "absolute -top-[9px] left-0 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground",
                  (isActive || isComplete) && "text-accent",
                  isError && "text-destructive"
                )}
                aria-hidden="true"
              >
                <Icon />
              </span>
              <div className="min-w-0 pr-1 sm:pr-3">
                <span className="block break-words font-display text-sm font-bold leading-tight sm:text-lg">
                  {stage}
                </span>
                <span
                  className={cn(
                    "text-base text-muted-foreground sm:block",
                    !isActive && "sr-only sm:not-sr-only"
                  )}
                >
                  {stateLabel}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
