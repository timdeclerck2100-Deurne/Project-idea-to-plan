import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSelector } from "@/components/theme-selector";
import "@/app/globals.css";

test("moves focus into the theme dialog and restores it on Escape", async () => {
  localStorage.clear();
  const screen = await render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  );
  const trigger = screen.getByRole("button", { name: /choose theme/i });

  await userEvent.tab();
  await expect.element(trigger).toHaveFocus();
  expect(getComputedStyle(trigger.element()).boxShadow).not.toBe("none");

  await trigger.click();
  const selectedOption = screen.getByRole("button", {
    name: /Blueprint.*original blueprint aesthetic/i,
  });
  await expect.element(selectedOption).toHaveFocus();
  expect(getComputedStyle(selectedOption.element()).boxShadow).not.toBe("none");

  await userEvent.keyboard("{Escape}");
  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});
