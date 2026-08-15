import * as React from "react";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleDashed, RefreshCw } from "lucide-react";

export type DecisionDomainState = "Populated" | "Needs input" | "Refresh needed";

export interface DecisionDomainProps {
  id: string;
  number: string;
  title: string;
  orientation: string;
  state: DecisionDomainState;
  children?: React.ReactNode;
  wide?: React.ReactNode;
  contextAction?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DecisionDomain({
  id,
  number,
  title,
  orientation,
  state,
  children,
  wide,
  contextAction,
  className,
  contentClassName,
}: DecisionDomainProps) {
  const headingId = `${id}-heading`;
  const StateIcon =
    state === "Populated" ? CircleCheck : state === "Refresh needed" ? RefreshCw : CircleDashed;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-6 border-t border-border py-8 sm:py-10 lg:py-12",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <header className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-center gap-3" aria-hidden="true">
            <span className="font-mono text-base font-semibold text-primary">{number}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2
            id={headingId}
            className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            {title}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <StateIcon aria-hidden="true" className="size-4 shrink-0" />
            <span>{state}</span>
          </div>
          <p className="mt-2 max-w-[var(--measure-readable)] text-base leading-relaxed text-muted-foreground">
            {orientation}
          </p>
          {contextAction && <div className="mt-4 flex flex-wrap">{contextAction}</div>}
        </header>

        {children && (
          <div className={cn("min-w-0 lg:col-span-9", contentClassName)}>{children}</div>
        )}

        {wide && <div className="min-w-0 lg:col-span-12">{wide}</div>}
      </div>
    </section>
  );
}
