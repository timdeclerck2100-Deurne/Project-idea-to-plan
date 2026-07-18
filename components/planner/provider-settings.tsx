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
    <div className="flex gap-2">
      <div className="flex-1 space-y-1 min-w-0">
        <Label htmlFor="baseUrl" className="micro-label">
          Base URL
        </Label>
        <Input
          id="baseUrl"
          placeholder="https://api.example.com/v1"
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <Label htmlFor="model" className="micro-label">
          Model
        </Label>
        <Input
          id="model"
          placeholder="gpt-4o"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <Label htmlFor="apiKey" className="micro-label">
          API Key <span className="text-muted-foreground">(opt)</span>
        </Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
