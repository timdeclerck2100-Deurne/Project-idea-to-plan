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
  const [pos, setPos] = React.useState({ top: 8, right: 8, maxHeight: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = React.useId();
  const titleId = `${panelId}-title`;

  React.useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const margin = 8;
      const rect = trigger.getBoundingClientRect();
      const maxHeight = Math.max(0, window.innerHeight - margin * 2);
      const panelHeight = Math.min(panel.scrollHeight, maxHeight);
      const panelWidth = Math.min(panel.offsetWidth, window.innerWidth - margin * 2);
      const maxTop = Math.max(margin, window.innerHeight - margin - panelHeight);
      const maxRight = Math.max(margin, window.innerWidth - margin - panelWidth);

      setPos({
        top: Math.min(Math.max(rect.bottom + margin, margin), maxTop),
        right: Math.min(
          Math.max(window.innerWidth - rect.right, margin),
          maxRight,
        ),
        maxHeight,
      });
    }

    updatePosition();
    const selectedIndex = themes.findIndex(({ id }) => id === theme.id);
    (optionRefs.current[selectedIndex] ?? optionRefs.current[0])?.focus();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, theme.id]);

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
      const focusableTarget = target instanceof Element && target.closest(
        "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusableTarget) triggerRef.current?.focus();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Choose theme. Current theme: ${theme.name}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        data-theme-selector-trigger
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-[background-color,border-color,transform]",
          "bg-card/30 backdrop-blur-sm border border-border text-foreground",
          "hover:bg-card/50 hover:border-accent/30 hover:-translate-y-0.5 active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Palette className="size-4" aria-hidden="true" />
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
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-theme-selector-panel
          className="glass-panel fixed z-[9999] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl p-1.5 animate-scale-in"
          style={{ top: pos.top, right: pos.right, maxHeight: pos.maxHeight }}
        >
          <div className="p-2 pb-1.5">
            <span id={titleId} className="micro-label">Theme</span>
          </div>
          {themes.map((t, index) => (
            <button
              key={t.id}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              aria-pressed={t.id === theme.id}
              data-theme-option
              data-theme-id={t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
                    <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  )}
                </div>
                <span className="line-clamp-1 text-sm text-muted-foreground">
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
