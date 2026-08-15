"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Download, Loader2, Pencil } from "lucide-react";

interface StarterPromptCardProps {
  prompt: string;
  filename?: string;
  isUpdating?: boolean;
  onUpdate?: (feedback: string) => void;
}

export function StarterPromptCard({
  prompt,
  filename = "starter-prompt.txt",
  isUpdating = false,
  onUpdate,
}: StarterPromptCardProps) {
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const id = React.useId();
  const feedbackId = `${id}-feedback`;
  const copyStatusId = `${id}-copy-status`;
  const updateButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (feedback.trim() && onUpdate) {
      onUpdate(feedback.trim());
      setFeedback("");
      setShowFeedback(false);
      updateButtonRef.current?.focus();
    }
  };

  const handleCancel = () => {
    setFeedback("");
    setShowFeedback(false);
    updateButtonRef.current?.focus();
  };

  return (
    <Card className="paper-card min-w-0 rounded-xl p-3">
      <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="micro-label !text-sm">Export</div>
          <h3 className="text-base font-medium text-foreground leading-tight text-pretty">Starter Prompt</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-describedby={copyStatus === "idle" ? undefined : copyStatusId}
          >
            {copyStatus === "copied" ? (
              <Check data-icon="inline-start" className="text-accent" />
            ) : (
              <Copy data-icon="inline-start" />
            )}
            {copyStatus === "copied" ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
            <Download data-icon="inline-start" />
            Download
          </Button>
          {onUpdate && (
            <Button
              ref={updateButtonRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFeedback(!showFeedback)}
              disabled={isUpdating}
              aria-expanded={showFeedback}
              aria-controls={feedbackId}
            >
              <Pencil data-icon="inline-start" />
              Update
            </Button>
          )}
        </div>
      </div>

      <p
        id={copyStatusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={copyStatus === "error" ? "mb-2 text-base text-destructive" : "sr-only"}
      >
        {copyStatus === "copied"
          ? "Starter prompt copied to clipboard."
          : copyStatus === "error"
            ? "Could not copy. Try again."
            : ""}
      </p>

      {showFeedback && (
        <div id={feedbackId} className="mb-2 flex flex-col gap-2 animate-fade-up">
          <Textarea
            aria-label="Starter prompt update feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what you want changed..."
            name="starterPromptFeedback"
            autoComplete="off"
            rows={2}
            className="resize-none text-base"
          />
          <div className="flex gap-1.5 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!feedback.trim() || isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="max-h-[350px]">
        {isUpdating ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="animate-spin" />
            <span className="text-base">Regenerating...</span>
          </div>
        ) : (
          <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {prompt}
          </pre>
        )}
      </ScrollArea>
    </Card>
  );
}
