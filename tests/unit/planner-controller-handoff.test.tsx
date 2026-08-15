import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlannerController } from "@/hooks/use-planner-controller";
import { briefOverviewSchema } from "@/lib/brief-schema";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function configure(result: { current: ReturnType<typeof usePlannerController> }) {
  act(() => {
    result.current.onIdeaChange("A research workspace");
    result.current.onBaseUrlChange("https://api.example.com/v1");
    result.current.onModelChange("test-model");
  });
  await waitFor(() => {
    expect(result.current.idea).toBe("A research workspace");
    expect(result.current.baseUrl).toBe("https://api.example.com/v1");
    expect(result.current.model).toBe("test-model");
  });
}

describe("planner handoff freshness", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    const storedValues = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key),
      clear: () => storedValues.clear(),
    });
  });

  it("becomes fresh only after overview, starter prompt, and Markdown generation finish", async () => {
    const overview = briefOverviewSchema.parse(completeProjectBrief);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ questions: [] }))
      .mockResolvedValueOnce(jsonResponse(overview))
      .mockResolvedValueOnce(jsonResponse({ starterPrompt: "Build the generated project." }));
    const { result } = renderHook(() => usePlannerController());
    await configure(result);

    act(() => {
      result.current.onGenerate();
    });
    await waitFor(() => expect(result.current.status).toBe("questions"));
    expect(result.current.handoffFresh).toBe(false);

    act(() => {
      result.current.onSkipQuestions();
    });
    expect(result.current.handoffFresh).toBe(false);
    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.handoffFresh).toBe(true);
    expect(result.current.brief.markdownBrief).toContain("Fieldnote");

    act(() => {
      result.current.onReset();
    });
    expect(result.current.handoffFresh).toBe(false);
  });

  it("rejects stale export responses and marks only an applied guarded response fresh", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => usePlannerController());
    await configure(result);
    act(() => {
      result.current.onBriefChange(completeProjectBrief);
    });

    act(() => {
      result.current.onUpdateExports();
    });
    act(() =>
      result.current.onBriefChange({
        ...completeProjectBrief,
        appSummary: "Changed while exports were running.",
      }),
    );
    first.resolve(
      jsonResponse({ starterPrompt: "Stale prompt", markdownBrief: "# Stale" }),
    );
    await waitFor(() => expect(result.current.isUpdatingExports).toBe(false));
    expect(result.current.handoffFresh).toBe(false);
    expect(result.current.brief.appSummary).toBe("Changed while exports were running.");
    expect(result.current.error).toMatch(/brief changed/i);

    act(() => {
      result.current.onUpdateExports();
    });
    second.resolve(
      jsonResponse({
        starterPrompt: "Build Fieldnote now",
        markdownBrief: "# Fieldnote Current",
      }),
    );
    await waitFor(() => expect(result.current.handoffFresh).toBe(true));
    expect(result.current.brief.markdownBrief).toBe("# Fieldnote Current");

    act(() => {
      result.current.onCommitName("Research Atlas");
    });
    expect(result.current.handoffFresh).toBe(true);
    expect(result.current.brief.markdownBrief).toBe("# Research Atlas Current");
    expect(result.current.brief.starterPrompt).toBe("Build Research Atlas now");

    act(() =>
      result.current.onBriefChange({
        ...result.current.brief,
        appSummary: "An ordinary upstream edit.",
      }),
    );
    expect(result.current.handoffFresh).toBe(false);
  });

  it("marks starter-only and successfully applied assistant updates stale", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({ starterPrompt: "Current starter", markdownBrief: "# Current" }),
      )
      .mockResolvedValueOnce(jsonResponse({ starterPrompt: "Updated starter only" }))
      .mockResolvedValueOnce(
        jsonResponse({ starterPrompt: "Refreshed starter", markdownBrief: "# Refreshed" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          answer: "Use a tighter summary.",
          proposedValue: "A tighter research workspace.",
        }),
      );
    const { result } = renderHook(() => usePlannerController());
    await configure(result);
    act(() => {
      result.current.onBriefChange(completeProjectBrief);
    });

    act(() => {
      result.current.onUpdateExports();
    });
    await waitFor(() => expect(result.current.handoffFresh).toBe(true));

    act(() => {
      result.current.onUpdateStarterPrompt("Make it shorter");
    });
    await waitFor(() => expect(result.current.brief.starterPrompt).toBe("Updated starter only"));
    expect(result.current.handoffFresh).toBe(false);
    expect(result.current.brief.markdownBrief).toBe("# Current");

    act(() => {
      result.current.onUpdateExports();
    });
    await waitFor(() => expect(result.current.handoffFresh).toBe(true));

    act(() => {
      result.current.onAskAssistant("appSummary", "Make it tighter");
    });
    await waitFor(() => expect(result.current.assistantStates.appSummary?.canApply).toBe(true));
    act(() => {
      result.current.onApplyAssistantSuggestion("appSummary");
    });
    expect(result.current.brief.appSummary).toBe("A tighter research workspace.");
    expect(result.current.handoffFresh).toBe(false);
  });
});
