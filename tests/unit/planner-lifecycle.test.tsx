import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/planner/brief-workspace", () => ({
  BriefWorkspace: () => null,
}));

import Home from "@/app/page";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const question = {
  question: "Who will use the tool?",
  options: [
    { label: "Teams", description: "Internal product teams." },
    { label: "Individuals", description: "Independent users." },
  ],
};

function questionResponse(status = 200, body: unknown = { questions: [question] }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillPlanner(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "App Idea" }), "A planning tool");
  await user.type(
    screen.getByRole("textbox", { name: "Base URL" }),
    "https://api.example.com/v1"
  );
  await user.type(screen.getByRole("textbox", { name: "Model" }), "test-model");
  await user.type(screen.getByLabelText(/API Key/), "secret-key");
}

function mockDeferredFetch(request: Deferred<Response>, rejectOnAbort: boolean) {
  let signal: AbortSignal | undefined;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
    signal = init?.signal ?? undefined;
    const requestSignal = signal;
    if (!rejectOnAbort || !requestSignal) return request.promise;

    return new Promise<Response>((resolve, reject) => {
      const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
      if (requestSignal.aborted) {
        abort();
        return;
      }
      requestSignal.addEventListener("abort", abort, { once: true });
      request.promise.then(resolve, reject);
    });
  });

  return { fetchMock, getSignal: () => signal };
}

describe("planner question lifecycle", () => {
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

  it("reset preserves the idea and provider fields after questions load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(questionResponse());
    const user = userEvent.setup();
    render(<Home />);

    await fillPlanner(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByText(question.question)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset planner" }));

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText(question.question)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "App Idea" })).toHaveValue("A planning tool");
    expect(screen.getByRole("textbox", { name: "Base URL" })).toHaveValue(
      "https://api.example.com/v1"
    );
    expect(screen.getByRole("textbox", { name: "Model" })).toHaveValue("test-model");
    expect(screen.getByLabelText(/API Key/)).toHaveValue("secret-key");
  });

  it("Stop during question generation aborts the request and returns to idle", async () => {
    const request = deferred<Response>();
    const { getSignal } = mockDeferredFetch(request, true);
    const user = userEvent.setup();
    render(<Home />);

    await fillPlanner(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(screen.getByText("Thinking of questions…")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop" }));

    await waitFor(() => expect(screen.getByText("Ready")).toBeInTheDocument());
    expect(getSignal()?.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("a failed question request leaves the planner usable for retry", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    const requests = [firstRequest, secondRequest];
    let requestIndex = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const request = requests[requestIndex++];
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation was aborted.", "AbortError")),
          { once: true }
        );
        request.promise.then(resolve, reject);
      });
    });
    const user = userEvent.setup();
    render(<Home />);

    await fillPlanner(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    firstRequest.resolve(questionResponse(503, { error: "Provider unavailable" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "App Idea" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Base URL" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    secondRequest.resolve(questionResponse());
    expect(await screen.findByText(question.question)).toBeInTheDocument();
    expect(requestIndex).toBe(2);
  });

  it("reset prevents a late question response from rendering", async () => {
    const request = deferred<Response>();
    const { getSignal } = mockDeferredFetch(request, false);
    const user = userEvent.setup();
    render(<Home />);

    await fillPlanner(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Reset planner" }));
    expect(getSignal()?.aborted).toBe(true);

    request.resolve(questionResponse());

    await waitFor(() => expect(screen.getByText("Ready")).toBeInTheDocument());
    expect(screen.queryByText(question.question)).not.toBeInTheDocument();
    expect(screen.queryByText("Thinking of questions…")).not.toBeInTheDocument();
  });

  it("Stop prevents a late response from rendering even when fetch resolves after abort", async () => {
    const request = deferred<Response>();
    const { getSignal } = mockDeferredFetch(request, false);
    const user = userEvent.setup();
    render(<Home />);

    await fillPlanner(user);
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(getSignal()?.aborted).toBe(true);

    request.resolve(questionResponse());

    await waitFor(() =>
      expect(screen.queryByText("Thinking of questions…")).not.toBeInTheDocument()
    );
    expect(screen.queryByText(question.question)).not.toBeInTheDocument();
  });

  it.each(["answered", "skipped"] as const)(
    "resets the %s clarification outcome",
    async (outcome) => {
      const briefRequest = deferred<Response>();
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(questionResponse())
        .mockImplementationOnce(() => briefRequest.promise);
      const user = userEvent.setup();
      render(<Home />);

      await fillPlanner(user);
      await user.click(screen.getByRole("button", { name: "Generate" }));
      expect(await screen.findByText(question.question)).toBeInTheDocument();

      if (outcome === "answered") {
        await user.click(screen.getByRole("radio", { name: /Teams/ }));
        await user.click(screen.getByRole("button", { name: "Generate brief" }));
      } else {
        await user.click(screen.getByRole("button", { name: "Skip questions" }));
      }

      expect(screen.getByText(outcome === "answered" ? "Answered" : "Skipped")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Reset planner" }));

      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.queryByText(outcome === "answered" ? "Answered" : "Skipped")).not.toBeInTheDocument();
    }
  );
});
