"use client";

import * as React from "react";
import { parsePartialJson } from "ai";
import {
  assistantSectionSchemas,
  briefOverviewSchema,
  starterPromptSchema,
  type AssistantSection,
  type BriefOverview,
  type ProjectBrief,
} from "@/lib/brief-schema";
import { renameProjectBrief } from "@/lib/brief-transforms";
import { generateMarkdownBrief } from "@/lib/planner-prompt";
import type { ClarifyingQuestion } from "@/components/planner/clarifying-questions";
import { useLocalStorage } from "@/lib/use-local-storage";
import type { BriefAssistantState } from "@/components/planner/inline-card-assistant";
import type { PlannerViewProps } from "@/components/planner/planner-view";

const STORAGE_KEY_BASE_URL = "planner-base-url";
const STORAGE_KEY_MODEL = "planner-model";
const MAX_DISMISSED_NAMES = 20;
const MAX_NAME_GENERATION_ATTEMPTS = 3;

type ContentAssistantSection = Exclude<AssistantSection, "appName">;

type SectionAssistantState = BriefAssistantState & {
  proposedValue?: unknown;
  sourceSnapshot?: unknown;
};

type AssistantResponse = {
  answer: string;
  proposedValue: unknown;
};

type BriefSubmissionSnapshot = Readonly<{
  idea: string;
  answers?: Readonly<Record<string, string>>;
  baseUrl: string;
  model: string;
  apiKey: string;
}>;

type GenerationFailure = "questions" | "brief";
export type ClarificationOutcome = "none" | "answered" | "skipped";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function parseAssistantResponse(data: unknown): AssistantResponse {
  if (!data || typeof data !== "object") {
    throw new Error("The assistant returned an invalid response.");
  }

  const { answer, proposedValue } = data as {
    answer?: unknown;
    proposedValue?: unknown;
  };
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The assistant returned an invalid response.");
  }

  return { answer, proposedValue };
}

