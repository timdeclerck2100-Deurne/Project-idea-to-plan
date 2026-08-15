import type { ProjectBrief } from "@/lib/brief-schema";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renameProjectBrief(brief: ProjectBrief, newName: string): ProjectBrief {
  const committedName = newName.trim();
  if (!committedName) {
    throw new Error("App name cannot be empty.");
  }

  const oldName = brief.appName;
  const pattern = oldName
    ? new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(oldName)}(?![\\p{L}\\p{N}_])`, "gu")
    : null;

  const replaceStrings = (value: unknown): unknown => {
    if (typeof value === "string") {
      return pattern ? value.replace(pattern, committedName) : value;
    }
    if (Array.isArray(value)) {
      return value.map(replaceStrings);
    }
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, replaceStrings(child)])
      );
    }
    return value;
  };

  const renamed = replaceStrings(brief) as ProjectBrief;
  renamed.appName = committedName;
  return renamed;
}
