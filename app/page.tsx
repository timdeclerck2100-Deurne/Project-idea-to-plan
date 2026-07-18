"use client";

import * as React from "react";
import { parsePartialJson } from "ai";
import { briefOverviewSchema, type ProjectBrief } from "@/lib/brief-schema";
import { generateMarkdownBrief } from "@/lib/planner-prompt";
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
import { ThemeSelector } from "@/components/theme-selector";

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
  const [section, setSection] = React.useState<"overview" | "starter-prompt" | "formatting" | "done">("done");
  const [error, setError] = React.useState<string>();
  const [isUpdatingExports, setIsUpdatingExports] = React.useState(false);
  const [isUpdatingStarterPrompt, setIsUpdatingStarterPrompt] = React.useState(false);
  const [questions, setQuestions] = React.useState<ClarifyingQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = React.useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = React.useState<number | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = React.useState(false);
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
    setSection("overview");

    try {
      // Step 1: Generate brief overview
      const overviewResponse = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          answers,
          section: "overview",
        }),
        signal: controller.signal,
      });

      if (!overviewResponse.ok) {
        const errData = await overviewResponse.json();
        throw new Error(errData.error || "Failed to generate brief overview.");
      }

      const overviewReader = overviewResponse.body?.getReader();
      if (!overviewReader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let overviewText = "";
      let lastOverviewApplied = "";

      while (true) {
        const { done, value } = await overviewReader.read();
        if (done) break;

        overviewText += decoder.decode(value, { stream: true });

        const { value: partial, state } = await parsePartialJson(overviewText);
        if (
          state !== "undefined-input" &&
          state !== "failed-parse" &&
          partial &&
          typeof partial === "object" &&
          "appSummary" in partial &&
          partial.appSummary !== lastOverviewApplied
        ) {
          lastOverviewApplied = partial.appSummary as string;
          try {
            const validated = briefOverviewSchema.partial().parse(partial);
            setBrief((prev) => ({
              ...prev,
              ...(validated as Partial<ProjectBrief>),
            }));
          } catch {
            // partial validation failed, skip this update
          }
        }
      }

      const { value: finalOverview, state: overviewState } = await parsePartialJson(overviewText);
      if (overviewState !== "successful-parse" && overviewState !== "repaired-parse") {
        throw new Error(
          "The provider response could not be parsed as a valid BriefOverview. " +
          "Check that your model supports structured output."
        );
      }

      const validatedOverview = briefOverviewSchema.parse(finalOverview);
      setBrief((prev) => ({ ...prev, ...validatedOverview }));

      // Step 2: Generate starter prompt
      setSection("starter-prompt");
      setProgress("Generating starter prompt...");

      const starterResponse = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          section: "starter-prompt",
          brief: validatedOverview,
        }),
        signal: controller.signal,
      });

      if (!starterResponse.ok) {
        const errData = await starterResponse.json();
        throw new Error(errData.error || "Failed to generate starter prompt.");
      }

      const starterReader = starterResponse.body?.getReader();
      if (!starterReader) throw new Error("No response body.");

      let starterText = "";

      while (true) {
        const { done, value } = await starterReader.read();
        if (done) break;
        starterText += decoder.decode(value, { stream: true });
      }

      const { value: finalStarter, state: starterState } = await parsePartialJson(starterText);
      if (starterState !== "successful-parse" && starterState !== "repaired-parse") {
        throw new Error(
          "The starter prompt response could not be parsed. " +
          "Check that your model supports structured output."
        );
      }

      const validatedStarter = { starterPrompt: (finalStarter as { starterPrompt: string }).starterPrompt };
      setBrief((prev) => ({ ...prev, ...validatedStarter }));

      // Step 3: Generate markdown brief client-side
      setSection("formatting");
      setProgress("Formatting markdown brief...");

      const fullBrief = { ...validatedOverview, ...validatedStarter };
      const markdownBrief = generateMarkdownBrief(fullBrief);
      setBrief((prev) => ({ ...prev, markdownBrief }));

      setSection("done");
      setStatus("done");
      setProgress("");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        setProgress("");
        setSection("done");
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

  const handleRegenerateQuestion = React.useCallback(async (index: number) => {
    if (!idea.trim() || !baseUrl.trim() || !model.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setRegeneratingIndex(index);

    try {
      const existingQuestions = questions.map((q) => ({ question: q.question }));

      const response = await fetch("/api/brief/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          replaceIndex: index,
          existingQuestions,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to regenerate question.");
      }

      const result = await response.json();
      const newQuestion = result.question;

      setQuestions((prev) => {
        const next = [...prev];
        next[index] = newQuestion;
        return next;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Aborted, do nothing
      } else {
        setError(err instanceof Error ? err.message : "Failed to regenerate question.");
      }
    } finally {
      setRegeneratingIndex(null);
      abortRef.current = null;
    }
  }, [idea, baseUrl, model, apiKey, questions]);

  const handleAddQuestion = React.useCallback(async () => {
    if (!idea.trim() || !baseUrl.trim() || !model.trim()) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsAddingQuestion(true);

    try {
      const existingQuestions = questions.map((q) => ({ question: q.question }));

      const response = await fetch("/api/brief/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          addQuestion: true,
          existingQuestions,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add question.");
      }

      const result = await response.json();
      setQuestions((prev) => [...prev, result.question]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Aborted, do nothing
      } else {
        setError(err instanceof Error ? err.message : "Failed to add question.");
      }
    } finally {
      setIsAddingQuestion(false);
      abortRef.current = null;
    }
  }, [idea, baseUrl, model, apiKey, questions]);

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

  const handleUpdateStarterPrompt = React.useCallback(async (feedback: string) => {
    if (!baseUrl.trim() || !model.trim() || !brief.appSummary) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsUpdatingStarterPrompt(true);
    setError(undefined);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          section: "starter-prompt",
          brief,
          feedback,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update starter prompt.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }

      const { value: final, state } = await parsePartialJson(text);
      if (state === "successful-parse" || state === "repaired-parse") {
        const validated = { starterPrompt: (final as { starterPrompt: string }).starterPrompt };
        setBrief((prev) => ({ ...prev, ...validated }));
      } else {
        throw new Error("The starter prompt response could not be parsed.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Aborted, do nothing
      } else {
        setError(err instanceof Error ? err.message : "Failed to update starter prompt.");
      }
    } finally {
      setIsUpdatingStarterPrompt(false);
      abortRef.current = null;
    }
  }, [brief, baseUrl, model, apiKey]);

  const handleReset = React.useCallback(() => {
    abortRef.current?.abort();
    setBrief(emptyBrief);
    setStatus("idle");
    setProgress("");
    setSection("done");
    setError(undefined);
    setQuestions([]);
  }, []);

  const hasBrief = brief.appSummary !== "";

  return (
    <PlannerShell>
      {/* Top command bar */}
      <Card className="glass-panel rounded-xl px-4 py-3 mb-3 flex-shrink-0 animate-fade-up">
        <div className="flex gap-4">
          {/* Left: App idea textarea (2/3) */}
          <div className="w-2/3 min-w-0">
            <IdeaInput value={idea} onChange={setIdea} disabled={status === "generating" || status === "questions"} />
          </div>

          {/* Right: Settings + actions (1/3) */}
          <div className="w-1/3 flex flex-col gap-2">
            {/* Top line: provider fields */}
            <ProviderSettings
              baseUrl={baseUrl}
              onBaseUrlChange={handleBaseUrlChange}
              model={model}
              onModelChange={handleModelChange}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              disabled={status === "generating" || status === "questions"}
            />

            {/* Bottom line: theme + actions */}
            <div className="flex items-center gap-2">
              <ThemeSelector />
              <Badge
                variant={status === "generating" ? "accent" : status === "questions" ? "accent" : status === "error" ? "destructive" : "outline"}
              >
                {status === "idle" && "Ready"}
                {status === "questions" && "Questions..."}
                {status === "generating" && "Generating..."}
                {status === "done" && "Complete"}
                {status === "error" && "Error"}
              </Badge>
              <div className="flex-1" />
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
        </div>
      </Card>

      {status !== "questions" && <GenerationStatus status={status} progress={progress} section={section} error={error} />}

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
              onRegenerate={handleRegenerateQuestion}
              onAddQuestion={handleAddQuestion}
              regeneratingIndex={regeneratingIndex}
              isAddingQuestion={isAddingQuestion}
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
            onUpdateStarterPrompt={handleUpdateStarterPrompt}
            isUpdatingStarterPrompt={isUpdatingStarterPrompt}
          />
        </div>
      )}
    </PlannerShell>
  );
}