function briefOverview(brief: ProjectBrief): BriefOverview {
  return briefOverviewSchema.parse(brief);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeGeneratedName(name: string): string {
  return name.trim().normalize("NFKC").toLowerCase();
}

function nameGenerationQuestion(exclusions: string[]): string {
  const listedExclusions = exclusions
    .slice(-(MAX_DISMISSED_NAMES + MAX_NAME_GENERATION_ATTEMPTS))
    .map((name) => name.replace(/\s+/g, " ").trim().slice(0, 24));

  return [
    "Suggest one short, memorable alternative name suited to this brief.",
    "Never return any of these excluded names, including case or Unicode variants:",
    listedExclusions.length > 0 ? listedExclusions.join("; ") : "(none)",
  ].join("\n");
}

const emptyBrief: ProjectBrief = {
  appName: "",
  appSummary: "",
  targetUsers: [],
  coreFeatures: [],
  recommendedTechStack: {
    frontend: [],
    backend: [],
    ai: [],
  },
  pagesRoutes: [],
  dataModel: {
    entities: [],
    relationships: [],
  },
  buildPhases: {
    initialPhase: { name: "", goals: [], deliverables: [] },
    milestones: [],
  },
  risksEdgeCases: [],
  starterPrompt: "",
  markdownBrief: "",
};

export function usePlannerController(): PlannerViewProps {
  const [idea, setIdea] = React.useState("");
  const [baseUrl, setBaseUrlRaw] = useLocalStorage(STORAGE_KEY_BASE_URL, "");
  const [model, setModelRaw] = useLocalStorage(STORAGE_KEY_MODEL, "");
  const [apiKey, setApiKey] = React.useState("");
  const [brief, setBrief] = React.useState<ProjectBrief>(emptyBrief);
  const [status, setStatus] = React.useState<"idle" | "questions" | "generating" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState("");
  const [section, setSection] = React.useState<"overview" | "starter-prompt" | "formatting" | "done">("done");
  const [error, setError] = React.useState<string>();
  const [generationFailure, setGenerationFailure] = React.useState<GenerationFailure>();
  const [isUpdatingExports, setIsUpdatingExports] = React.useState(false);
  const [handoffFresh, setHandoffFresh] = React.useState(false);
  const [isUpdatingStarterPrompt, setIsUpdatingStarterPrompt] = React.useState(false);
  const [questions, setQuestions] = React.useState<ClarifyingQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = React.useState(false);
  const [clarificationOutcome, setClarificationOutcome] =
    React.useState<ClarificationOutcome>("none");
  const [regeneratingIndex, setRegeneratingIndex] = React.useState<number | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = React.useState(false);
  const [isGeneratingName, setIsGeneratingName] = React.useState(false);
  const [nameGenerationError, setNameGenerationError] = React.useState<string | null>(null);
  const [generatedNameSuggestion, setGeneratedNameSuggestion] = React.useState<string | null>(null);
  const [assistantStates, setAssistantStates] = React.useState<
    Partial<Record<ContentAssistantSection, SectionAssistantState>>
  >({});
  const abortRef = React.useRef<AbortController | null>(null);
  const briefRef = React.useRef(brief);
  const nameRequestRef = React.useRef(0);
  const nameSuggestionSourceRef = React.useRef<BriefOverview | null>(null);
  const dismissedGeneratedNamesRef = React.useRef<string[]>([]);
  const assistantRequestRefs = React.useRef<Partial<Record<ContentAssistantSection, number>>>({});
  const retrySnapshotRef = React.useRef<BriefSubmissionSnapshot | null>(null);
  const questionRunRef = React.useRef(0);
  const questionRunActiveRef = React.useRef(false);
  const briefRunRef = React.useRef(0);
  const briefRunActiveRef = React.useRef(false);
  const starterUpdateRequestRef = React.useRef(0);
  const starterUpdateControllerRef = React.useRef<AbortController | null>(null);
  const exportRequestRef = React.useRef(0);
  const exportControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    briefRef.current = brief;
  }, [brief]);

  const handleBriefChange = React.useCallback((nextBrief: ProjectBrief) => {
    briefRef.current = nextBrief;
    setBrief(nextBrief);
    setHandoffFresh(false);
  }, []);

  const handleBaseUrlChange = React.useCallback((value: string) => {
    setBaseUrlRaw(value);
  }, [setBaseUrlRaw]);

  const handleModelChange = React.useCallback((value: string) => {
    setModelRaw(value);
  }, [setModelRaw]);

  const handleGenerate = React.useCallback(async () => {
    if (
      questionRunActiveRef.current ||
      briefRunActiveRef.current ||
      retrySnapshotRef.current ||
      !idea.trim() ||
      !baseUrl.trim() ||
      !model.trim()
    ) return;

    const controller = new AbortController();
    const runId = questionRunRef.current + 1;
    questionRunRef.current = runId;
    questionRunActiveRef.current = true;
    abortRef.current = controller;
    retrySnapshotRef.current = null;

    setStatus("questions");
    setError(undefined);
    setGenerationFailure(undefined);
    setQuestions([]);
    setClarificationOutcome("none");
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
      if (questionRunRef.current !== runId) return;
      controller.signal.throwIfAborted();

      if (!response.ok) {
        const errData = await response.json();
        if (questionRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
        throw new Error(errData.error || "Failed to generate questions.");
      }

      const result = await response.json();
      if (questionRunRef.current !== runId) return;
      controller.signal.throwIfAborted();
      setQuestions(result.questions);
    } catch (err) {
      if (questionRunRef.current !== runId) return;
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
        setGenerationFailure("questions");
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      if (questionRunRef.current === runId) {
        questionRunActiveRef.current = false;
        setIsGeneratingQuestions(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }, [idea, baseUrl, model, apiKey]);

  const handleStop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const generateBrief = React.useCallback(async (snapshot: BriefSubmissionSnapshot) => {
    if (briefRunActiveRef.current) return;

    const controller = new AbortController();
    const runId = briefRunRef.current + 1;
    briefRunRef.current = runId;
    briefRunActiveRef.current = true;
    abortRef.current = controller;
    starterUpdateRequestRef.current += 1;
    starterUpdateControllerRef.current?.abort();
    starterUpdateControllerRef.current = null;
    exportRequestRef.current += 1;
    exportControllerRef.current?.abort();
    exportControllerRef.current = null;

    setStatus("generating");
    setHandoffFresh(false);
    setProgress("Connecting to provider…");
    setError(undefined);
    setGenerationFailure(undefined);
    nameRequestRef.current += 1;
    nameSuggestionSourceRef.current = null;
    dismissedGeneratedNamesRef.current = [];
    for (const sectionId of Object.keys(assistantRequestRefs.current) as ContentAssistantSection[]) {
      assistantRequestRefs.current[sectionId] =
        (assistantRequestRefs.current[sectionId] ?? 0) + 1;
    }
    briefRef.current = emptyBrief;
    setBrief(emptyBrief);
    setIsGeneratingName(false);
    setNameGenerationError(null);
    setGeneratedNameSuggestion(null);
    setAssistantStates({});
    setIsUpdatingStarterPrompt(false);
    setIsUpdatingExports(false);
    setSection("overview");

    try {
      // Step 1: Generate brief overview
      const overviewResponse = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: snapshot.idea,
          baseUrl: snapshot.baseUrl,
          model: snapshot.model,
          apiKey: snapshot.apiKey || undefined,
          answers: snapshot.answers,
          section: "overview",
        }),
        signal: controller.signal,
      });
      if (briefRunRef.current !== runId) return;
      controller.signal.throwIfAborted();

      if (!overviewResponse.ok) {
        const errData = await overviewResponse.json();
        if (briefRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
        throw new Error(errData.error || "Failed to generate brief overview.");
      }

      const overviewReader = overviewResponse.body?.getReader();
      if (!overviewReader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let overviewText = "";
      let lastOverviewApplied = "";

      while (true) {
        const { done, value } = await overviewReader.read();
        if (briefRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
        if (done) break;

        overviewText += decoder.decode(value, { stream: true });

        const { value: partial, state } = await parsePartialJson(overviewText);
        if (briefRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
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
            const nextBrief = {
              ...briefRef.current,
              ...(validated as Partial<ProjectBrief>),
            };
            briefRef.current = nextBrief;
            setBrief(nextBrief);
          } catch {
            // partial validation failed, skip this update
          }
        }
      }

      const { value: finalOverview, state: overviewState } = await parsePartialJson(overviewText);
      if (briefRunRef.current !== runId) return;
      controller.signal.throwIfAborted();
      if (overviewState !== "successful-parse" && overviewState !== "repaired-parse") {
        throw new Error(
          "The provider response could not be parsed as a valid BriefOverview. " +
          "Check that your model supports structured output."
        );
      }

      const validatedOverview = briefOverviewSchema.parse(finalOverview);
      const overviewBrief = { ...emptyBrief, ...validatedOverview };
      briefRef.current = overviewBrief;
      setBrief(overviewBrief);

      // Step 2: Generate starter prompt
      setSection("starter-prompt");
      setProgress("Generating starter prompt…");

      const starterResponse = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: snapshot.baseUrl,
          model: snapshot.model,
          apiKey: snapshot.apiKey || undefined,
          section: "starter-prompt",
          brief: validatedOverview,
        }),
        signal: controller.signal,
      });
      if (briefRunRef.current !== runId) return;
      controller.signal.throwIfAborted();

      if (!starterResponse.ok) {
        const errData = await starterResponse.json();
        if (briefRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
        throw new Error(errData.error || "Failed to generate starter prompt.");
      }

      const starterReader = starterResponse.body?.getReader();
      if (!starterReader) throw new Error("No response body.");

      let starterText = "";

      while (true) {
        const { done, value } = await starterReader.read();
        if (briefRunRef.current !== runId) return;
        controller.signal.throwIfAborted();
        if (done) break;
        starterText += decoder.decode(value, { stream: true });
      }

      const { value: finalStarter, state: starterState } = await parsePartialJson(starterText);
      if (briefRunRef.current !== runId) return;
      controller.signal.throwIfAborted();
      if (starterState !== "successful-parse" && starterState !== "repaired-parse") {
        throw new Error(
          "The starter prompt response could not be parsed. " +
          "Check that your model supports structured output."
        );
      }

      const validatedStarter = starterPromptSchema.parse(finalStarter);

      // Step 3: Generate markdown brief client-side
      setSection("formatting");
      setProgress("Formatting markdown brief…");

      const fullBrief = { ...validatedOverview, ...validatedStarter };
      const markdownBrief = generateMarkdownBrief(fullBrief);
      const completedBrief = { ...fullBrief, markdownBrief };
      if (briefRunRef.current !== runId) return;
      controller.signal.throwIfAborted();
      briefRef.current = completedBrief;
      setBrief(completedBrief);
      setHandoffFresh(true);

      setSection("done");
      setStatus("done");
      setProgress("");
      retrySnapshotRef.current = null;
    } catch (err) {
      if (briefRunRef.current !== runId) return;
      const wasAborted = controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError");
      setStatus("error");
      setProgress("");
      setGenerationFailure("brief");
      setError(
        wasAborted
          ? "Brief generation was stopped. You can retry from the beginning."
          : err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      if (briefRunRef.current === runId) {
        briefRunActiveRef.current = false;
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }, []);

  const handleConfirmQuestions = React.useCallback((answers: Record<string, string>) => {
    if (briefRunActiveRef.current) return;
    setClarificationOutcome("answered");
    const snapshot = Object.freeze({
      idea: idea.trim(),
      answers: Object.freeze(structuredClone(answers)),
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey,
    });
    retrySnapshotRef.current = snapshot;
    void generateBrief(snapshot);
  }, [apiKey, baseUrl, generateBrief, idea, model]);

  const handleSkipQuestions = React.useCallback(() => {
    if (briefRunActiveRef.current) return;
    setClarificationOutcome("skipped");
    const snapshot = Object.freeze({
      idea: idea.trim(),
      answers: undefined,
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey,
    });
    retrySnapshotRef.current = snapshot;
    void generateBrief(snapshot);
  }, [apiKey, baseUrl, generateBrief, idea, model]);

  const handleRetryBrief = React.useCallback(() => {
    const snapshot = retrySnapshotRef.current;
    if (!snapshot || briefRunActiveRef.current) return;
    void generateBrief(snapshot);
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
    if (!baseUrl.trim() || !model.trim() || !briefRef.current.appSummary) return;

    exportControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = exportRequestRef.current + 1;
    exportRequestRef.current = requestId;
    exportControllerRef.current = controller;
    const sourceBrief = structuredClone(briefRef.current);
    setIsUpdatingExports(true);
    setError(undefined);
    try {
      const response = await fetch("/api/brief/update-exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: sourceBrief,
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
        }),
        signal: controller.signal,
      });
      if (exportRequestRef.current !== requestId) return;
      controller.signal.throwIfAborted();

      const result = await readJson(response);
      if (exportRequestRef.current !== requestId) return;
      controller.signal.throwIfAborted();
      if (!response.ok) {
        throw new Error(responseError(result, "Failed to update exports."));
      }

      const validatedStarter = starterPromptSchema.parse(result);
      if (
        !result ||
        typeof result !== "object" ||
        !("markdownBrief" in result) ||
        typeof result.markdownBrief !== "string"
      ) {
        throw new Error("The export response was invalid.");
      }
      const markdownBrief = result.markdownBrief;

      if (exportRequestRef.current !== requestId) return;
      controller.signal.throwIfAborted();
      if (!sameValue(briefRef.current, sourceBrief)) {
        throw new Error(
          "The brief changed while exports were being regenerated. Update exports again."
        );
      }

      const next = { ...sourceBrief, ...validatedStarter, markdownBrief };
      briefRef.current = next;
      setBrief(next);
      setHandoffFresh(true);
    } catch (err) {
      if (exportRequestRef.current !== requestId || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to update exports.");
    } finally {
      if (exportRequestRef.current === requestId) {
        setIsUpdatingExports(false);
        if (exportControllerRef.current === controller) exportControllerRef.current = null;
      }
    }
  }, [baseUrl, model, apiKey]);

  const handleUpdateStarterPrompt = React.useCallback(async (feedback: string) => {
    if (!baseUrl.trim() || !model.trim() || !briefRef.current.appSummary) return;

    starterUpdateControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = starterUpdateRequestRef.current + 1;
    starterUpdateRequestRef.current = requestId;
    starterUpdateControllerRef.current = controller;
    const sourceBrief = structuredClone(briefRef.current);

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
          brief: sourceBrief,
          feedback,
        }),
        signal: controller.signal,
      });
      if (starterUpdateRequestRef.current !== requestId) return;
      controller.signal.throwIfAborted();

      if (!response.ok) {
        const errData = await response.json();
        if (starterUpdateRequestRef.current !== requestId) return;
        controller.signal.throwIfAborted();
        throw new Error(errData.error || "Failed to update starter prompt.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (starterUpdateRequestRef.current !== requestId) return;
        controller.signal.throwIfAborted();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }

      const { value: final, state } = await parsePartialJson(text);
      if (starterUpdateRequestRef.current !== requestId) return;
      controller.signal.throwIfAborted();
      if (state === "successful-parse" || state === "repaired-parse") {
        const validated = starterPromptSchema.parse(final);
        if (!sameValue(briefRef.current, sourceBrief)) {
          throw new Error(
            "The brief changed while the starter prompt was updating. Update it again."
          );
        }
        const next = { ...sourceBrief, ...validated };
        briefRef.current = next;
        setBrief(next);
        setHandoffFresh(false);
      } else {
        throw new Error("The starter prompt response could not be parsed.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Aborted, do nothing
      } else if (starterUpdateRequestRef.current === requestId) {
        setError(err instanceof Error ? err.message : "Failed to update starter prompt.");
      }
    } finally {
      if (starterUpdateRequestRef.current === requestId) {
        setIsUpdatingStarterPrompt(false);
        if (starterUpdateControllerRef.current === controller) {
          starterUpdateControllerRef.current = null;
        }
      }
    }
  }, [baseUrl, model, apiKey]);

  const handleCommitName = React.useCallback((name: string) => {
    nameRequestRef.current += 1;
    nameSuggestionSourceRef.current = null;
    setIsGeneratingName(false);
    setGeneratedNameSuggestion(null);

    const committedName = name.trim();
    if (!committedName) {
      setNameGenerationError("App name cannot be empty.");
      return;
    }

    setNameGenerationError(null);
    setBrief((current) => {
      const next = renameProjectBrief(current, committedName);
      briefRef.current = next;
      return next;
    });
  }, []);

  const handleGenerateName = React.useCallback(async () => {
    if (!baseUrl.trim() || !model.trim()) {
      setNameGenerationError("Provider URL and model are required.");
      return;
    }

    const requestId = nameRequestRef.current + 1;
    const sourceOverview = structuredClone(briefOverview(briefRef.current));
    nameRequestRef.current = requestId;
    nameSuggestionSourceRef.current = null;
    setIsGeneratingName(true);
    setNameGenerationError(null);
    setGeneratedNameSuggestion(null);

    const requestExclusions = [...dismissedGeneratedNamesRef.current];

    try {
      for (let attempt = 0; attempt < MAX_NAME_GENERATION_ATTEMPTS; attempt += 1) {
        const response = await fetch("/api/brief/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: baseUrl.trim(),
            model: model.trim(),
            apiKey: apiKey || undefined,
            section: "appName",
            question: nameGenerationQuestion(requestExclusions),
            brief: sourceOverview,
          }),
        });
        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(responseError(data, "Failed to generate an app name."));
        }

        const result = parseAssistantResponse(data);
        const parsedName = assistantSectionSchemas.appName.safeParse(result.proposedValue);
        if (!parsedName.success || !parsedName.data.trim()) {
          throw new Error("The assistant did not provide a usable app name.");
        }

        if (nameRequestRef.current !== requestId) return;
        if (!sameValue(briefOverview(briefRef.current), sourceOverview)) {
          throw new Error(
            "The brief changed while the name was being generated. Generate a new suggestion."
          );
        }

        const candidate = parsedName.data.trim();
        const normalizedCandidate = normalizeGeneratedName(candidate);
        if (requestExclusions.some((name) => normalizeGeneratedName(name) === normalizedCandidate)) {
          requestExclusions.push(candidate);
          continue;
        }

        nameSuggestionSourceRef.current = sourceOverview;
        setGeneratedNameSuggestion(candidate);
        return;
      }

      throw new Error(
        "The assistant repeatedly returned a dismissed app name. Try generating another suggestion."
      );
    } catch (err) {
      if (nameRequestRef.current === requestId) {
        setNameGenerationError(
          err instanceof Error ? err.message : "Failed to generate an app name."
        );
      }
    } finally {
      if (nameRequestRef.current === requestId) setIsGeneratingName(false);
    }
  }, [apiKey, baseUrl, model]);

  const handleUseGeneratedName = React.useCallback((name: string) => {
    const sourceOverview = nameSuggestionSourceRef.current;
    if (
      !sourceOverview ||
      !sameValue(briefOverview(briefRef.current), sourceOverview)
    ) {
      nameRequestRef.current += 1;
      nameSuggestionSourceRef.current = null;
      setIsGeneratingName(false);
      setGeneratedNameSuggestion(null);
      setNameGenerationError(
        "The brief changed after this name was suggested. Generate a new suggestion."
      );
      return;
    }

    handleCommitName(name);
  }, [handleCommitName]);

  const handleDismissGeneratedName = React.useCallback(() => {
    const dismissedName = generatedNameSuggestion?.trim();
    if (dismissedName) {
      const normalizedDismissedName = normalizeGeneratedName(dismissedName);
      dismissedGeneratedNamesRef.current = [
        ...dismissedGeneratedNamesRef.current.filter(
          (name) => normalizeGeneratedName(name) !== normalizedDismissedName
        ),
        dismissedName,
      ].slice(-MAX_DISMISSED_NAMES);
    }
    nameRequestRef.current += 1;
    nameSuggestionSourceRef.current = null;
    setIsGeneratingName(false);
    setNameGenerationError(null);
    setGeneratedNameSuggestion(null);
  }, [generatedNameSuggestion]);

  const handleAskAssistant = React.useCallback(async (
    sectionId: ContentAssistantSection,
    question: string
  ) => {
    if (!baseUrl.trim() || !model.trim()) {
      setAssistantStates((current) => ({
        ...current,
        [sectionId]: {
          isLoading: false,
          error: "Provider URL and model are required.",
          answer: null,
          canApply: false,
        },
      }));
      return;
    }

    const overview = briefOverview(briefRef.current);
    const sourceSnapshot = structuredClone(overview[sectionId]);
    const requestId = (assistantRequestRefs.current[sectionId] ?? 0) + 1;
    assistantRequestRefs.current[sectionId] = requestId;
    setAssistantStates((current) => ({
      ...current,
      [sectionId]: {
        isLoading: true,
        error: null,
        answer: null,
        canApply: false,
        sourceSnapshot,
      },
    }));

    try {
      const response = await fetch("/api/brief/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey || undefined,
          section: sectionId,
          question,
          brief: overview,
        }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(responseError(data, "Failed to assist with this section."));
      }

      const result = parseAssistantResponse(data);
      if (assistantRequestRefs.current[sectionId] !== requestId) return;

      setAssistantStates((current) => ({
        ...current,
        [sectionId]: {
          isLoading: false,
          error: null,
          answer: result.answer,
          canApply: result.proposedValue != null,
          proposedValue: result.proposedValue,
          sourceSnapshot,
        },
      }));
    } catch (err) {
      if (assistantRequestRefs.current[sectionId] !== requestId) return;

      setAssistantStates((current) => ({
        ...current,
        [sectionId]: {
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to assist with this section.",
          answer: null,
          canApply: false,
          sourceSnapshot,
        },
      }));
    }
  }, [apiKey, baseUrl, model]);

  const handleApplyAssistantSuggestion = React.useCallback((
    sectionId: ContentAssistantSection
  ) => {
    const assistantState = assistantStates[sectionId];
    if (!assistantState || assistantState.proposedValue == null) return;

    const parsed = assistantSectionSchemas[sectionId].safeParse(
      assistantState.proposedValue
    );
    if (!parsed.success) {
      setAssistantStates((current) => ({
        ...current,
        [sectionId]: {
          ...current[sectionId],
          isLoading: false,
          error: "The suggestion is invalid and cannot be applied.",
          canApply: false,
        },
      }));
      return;
    }

    const staleMessage = "This section changed after the suggestion was requested. Ask again before applying it.";
    if (!sameValue(briefRef.current[sectionId], assistantState.sourceSnapshot)) {
      setAssistantStates((current) => ({
        ...current,
        [sectionId]: {
          ...current[sectionId],
          isLoading: false,
          error: staleMessage,
          canApply: false,
        },
      }));
      return;
    }

    const nextBrief = {
      ...briefRef.current,
      [sectionId]: parsed.data,
    } as ProjectBrief;
    briefRef.current = nextBrief;
    setBrief(nextBrief);
    setHandoffFresh(false);
    setAssistantStates((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  }, [assistantStates]);

  const handleDismissAssistant = React.useCallback((sectionId: ContentAssistantSection) => {
    assistantRequestRefs.current[sectionId] =
      (assistantRequestRefs.current[sectionId] ?? 0) + 1;
    setAssistantStates((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  }, []);

  const handleReset = React.useCallback(() => {
    abortRef.current?.abort();
    questionRunRef.current += 1;
    questionRunActiveRef.current = false;
    briefRunRef.current += 1;
    briefRunActiveRef.current = false;
    retrySnapshotRef.current = null;
    starterUpdateRequestRef.current += 1;
    starterUpdateControllerRef.current?.abort();
    starterUpdateControllerRef.current = null;
    exportRequestRef.current += 1;
    exportControllerRef.current?.abort();
    exportControllerRef.current = null;
    nameRequestRef.current += 1;
    nameSuggestionSourceRef.current = null;
    dismissedGeneratedNamesRef.current = [];
    for (const sectionId of Object.keys(assistantRequestRefs.current) as ContentAssistantSection[]) {
      assistantRequestRefs.current[sectionId] =
        (assistantRequestRefs.current[sectionId] ?? 0) + 1;
    }
    briefRef.current = emptyBrief;
    setBrief(emptyBrief);
    setStatus("idle");
    setProgress("");
    setSection("done");
    setError(undefined);
    setGenerationFailure(undefined);
    setQuestions([]);
    setClarificationOutcome("none");
    setIsGeneratingQuestions(false);
    setRegeneratingIndex(null);
    setIsAddingQuestion(false);
    setIsGeneratingName(false);
    setIsUpdatingStarterPrompt(false);
    setIsUpdatingExports(false);
    setHandoffFresh(false);
    setNameGenerationError(null);
    setGeneratedNameSuggestion(null);
    setAssistantStates({});
  }, []);

  const hasBrief = brief.appSummary !== "";
  const hasRetryableBriefError =
    status === "error" && generationFailure === "brief" && retrySnapshotRef.current !== null;

  return {
    idea,
    onIdeaChange: setIdea,
    baseUrl,
    onBaseUrlChange: handleBaseUrlChange,
    model,
    onModelChange: handleModelChange,
    apiKey,
    onApiKeyChange: setApiKey,
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
    onStop: handleStop,
    onGenerate: handleGenerate,
    onReset: handleReset,
    onRetryBrief: handleRetryBrief,
    onConfirmQuestions: handleConfirmQuestions,
    onSkipQuestions: handleSkipQuestions,
    onRegenerateQuestion: handleRegenerateQuestion,
    onAddQuestion: handleAddQuestion,
    onBriefChange: handleBriefChange,
    onUpdateExports: handleUpdateExports,
    onUpdateStarterPrompt: handleUpdateStarterPrompt,
    onCommitName: handleCommitName,
    onGenerateName: handleGenerateName,
    onUseGeneratedName: handleUseGeneratedName,
    onDismissGeneratedName: handleDismissGeneratedName,
    onAskAssistant: handleAskAssistant,
    onApplyAssistantSuggestion: handleApplyAssistantSuggestion,
    onDismissAssistant: handleDismissAssistant,
  };
}
