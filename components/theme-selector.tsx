"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/theme-provider";
import { themes } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Palette, Check } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, right: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  function updatePosition() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current && panelRef.current.contains(target)
      ) return;
      if (
        triggerRef.current && triggerRef.current.contains(target)
      ) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((o) => !o);
        }}
        className={cn(
          "inline-flex items-center gap-2 h-8 rounded-lg px-3 text-xs font-semibold transition-all",
          "bg-card/30 backdrop-blur-sm border border-border text-foreground",
          "hover:bg-card/50 hover:border-accent/30 hover:-translate-y-0.5 active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Palette className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{theme.name}</span>
        <span className="flex gap-0.5">
          {theme.swatches.map((swatch, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-full border border-border/30"
              style={{ backgroundColor: swatch }}
            />
          ))}
        </span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-80 max-h-[70vh] overflow-y-auto rounded-xl glass-panel p-1.5 animate-scale-in"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="p-2 pb-1.5">
            <span className="micro-label">Theme</span>
          </div>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors",
                "hover:bg-muted/40",
                t.id === theme.id && "bg-muted/50"
              )}
            >
              <div className="flex gap-1 mt-0.5 shrink-0">
                {t.swatches.map((swatch, i) => (
                  <span
                    key={i}
                    className="inline-block h-4 w-4 rounded-full border border-border/30"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {t.name}
                  </span>
                  {t.id === theme.id && (
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {t.description}
                </span>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
