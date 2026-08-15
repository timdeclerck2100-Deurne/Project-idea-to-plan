"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface IdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function IdeaInput({ value, onChange, disabled }: IdeaInputProps) {
  return (
    <div className="flex h-full flex-col gap-1">
      <Label htmlFor="idea" className="micro-label">
        App Idea
      </Label>
      <Textarea
        id="idea"
        name="idea"
        autoComplete="off"
        placeholder="Describe your app idea…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[80px] flex-1 resize-none"
      />
    </div>
  );
}
