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
    <div className="space-y-1 h-full flex flex-col">
      <Label htmlFor="idea" className="micro-label">
        App Idea
      </Label>
      <Textarea
        id="idea"
        placeholder="Describe your app idea..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 min-h-[80px] resize-none text-sm"
      />
    </div>
  );
}
