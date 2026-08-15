import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownExportCard } from "@/components/planner/markdown-export-card";
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

describe("MarkdownExportCard", () => {
  it("copies the markdown and resets its feedback after two seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<MarkdownExportCard markdown={completeProjectBrief.markdownBrief} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(completeProjectBrief.markdownBrief);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_000));

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("downloads the markdown with the supplied filename and MIME type", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:markdown-export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    render(
      <MarkdownExportCard
        markdown={completeProjectBrief.markdownBrief}
        filename="fieldnote-project-brief.md"
      />
    );

    const anchor = document.createElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValueOnce(anchor);

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(await readBlob(blob)).toBe(completeProjectBrief.markdownBrief);
    expect(anchor.download).toBe("fieldnote-project-brief.md");
    expect(anchor.href).toBe("blob:markdown-export");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:markdown-export");
    expect(document.body).not.toContainElement(anchor);
  });

  it("announces a recoverable clipboard failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard unavailable"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<MarkdownExportCard markdown={completeProjectBrief.markdownBrief} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Could not copy. Try again.");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});
