import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderSettings } from "@/components/planner/provider-settings";

describe("ProviderSettings", () => {
  it("provides stable field metadata and input hints", () => {
    render(
      <ProviderSettings
        baseUrl="https://api.example.com/v1"
        onBaseUrlChange={vi.fn()}
        model="gpt-4o"
        onModelChange={vi.fn()}
        apiKey="secret-key"
        onApiKeyChange={vi.fn()}
      />
    );

    const baseUrl = screen.getByRole("textbox", { name: "Base URL" });
    expect(baseUrl).toHaveAttribute("id", "baseUrl");
    expect(baseUrl).toHaveAttribute("name", "baseUrl");
    expect(baseUrl).toHaveAttribute("type", "url");
    expect(baseUrl).toHaveAttribute("inputmode", "url");
    expect(baseUrl).toHaveAttribute("autocomplete", "off");
    expect(baseUrl).toHaveAttribute("spellcheck", "false");

    const model = screen.getByRole("textbox", { name: "Model" });
    expect(model).toHaveAttribute("id", "model");
    expect(model).toHaveAttribute("name", "model");
    expect(model).toHaveAttribute("autocomplete", "off");
    expect(model).toHaveAttribute("spellcheck", "false");

    const apiKey = screen.getByLabelText(/API Key/);
    expect(apiKey).toHaveAttribute("id", "apiKey");
    expect(apiKey).toHaveAttribute("name", "apiKey");
    expect(apiKey).toHaveAttribute("type", "password");
    expect(apiKey).toHaveAttribute("autocomplete", "off");
    expect(apiKey).toHaveAttribute("spellcheck", "false");
    expect(apiKey).toHaveAttribute("placeholder", "sk-…");
  });
});
