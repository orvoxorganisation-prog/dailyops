import type { Prisma } from "@prisma/client";
import { initials as toInitials } from "./format";
import type {
  AuditEntry,
  DailyReport,
  Leave,
  Notification,
  ProofItem,
  Task,
  User,
  WeeklyGoal,
} from "./types";

const ymd = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : undefined);
const low = (s: string) => s.toLowerCase();

export function serializeUser(u: Prisma.UserGetPayload<object>): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: low(u.role) as User["role"],
    title: u.title ?? (u.role === "ADMIN" ? "Administrator" : "Team Member"),
    team: u.team ?? "Company",
    initials: toInitials(u.name),
    hue: u.hue,
    active: u.active,
    deleted: !!u.deletedAt,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

export function serializeProof(p: Prisma.ProofItemGetPayload<object>): ProofItem {
  return {
    id: p.id,
    type: low(p.type) as ProofItem["type"],
    label: p.label,
    url: p.url,
    addedAt: p.createdAt.toISOString(),
    reportId: p.reportId ?? undefined,
  };
}

export function serializeReport(
  r: Prisma.DailyReportGetPayload<{ include: { proof: true } }>
): DailyReport {
  return {
    id: r.id,
    userId: r.userId,
    date: ymd(r.date),
    completedToday: r.completedToday,
    progressMade: r.progressMade,
    plannedTomorrow: r.plannedTomorrow,
    blockers: r.blockers,
    hasBlockers: r.hasBlockers,
    hoursWorked: r.hoursWorked,
    proof: r.proof.map(serializeProof),
    sopConfirmed: r.sopConfirmed,
    sopFollowed: r.sopFollowed,
    flagged: r.flagged,
    flagReason: r.flagReason ?? undefined,
    status: low(r.status) as DailyReport["status"],
    submittedAt: iso(r.submittedAt),
    mood: r.mood ? (low(r.mood) as DailyReport["mood"]) : undefined,
  };
}

export function serializeTask(
  t: Prisma.TaskGetPayload<{ include: { progressNotes: true } }>
): Task {
  return {
    id: t.id,
    userId: t.userId,
    title: t.title,
    description: t.description ?? undefined,
    status: low(t.status) as Task["status"],
    priority: low(t.priority) as Task["priority"],
    createdAt: t.createdAt.toISOString(),
    dueDate: t.dueDate ? ymd(t.dueDate) : undefined,
    completedAt: iso(t.completedAt),
    goalId: t.goalId ?? undefined,
    progressNotes: t.progressNotes
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((n) => ({ id: n.id, text: n.text, at: n.createdAt.toISOString() })),
  };
}

export function serializeGoal(g: Prisma.WeeklyGoalGetPayload<object>): WeeklyGoal {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    metricLabel: g.metricLabel,
    target: g.target,
    current: g.current,
    weekOf: ymd(g.weekOf),
    deadline: ymd(g.deadline),
    status: low(g.status) as WeeklyGoal["status"],
  };
}

export function serializeNotification(n: Prisma.NotificationGetPayload<object>): Notification {
  return {
    id: n.id,
    recipientId: n.recipientId,
    audience: n.audience as Notification["audience"],
    type: low(n.type) as Notification["type"],
    title: n.title,
    message: n.message,
    severity: low(n.severity) as Notification["severity"],
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    relatedUserId: n.relatedUserId ?? undefined,
  };
}

export function serializeLeave(
  l: Prisma.LeaveGetPayload<{ include: { user: true; reviewedBy: true } }>
): Leave {
  return {
    id: l.id,
    userId: l.userId,
    userName: l.user.name,
    reason: l.reason,
    startDate: ymd(l.startDate),
    endDate: ymd(l.endDate),
    status: low(l.status) as Leave["status"],
    reviewedByName: l.reviewedBy?.name ?? null,
    reviewedAt: l.reviewedAt ? l.reviewedAt.toISOString() : null,
    reviewNote: l.reviewNote ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

export function serializeAudit(
  a: Prisma.AuditLogGetPayload<{ include: { actor: true; target: true } }>
): AuditEntry {
  return {
    id: a.id,
    action: a.action,
    actorName: a.actor?.name ?? null,
    targetName: a.target?.name ?? null,
    entity: a.entity ?? null,
    createdAt: a.createdAt.toISOString(),
    metadata: (a.metadata as Record<string, unknown> | null) ?? null,
  };
}
