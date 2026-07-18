"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Loader2 } from "lucide-react";

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
  isLoading?: boolean;
}

export function ClarifyingQuestions({
  questions,
  onConfirm,
  onSkip,
  isLoading = false,
}: ClarifyingQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question]);

  const handleSelect = (question: string, label: string) => {
    setAnswers((prev) => ({ ...prev, [question]: label }));
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
        {questions.map((q, index) => (
          <Card key={index} className="paper-card rounded-xl p-3">
            <div className="flex items-start gap-3">
              <Badge variant="accent" className="mt-0.5 shrink-0 text-[10px]">
                {index + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-2">
                  {q.question}
                </p>
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
                {answers[q.question] && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {q.options.find((o) => o.label === answers[q.question])?.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isLoading}
          className="text-xs text-muted-foreground"
        >
          Skip questions
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!allAnswered || isLoading}
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
