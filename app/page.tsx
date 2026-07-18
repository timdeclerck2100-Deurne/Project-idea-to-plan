"use client";

import * as React from "react";
import { parsePartialJson } from "ai";
import { projectBriefSchema, type ProjectBrief } from "@/lib/brief-schema";
import { PlannerShell } from "@/components/planner/planner-shell";
import { IdeaInput } from "@/components/planner/idea-input";
import { ProviderSettings } from "@/components/planner/provider-settings";
import { GenerationStatus } from "@/components/planner/generation-status";
import { BriefWorkspace } from "@/components/planner/brief-workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClarifyingQuestions, type ClarifyingQuestion } from "@/components/planner/clarifying-questions";
import { Sparkles, RotateCcw, Square } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";

const STORAGE_KEY_BASE_URL = "planner-base-url";
const STORAGE_KEY_MODEL = "planner-model";

const emptyBrief: ProjectBrief = {
  appName: "",
  appSummary: "",
  targetUsers: [],
  coreFeatures: [],
  recommendedTechStack: {
    frontend: [],
    backend: [],
    database: [],
    ai: [],
    deployment: [],
  },
  pagesRoutes: [],
  dataModel: {
    entities: [],
    relationships: [],
  },
  buildPhases: [],
  risksEdgeCases: [],
  starterPrompt: "",
  markdownBrief: "",
};

