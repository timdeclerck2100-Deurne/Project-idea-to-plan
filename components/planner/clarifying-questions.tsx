"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Loader2, RefreshCw, Plus } from "lucide-react";

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
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question]);

  const handleSelect = (question: string, label: string) => {
    setAnswers((prev) => ({ ...prev, [question]: label }));
  };

  const handleRegenerate = (index: number) => {
    if (onRegenerate && regeneratingIndex === null) {
      const questionText = questions[index].question;
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[questionText];
        return next;
      });
      onRegenerate(index);
    }
  };

  const handleConfirm = () => {
    if (allAnswered) {
      onConfirm(answers);
    }
  };

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <div className="micro-label">Refine</div>
          <h2 className="text-sm font-medium text-foreground">
            A few questions to sharpen your brief
          </h2>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {Object.keys(answers).length} / {questions.length} answered
        </Badge>
      </div>

      <div className="space-y-2">
        {questions.map((q, index) => {
          const isRegenerating = regeneratingIndex === index;
          return (
            <Card key={index} className="paper-card rounded-xl p-3">
              <div className="flex items-start gap-3">
                <Badge variant="accent" className="mt-0.5 shrink-0 text-[10px]">
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {isRegenerating ? (
                        <span className="text-muted-foreground animate-pulse">Generating new question...</span>
                      ) : (
                        q.question
                      )}
                    </p>
                    {onRegenerate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRegenerate(index)}
                        disabled={isRegenerating || regeneratingIndex !== null}
                        title="Generate new question"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {!isRegenerating && (
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((option) => {
                        const isSelected = answers[q.question] === option.label;
                        return (
                          <button
                            key={option.label}
                            onClick={() => handleSelect(q.question, option.label)}
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
                              border transition-all cursor-pointer
                              ${
                                isSelected
                                  ? "bg-accent/15 border-accent/40 text-accent"
                                  : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }
                            `}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!isRegenerating && answers[q.question] && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {q.options.find((o) => o.label === answers[q.question])?.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={isLoading || regeneratingIndex !== null || isAddingQuestion}
            className="text-xs text-muted-foreground"
          >
            Skip questions
          </Button>
          {onAddQuestion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddQuestion}
              disabled={isLoading || regeneratingIndex !== null || isAddingQuestion}
              className="text-xs text-muted-foreground"
            >
              {isAddingQuestion ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Add question
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!allAnswered || isLoading || regeneratingIndex !== null || isAddingQuestion}
          className="text-xs"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowRight className="h-3 w-3" />
          )}
          {isLoading ? "Generating..." : "Generate brief"}
        </Button>
      </div>
    </div>
  );
}
