import {
  differenceInCalendarDays,
  format,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";
import type {
  GoalStatus,
  Mood,
  Priority,
  ProofType,
  Role,
  Severity,
  TaskStatus,
} from "./types";

export const todayISO = (): string => format(new Date(), "yyyy-MM-dd");

export function prettyDate(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

export function relativeTime(iso: string): string {
  const then = parseISO(iso);
  const now = new Date();
  const mins = Math.round((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = differenceInCalendarDays(now, then);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return format(then, "MMM d");
}

export function dueLabel(iso?: string): { text: string; tone: Severity } {
  if (!iso) return { text: "No due date", tone: "info" };
  const days = differenceInCalendarDays(parseISO(iso), new Date());
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "critical" };
  if (days === 0) return { text: "Due today", tone: "warning" };
  if (days === 1) return { text: "Due tomorrow", tone: "warning" };
  if (days <= 3) return { text: `Due in ${days}d`, tone: "warning" };
  return { text: `Due ${format(parseISO(iso), "MMM d")}`, tone: "info" };
}

export const initials = (name: string): string =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const taskStatusLabel: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
};

export const goalStatusLabel: Record<GoalStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
  completed: "Completed",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  employee: "Employee",
};

export const priorityLabel: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const proofLabel: Record<ProofType, string> = {
  image: "Image",
  document: "Document",
  screenshot: "Screenshot",
  link: "Link",
  github: "GitHub",
  loom: "Loom",
};

export const moodLabel: Record<Mood, string> = {
  great: "Great",
  good: "Good",
  ok: "Okay",
  rough: "Rough",
};

export const moodEmoji: Record<Mood, string> = {
  great: "🔥",
  good: "🙂",
  ok: "😐",
  rough: "😮‍💨",
};

export const hueClasses: Record<string, string> = {
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

export const HUES = ["teal", "sky", "emerald", "violet", "amber", "rose", "orange", "indigo"];

export function hueFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export function scoreTone(score: number): Severity {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "critical";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Steady";
  if (score >= 40) return "Needs focus";
  return "At risk";
}

export function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}