export default function Home() {
  const [idea, setIdea] = React.useState("");
  const [baseUrl, setBaseUrlRaw] = useLocalStorage(STORAGE_KEY_BASE_URL, "");
  const [model, setModelRaw] = useLocalStorage(STORAGE_KEY_MODEL, "");
  const [apiKey, setApiKey] = React.useState("");
  const [brief, setBrief] = React.useState<ProjectBrief>(emptyBrief);
  const [status, setStatus] = React.useState<"idle" | "questions" | "generating" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [isUpdatingExports, setIsUpdatingExports] = React.useState(false);
  const [questions, setQuestions] = React.useState<ClarifyingQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const handleBaseUrlChange = React.useCallback((value: string) => {
    setBaseUrlRaw(value);
  }, [setBaseUrlRaw]);

  const handleModelChange = React.useCallback((value: string) => {
    setModelRaw(value);
  }, [setModelRaw]);

  const handleGenerate = React.useCallback(async () => {
    if (!idea.trim() || !baseUrl.trim() || !model.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("questions");
    setError(undefined);
    setQuestions([]);
    setIsGeneratingQuestions(true);

    try {
      const response = await fetch("/api/brief/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate questions.");
      }

      const result = await response.json();
      setQuestions(result.questions);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setIsGeneratingQuestions(false);
      abortRef.current = null;
    }
  }, [idea, baseUrl, model, apiKey]);

  const handleStop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const generateBrief = React.useCallback(async (answers?: Record<string, string>) => {
    if (!idea.trim() || !baseUrl.trim() || !model.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("generating");
    setProgress("Connecting to provider...");
    setError(undefined);
    setBrief(emptyBrief);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          answers,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate brief.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let fullText = "";
      let lastApplied = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });
        setProgress(fullText.slice(0, 600));

        const { value: partial, state } = await parsePartialJson(fullText);
        if (
          state !== "undefined-input" &&
          state !== "failed-parse" &&
          partial &&
          typeof partial === "object" &&
          "appSummary" in partial &&
          partial.appSummary !== lastApplied
        ) {
          lastApplied = partial.appSummary as string;
          try {
            const validated = projectBriefSchema.partial().parse(partial);
            setBrief((prev) => ({
              ...prev,
              ...(validated as Partial<ProjectBrief>),
            }));
          } catch {
            // partial validation failed, skip this update
          }
        }
      }

      setProgress("Finalizing...");

      const { value: final, state } = await parsePartialJson(fullText);
      if (state === "successful-parse" || state === "repaired-parse") {
        const validated = projectBriefSchema.parse(final);
        setBrief(validated);
        setStatus("done");
        setProgress("");
      } else {
        throw new Error(
          "The provider response could not be parsed as a valid ProjectBrief. " +
          "Check that your model supports structured output."
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        setProgress("");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      abortRef.current = null;
    }
  }, [idea, baseUrl, model, apiKey]);

  const handleConfirmQuestions = React.useCallback((answers: Record<string, string>) => {
    generateBrief(answers);
  }, [generateBrief]);

  const handleSkipQuestions = React.useCallback(() => {
    generateBrief();
  }, [generateBrief]);

  const handleUpdateExports = React.useCallback(async () => {
    if (!baseUrl.trim() || !model.trim() || !brief.appSummary) return;

    setIsUpdatingExports(true);
    try {
      const response = await fetch("/api/brief/update-exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update exports.");
      }

      const result = await response.json();
      setBrief((prev) => ({
        ...prev,
        starterPrompt: result.starterPrompt,
        markdownBrief: result.markdownBrief,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exports.");
    } finally {
      setIsUpdatingExports(false);
    }
  }, [brief, baseUrl, model, apiKey]);

  const handleReset = React.useCallback(() => {
    abortRef.current?.abort();
    setBrief(emptyBrief);
    setStatus("idle");
    setProgress("");
    setError(undefined);
    setQuestions([]);
  }, []);

  const hasBrief = brief.appSummary !== "";

  return (
    <PlannerShell>
      {/* Top command bar */}
      <Card className="glass-panel rounded-xl px-4 py-3 mb-3 flex-shrink-0 animate-fade-up">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <IdeaInput value={idea} onChange={setIdea} disabled={status === "generating" || status === "questions"} />
          </div>
          <div className="flex-shrink-0">
            <ProviderSettings
              baseUrl={baseUrl}
              onBaseUrlChange={handleBaseUrlChange}
              model={model}
              onModelChange={handleModelChange}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              disabled={status === "generating" || status === "questions"}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0 items-center">
            <Badge
              variant={status === "generating" ? "accent" : status === "questions" ? "accent" : status === "error" ? "destructive" : "outline"}
              className="hidden sm:inline-flex"
            >
              {status === "idle" && "Ready"}
              {status === "questions" && "Questions..."}
              {status === "generating" && "Generating..."}
              {status === "done" && "Complete"}
              {status === "error" && "Error"}
            </Badge>
            {(status === "generating" || (status === "questions" && !isGeneratingQuestions)) ? (
              <Button
                onClick={handleStop}
                className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!idea.trim() || !baseUrl.trim() || !model.trim() || status === "questions"}
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
            )}
            {status !== "idle" && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {status !== "questions" && <GenerationStatus status={status} progress={progress} error={error} />}

      {/* Main content — fills all remaining space */}
      {status === "questions" && (
        <div className="flex-1 min-h-0 overflow-y-auto animate-fade-up">
          {isGeneratingQuestions ? (
            <div className="flex-1 blueprint-surface rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2 px-8">
                <div className="font-display text-xl font-bold text-muted-foreground">
                  Thinking of questions...
                </div>
                <p className="text-sm text-muted-foreground/70 max-w-md">
                  Analyzing your idea to find the best clarifying questions.
                </p>
              </div>
            </div>
          ) : (
            <ClarifyingQuestions
              questions={questions}
              onConfirm={handleConfirmQuestions}
              onSkip={handleSkipQuestions}
            />
          )}
        </div>
      )}

      {status !== "questions" && !hasBrief && status === "idle" && (
        <div className="flex-1 blueprint-surface rounded-xl flex items-center justify-center animate-scale-in">
          <div className="text-center space-y-2 px-8">
            <div className="font-display text-xl font-bold text-muted-foreground">
              Your brief will appear here
            </div>
            <p className="text-sm text-muted-foreground/70 max-w-md">
              Enter your app idea and provider settings above,
              then hit Generate to create a comprehensive project plan.
            </p>
          </div>
        </div>
      )}

      {hasBrief && (
        <div className="flex-1 min-h-0 overflow-y-auto animate-fade-up">
          <BriefWorkspace
            brief={brief}
            onBriefChange={setBrief}
            onUpdateExports={handleUpdateExports}
            isUpdatingExports={isUpdatingExports}
          />
        </div>
      )}
    </PlannerShell>
  );
}
