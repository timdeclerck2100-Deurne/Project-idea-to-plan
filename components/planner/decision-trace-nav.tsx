import { cn } from "@/lib/utils";
import { CircleCheck, CircleDashed, RefreshCw } from "lucide-react";
import type { DecisionDomainState } from "./decision-domain";

export const decisionDomains = [
  {
    id: "purpose",
    number: "01",
    title: "Purpose",
    orientation:
      "Define the project in one clear name and a concise statement of intent.",
  },
  {
    id: "people",
    number: "02",
    title: "People",
    orientation:
      "Keep the intended users visible before product scope and technical choices take over.",
  },
  {
    id: "product",
    number: "03",
    title: "Product",
    orientation:
      "Connect the essential capabilities to the places where people will use them.",
  },
  {
    id: "architecture",
    number: "04",
    title: "Architecture",
    orientation:
      "Review the implementation choices and the information structure as separate technical decisions.",
  },
  {
    id: "delivery",
    number: "05",
    title: "Delivery",
    orientation:
      "Sequence the work, then check the risks and the planning path that support it.",
  },
  {
    id: "handoff",
    number: "06",
    title: "Handoff",
    orientation:
      "Review the generated brief and starter prompt, then refresh them after upstream edits.",
  },
] as const;

export type DecisionDomainId = (typeof decisionDomains)[number]["id"];

export interface DecisionTraceNavProps {
  projectName: string;
  states: Record<DecisionDomainId, DecisionDomainState>;
  className?: string;
}

export function DecisionTraceNav({
  projectName,
  states,
  className,
}: DecisionTraceNavProps) {
  return (
    <nav
      aria-label="Decision trace"
      className={cn("min-w-0 border-y border-border py-4", className)}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-baseline lg:gap-8">
        <div className="min-w-0 shrink-0">
          <p className="micro-label">Decision trace</p>
          <p className="mt-1 truncate text-base font-semibold text-foreground">
            {projectName}
          </p>
        </div>
        <ol
          data-testid="decision-trace-links"
          className="flex min-w-0 scroll-px-1 gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-1 lg:flex-wrap lg:overflow-visible"
        >
          {decisionDomains.map((domain) => {
            const state = states[domain.id];
            const StateIcon =
              state === "Populated"
                ? CircleCheck
                : state === "Refresh needed"
                  ? RefreshCw
                  : CircleDashed;

            return (
              <li
                key={domain.id}
                className="min-w-[9.5rem] shrink-0 lg:min-w-0"
              >
                <a
                  href={`#${domain.id}`}
                  aria-label={`${domain.number} ${domain.title}: ${state}`}
                  className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-base text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="font-mono text-sm" aria-hidden="true">
                    {domain.number}
                  </span>
                  <span className="font-medium">{domain.title}</span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-sm"
                    aria-hidden="true"
                  >
                    <StateIcon className="size-3.5" />
                    <span className="hidden xl:inline">{state}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
