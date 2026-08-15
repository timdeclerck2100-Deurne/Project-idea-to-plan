"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProviderSettingsProps {
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  disabled?: boolean;
}

export function ProviderSettings({
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  disabled,
}: ProviderSettingsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
        <Label htmlFor="baseUrl" className="micro-label">
          Base URL
        </Label>
        <Input
          id="baseUrl"
          name="baseUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://api.example.com/v1"
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="model" className="micro-label">
          Model
        </Label>
        <Input
          id="model"
          name="model"
          autoComplete="off"
          spellCheck={false}
          placeholder="gpt-4o"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor="apiKey" className="micro-label">
          API Key <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="apiKey-help"
          placeholder="sk-…"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={disabled}
        />
        <p id="apiKey-help" className="text-sm leading-snug text-muted-foreground">
          Optional. Kept in memory only.
        </p>
      </div>
    </div>
  );
}
