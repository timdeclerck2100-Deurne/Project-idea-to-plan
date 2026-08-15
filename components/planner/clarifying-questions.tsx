"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { ArrowRight, Loader2, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionOption {
  label: string;
  description: string;
}

export interface ClarifyingQuestion {
  question: string;
  options: QuestionOption[];
}

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  onConfirm: (answers: Record<string, string>) => void;
  onSkip: () => void;
  onRegenerate?: (index: number) => void;
  onAddQuestion?: () => void;
  isLoading?: boolean;
  regeneratingIndex?: number | null;
  isAddingQuestion?: boolean;
}

export function ClarifyingQuestions({
  questions,
  onConfirm,
  onSkip,
  onRegenerate,
  onAddQuestion,
  isLoading = false,
  regeneratingIndex = null,
  isAddingQuestion = false,
}: ClarifyingQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const questionGroupId = React.useId();

  const answeredCount = questions.reduce(
    (count, question, index) => count + (question.options[answers[index]] ? 1 : 0),
    0
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleRegenerate = (index: number) => {
    if (onRegenerate && regeneratingIndex === null) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      onRegenerate(index);
    }
  };

  const handleConfirm = () => {
    if (allAnswered) {
      const serializedAnswers = questions.reduce<Record<string, string>>(
        (result, question, index) => {
          result[question.question] = question.options[answers[index]].label;
          return result;
        },
        {}
      );
      onConfirm(serializedAnswers);
    }
  };

  return (
    <div className="flex animate-fade-up flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="micro-label">Refine</div>
          <h2 className="text-base font-medium text-foreground">
            A few questions to sharpen your brief
          </h2>
        </div>
        <Badge variant="outline" className="text-sm">
          {answeredCount} / {questions.length} answered
        </Badge>
      </div>

      <div className="border-y border-border">
        {questions.map((q, index) => {
          const isRegenerating = regeneratingIndex === index;
          return (
            <div key={index} className="border-b border-border py-4 last:border-b-0">
              <fieldset className="relative min-w-0">
                <legend className="w-full pr-12 text-base font-medium text-foreground">
                  <span className="flex items-start gap-3">
                    <span className={cn(badgeVariants({ variant: "accent" }), "mt-0.5 shrink-0 text-sm")}>
                      {index + 1}
                    </span>
                    {isRegenerating ? (
                      <span className="animate-pulse text-muted-foreground">Generating new question…</span>
                    ) : (
                      q.question
                    )}
                  </span>
                </legend>
                {onRegenerate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRegenerate(index)}
                    disabled={isRegenerating || regeneratingIndex !== null}
                    aria-label={`Generate a new question for question ${index + 1}`}
                    title="Generate new question"
                  >
                    {isRegenerating ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                  </Button>
                )}
                {!isRegenerating && (
                  <div className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
                    {q.options.map((option, optionIndex) => {
                      const isSelected = answers[index] === optionIndex;
                      const optionId = `${questionGroupId}-${index}-${optionIndex}`;
                      const descriptionId = `${optionId}-description`;
                      return (
                        <label
                          key={optionIndex}
                          htmlFor={optionId}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 border-l-2 border-border bg-muted/20 px-3 py-2 text-foreground transition-colors hover:bg-muted/35",
                            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                            isSelected && "border-accent bg-accent/10 font-medium"
                          )}
                        >
                          <input
                            id={optionId}
                            type="radio"
                            name={`${questionGroupId}-${index}`}
                            value={option.label}
                            checked={isSelected}
                            onChange={() => handleSelect(index, optionIndex)}
                            aria-describedby={descriptionId}
                            className="mt-1 size-4 shrink-0 accent-accent focus-visible:outline-none"
                          />
                          <span className="min-w-0">
                            <span className="block text-base">{option.label}</span>
                            <span
                              id={descriptionId}
                              className="mt-1 block text-base font-normal leading-relaxed text-muted-foreground"
                            >
                              {option.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={isLoading || regeneratingIndex !== null || isAddingQuestion}
            className="text-muted-foreground"
          >
            Skip questions
          </Button>
          {onAddQuestion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddQuestion}
              disabled={isLoading || regeneratingIndex !== null || isAddingQuestion}
              className="text-muted-foreground"
            >
              {isAddingQuestion ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              Add question
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!allAnswered || isLoading || regeneratingIndex !== null || isAddingQuestion}
        >
          {isLoading ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <ArrowRight data-icon="inline-start" />
          )}
          {isLoading ? "Generating…" : "Generate brief"}
        </Button>
      </div>
    </div>
  );
}
