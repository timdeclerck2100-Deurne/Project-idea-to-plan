import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/planner/brief-workspace", () => ({
  BriefWorkspace: () => null,
}));

import Home from "@/app/page";

describe("planner workflow", () => {
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

  it("enables Generate only after every required field is filled", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const generate = screen.getByRole("button", { name: "Generate" });
    expect(generate).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "App Idea" }), "A tool library");
    expect(generate).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Base URL" }), "https://api.example.com/v1");
    expect(generate).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Model" }), "test-model");
    expect(generate).toBeEnabled();
    expect(screen.getByLabelText(/API Key/)).toHaveAccessibleDescription(
      "Optional. Kept in memory only."
    );
  });

  it("omits an empty API key and renders returned clarifying questions", async () => {
    const questions = [
      {
        question: "Who can borrow tools?",
        options: [
          { label: "Members", description: "Only registered members." },
          { label: "Anyone", description: "Open to the public." },
        ],
      },
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ questions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByRole("textbox", { name: "App Idea" }), "  A tool library  ");
    await user.type(
      screen.getByRole("textbox", { name: "Base URL" }),
      "  https://api.example.com/v1  "
    );
    await user.type(screen.getByRole("textbox", { name: "Model" }), "  test-model  ");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByText("Who can borrow tools?")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Members/ })).toBeInTheDocument();
    expect(screen.getByText("Only registered members.")).toBeVisible();
    expect(screen.getByText("Open to the public.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/brief/questions");
    expect(JSON.parse(String(init?.body))).toEqual({
      idea: "A tool library",
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
    });
  });
});
