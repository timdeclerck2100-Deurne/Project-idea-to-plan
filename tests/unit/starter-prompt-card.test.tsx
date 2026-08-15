import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StarterPromptCard } from "@/components/planner/starter-prompt-card";
import { completeProjectBrief } from "@/tests/fixtures/project-brief";

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("StarterPromptCard", () => {
  it("copies the starter prompt and resets its feedback after two seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<StarterPromptCard prompt={completeProjectBrief.starterPrompt} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(completeProjectBrief.starterPrompt);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_000));

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("downloads the starter prompt with the supplied filename and MIME type", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:starter-prompt");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    render(
      <StarterPromptCard
        prompt={completeProjectBrief.starterPrompt}
        filename="fieldnote-starter-prompt.txt"
      />
    );

    const anchor = document.createElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValueOnce(anchor);

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(await readBlob(blob)).toBe(completeProjectBrief.starterPrompt);
    expect(anchor.download).toBe("fieldnote-starter-prompt.txt");
    expect(anchor.href).toBe("blob:starter-prompt");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:starter-prompt");
    expect(document.body).not.toContainElement(anchor);
  });

  it("trims feedback before updating and resets the feedback form", () => {
    const onUpdate = vi.fn();
    render(
      <StarterPromptCard
        prompt={completeProjectBrief.starterPrompt}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    const feedback = screen.getByPlaceholderText(
      "Describe what you want changed..."
    );
    const apply = screen.getByRole("button", { name: "Apply" });

    expect(apply).toBeDisabled();
    fireEvent.change(feedback, { target: { value: "   Add authentication details.   " } });
    expect(apply).toBeEnabled();
    fireEvent.click(apply);

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith("Add authentication details.");
    expect(
      screen.queryByPlaceholderText("Describe what you want changed...")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(screen.getByPlaceholderText("Describe what you want changed...")).toHaveValue("");
  });

  it("returns focus to Update after applying or cancelling feedback", () => {
    render(
      <StarterPromptCard
        prompt={completeProjectBrief.starterPrompt}
        onUpdate={vi.fn()}
      />
    );

    const update = screen.getByRole("button", { name: "Update" });
    fireEvent.click(update);
    fireEvent.change(screen.getByRole("textbox", { name: "Starter prompt update feedback" }), {
      target: { value: "Add setup details" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(update).toHaveFocus();

    fireEvent.click(update);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(update).toHaveFocus();
  });

  it("uses unique feedback panel IDs for reusable instances", () => {
    render(
      <>
        <StarterPromptCard prompt="First" onUpdate={vi.fn()} />
        <StarterPromptCard prompt="Second" onUpdate={vi.fn()} />
      </>
    );

    const updates = screen.getAllByRole("button", { name: "Update" });
    expect(updates[0].getAttribute("aria-controls")).toBeTruthy();
    expect(updates[0]).not.toHaveAttribute(
      "aria-controls",
      updates[1].getAttribute("aria-controls")
    );
  });

  it("announces a recoverable clipboard failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard unavailable"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<StarterPromptCard prompt={completeProjectBrief.starterPrompt} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Could not copy. Try again.");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});
