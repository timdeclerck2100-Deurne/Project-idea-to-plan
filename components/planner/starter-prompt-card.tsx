"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Download, Loader2 } from "lucide-react";

interface StarterPromptCardProps {
  prompt: string;
  filename?: string;
  isUpdating?: boolean;
}

export function StarterPromptCard({ prompt, filename = "starter-prompt.txt", isUpdating = false }: StarterPromptCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <Card className="paper-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="micro-label">Export</div>
          <h3 className="text-sm font-medium text-foreground leading-none">Starter Prompt</h3>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
            {copied ? (
              <Check className="h-3 w-3 text-accent" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 px-2 text-xs">
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      </div>
      <ScrollArea className="max-h-[350px]">
        {isUpdating ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">Regenerating...</span>
          </div>
        ) : (
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {prompt}
          </pre>
        )}
      </ScrollArea>
    </Card>
  );
}
