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

/**
 * Parse a date string as a LOCAL date. A bare `YYYY-MM-DD` string passed to
 * `new Date()` is interpreted as UTC midnight, which renders as the previous day
 * for users west of UTC (an off-by-one bug). This parses the date parts as local.
 * Returns `null` for empty input.
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length === 3 && parts.every(n => !Number.isNaN(n))) {
    const [y, m, d] = parts;
    return new Date(y, m - 1, d);
  }
  // Fall back to native parsing for full ISO timestamps.
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
