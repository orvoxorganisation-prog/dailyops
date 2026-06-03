// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms used across every view.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Circle,
  CircleCheckBig,
  CircleDot,
  FileText,
  GitCommitHorizontal,
  Image as ImageIcon,
  Link2,
  Minus,
  MonitorPlay,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  goalStatusLabel,
  hueClasses,
  priorityLabel,
  taskStatusLabel,
} from "@/lib/format";
import type {
  GoalStatus,
  Priority,
  ProofType,
  Severity,
  TaskStatus,
  User,
} from "@/lib/types";

// ── Avatar ───────────────────────────────────────────────────────────────────
const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
export function Avatar({
  user,
  size = "md",
  ring,
}: {
  user: Pick<User, "initials" | "hue" | "name">;
  size?: keyof typeof SIZES;
  ring?: boolean;
}) {
  return (
    <span
      title={user.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold font-display select-none",
        SIZES[size],
        hueClasses[user.hue] ?? hueClasses.teal,
        ring && "ring-2 ring-background"
      )}
    >
      {user.initials}
    </span>
  );
}

// ── Status pills ─────────────────────────────────────────────────────────────
const TASK_STYLE: Record<TaskStatus, { cls: string; Icon: typeof Circle }> = {
  not_started: { cls: "bg-muted text-muted-foreground", Icon: Circle },
  in_progress: { cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", Icon: CircleDot },
  blocked: { cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", Icon: Ban },
  completed: { cls: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", Icon: CircleCheckBig },
};
export function TaskStatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  const { cls, Icon } = TASK_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cls, className)}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {taskStatusLabel[status]}
    </span>
  );
}

const GOAL_STYLE: Record<GoalStatus, string> = {
  on_track: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  behind: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  completed: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
};
export function GoalStatusPill({ status }: { status: GoalStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", GOAL_STYLE[status])}>
      {goalStatusLabel[status]}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};
export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", PRIORITY_STYLE[priority])} />
      {priorityLabel[priority]}
    </span>
  );
}

const SEV_STYLE: Record<Severity, string> = {
  success: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};
export function Tag({ tone = "info", children, className }: { tone?: Severity; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", SEV_STYLE[tone], className)}>
      {children}
    </span>
  );
}

// ── Proof icon ───────────────────────────────────────────────────────────────
const PROOF_ICON: Record<ProofType, typeof Link2> = {
  image: ImageIcon,
  document: FileText,
  screenshot: MonitorPlay,
  link: Link2,
  github: GitCommitHorizontal,
  loom: Video,
};
const PROOF_TONE: Record<ProofType, string> = {
  image: "text-violet-600 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300",
  document: "text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300",
  screenshot: "text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300",
  link: "text-teal-600 bg-teal-100 dark:bg-teal-500/15 dark:text-teal-300",
  github: "text-slate-700 bg-slate-200 dark:bg-slate-500/20 dark:text-slate-200",
  loom: "text-rose-600 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300",
};
export function ProofIcon({ type, className }: { type: ProofType; className?: string }) {
  const Icon = PROOF_ICON[type];
  return (
    <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", PROOF_TONE[type], className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

// ── KPI stat card ────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon,
  tone = "info",
  hint,
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Severity;
  hint?: ReactNode;
  delta?: { value: number; positiveIsGood?: boolean };
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 transition-colors hover:border-foreground/15", className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", SEV_STYLE[tone])}>{icon}</span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-2xl font-semibold leading-none tnum">{value}</span>
        {delta && <DeltaBadge {...delta} />}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DeltaBadge({ value, positiveIsGood = true }: { value: number; positiveIsGood?: boolean }) {
  const good = value === 0 ? null : value > 0 === positiveIsGood;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const cls = good === null ? "text-muted-foreground" : good ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tnum", cls)}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {Math.abs(value)}%
    </span>
  );
}

// ── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon}</span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
