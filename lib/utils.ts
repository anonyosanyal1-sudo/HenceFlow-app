import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Project, Stage } from "../src/types"
import { DEFAULT_STAGES } from "../src/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns the ID of the last (closed/done) stage for a project. */
export function getClosedStageId(projectOrStages?: Project | Stage[]): string {
  const stages = Array.isArray(projectOrStages)
    ? projectOrStages
    : projectOrStages?.stages;
  if (stages && stages.length > 0) return stages[stages.length - 1].id;
  return DEFAULT_STAGES[DEFAULT_STAGES.length - 1].id;
}
