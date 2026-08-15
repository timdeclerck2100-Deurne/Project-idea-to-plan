import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSelector } from "@/components/theme-selector";
import { THEME_STORAGE_KEY } from "@/lib/themes";

function renderSelector() {
  return render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  );
}

const storedValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storedValues.size;
  },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => storedValues.delete(key),
  setItem: (key, value) => storedValues.set(key, String(value)),
};

describe("ThemeSelector", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens as a labelled disclosure dialog and focuses the selected option", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "golden-hour");
    const user = userEvent.setup();
    renderSelector();

    const trigger = screen.getByRole("button", { name: /choose theme/i });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Theme" });
    const selected = dialog.querySelector<HTMLButtonElement>(
      '[data-theme-option][data-theme-id="golden-hour"]',
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toHaveAttribute("aria-modal", "false");
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).toHaveFocus();
  });

  it("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSelector();
    const trigger = screen.getByRole("button", { name: /choose theme/i });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("restores trigger focus after an outside click or theme selection", async () => {
    const user = userEvent.setup();
    renderSelector();
    const trigger = screen.getByRole("button", { name: /choose theme/i });

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: /Ocean Depths.*maritime theme/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName(/current theme: Ocean Depths/i);
  });

  it("clamps and recalculates its panel within the viewport", async () => {
    const user = userEvent.setup();
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(300);
    const offsetWidth = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(320);
    vi.stubGlobal("innerWidth", 360);
    vi.stubGlobal("innerHeight", 240);
    renderSelector();
    const trigger = screen.getByRole("button", { name: /choose theme/i });
    const rect = vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 220,
      height: 44,
      left: 300,
      right: 355,
      top: 176,
      width: 55,
      x: 300,
      y: 176,
      toJSON: () => ({}),
    });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({ top: "8px", right: "8px", maxHeight: "224px" });

    rect.mockReturnValue({
      bottom: 20,
      height: 12,
      left: 430,
      right: 490,
      top: 8,
      width: 60,
      x: 430,
      y: 8,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("innerHeight", 400);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(dialog).toHaveStyle({ top: "28px", right: "10px", maxHeight: "384px" });

    rect.mockReturnValue({
      bottom: -20,
      height: 12,
      left: 430,
      right: 490,
      top: -32,
      width: 60,
      x: 430,
      y: -32,
      toJSON: () => ({}),
    });
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(dialog).toHaveStyle({ top: "8px", right: "10px", maxHeight: "384px" });

    scrollHeight.mockRestore();
    offsetWidth.mockRestore();
  });
});
