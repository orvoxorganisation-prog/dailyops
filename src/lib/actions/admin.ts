"use server";

import { revalidatePath } from "next/cache";
import { startOfWeek, addDays } from "date-fns";
import { z } from "zod";
import { Priority, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminOrThrow } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins, notifyUser } from "@/lib/notify";
import { todayStr } from "@/lib/scoring";

export type Result = { ok: true } | { ok: false; error: string };

const ADMIN_PATHS = ["/company", "/summary", "/performance", "/analytics", "/all-reports", "/admin/users", "/admin/leave", "/settings"];
function revalidateAdmin() {
  for (const p of ADMIN_PATHS) revalidatePath(p);
}

async function activeAdminCount(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", active: true, deletedAt: null } });
}

/** Guards the "always keep one active admin" rule for demote/disable/delete. */
async function wouldRemoveLastAdmin(targetId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ADMIN" || !target.active || target.deletedAt) return false;
  return (await activeAdminCount()) <= 1;
}

// ── Report review ────────────────────────────────────────────────────────────
export async function toggleFlagReportAction(reportId: string, flag: boolean, reason?: string): Promise<Result> {
  const admin = await adminOrThrow();
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) return { ok: false, error: "Report not found." };

  await prisma.dailyReport.update({
    where: { id: reportId },
    data: flag
      ? { flagged: true, sopFollowed: false, status: "FLAGGED", flagReason: reason?.trim() || "Flagged for SOP review." }
      : { flagged: false, sopFollowed: true, status: "SUBMITTED", flagReason: null },
  });
  if (flag) {
    await notifyUser({
      recipientId: report.userId,
      audience: "employee",
      type: "SOP_VIOLATION",
      severity: "CRITICAL",
      title: "SOP compliance issue",
      message: reason?.trim() || "An admin flagged your report for SOP review.",
    });
  }
  await writeAudit({
    action: flag ? "report.flagged" : "report.flag_cleared",
    actorId: admin.id,
    targetUserId: report.userId,
    entity: "DailyReport",
    entityId: reportId,
  });
  revalidateAdmin();
  revalidatePath("/reports");
  return { ok: true };
}

export async function nudgeAction(targetUserId: string): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { ok: false, error: "User not found." };
  await notifyUser({
    recipientId: target.id,
    audience: "employee",
    type: "NUDGE",
    severity: "WARNING",
    title: "Reminder: submit your daily report",
    message: `${admin.name} nudged you — please submit today's report before end of day.`,
  });
  await writeAudit({ action: "user.nudged", actorId: admin.id, targetUserId: target.id });
  revalidateAdmin();
  return { ok: true };
}

export async function runDailyCheckAction(): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  await adminOrThrow();
  const today = new Date(`${todayStr()}T00:00:00.000Z`);
  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE", active: true, deletedAt: null } });
  const reportsToday = await prisma.dailyReport.findMany({ where: { date: today }, select: { userId: true } });
  const reported = new Set(reportsToday.map((r) => r.userId));
  let created = 0;

  for (const e of employees) {
    if (!reported.has(e.id)) {
      await notifyAdmins({ type: "REPORT_MISSING", severity: "WARNING", relatedUserId: e.id, title: `Missing report — ${e.name}`, message: `${e.team ?? "Company"} · no report submitted today.` });
      await notifyUser({ recipientId: e.id, audience: "employee", type: "REPORT_MISSING", severity: "WARNING", title: "Daily report not submitted", message: "Your report for today is still pending. Submit before end of day." });
      created += 2;
    }
  }
  const blocked = await prisma.task.findMany({ where: { status: "BLOCKED", user: { active: true } }, include: { user: true } });
  for (const t of blocked) {
    await notifyAdmins({ type: "TASK_BLOCKED", severity: "CRITICAL", relatedUserId: t.userId, title: `Blocked — ${t.user.name}`, message: `"${t.title}"` });
    created += 1;
  }
  const atRisk = await prisma.weeklyGoal.findMany({ where: { status: { in: ["AT_RISK", "BEHIND"] }, user: { active: true, role: "EMPLOYEE" } }, include: { user: true } });
  for (const g of atRisk) {
    await notifyUser({ recipientId: g.userId, audience: "employee", type: "GOAL_DEADLINE", severity: "WARNING", title: "Weekly goal at risk", message: `"${g.title}" is ${g.current}/${g.target} ${g.metricLabel}.` });
    created += 1;
  }
  revalidateAdmin();
  revalidatePath("/dashboard");
  return { ok: true, created };
}

// ── User management ──────────────────────────────────────────────────────────
const editSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().max(80).optional(),
  team: z.string().trim().max(80).optional(),
});

export async function updateUserAction(userId: string, input: unknown): Promise<Result> {
  const admin = await adminOrThrow();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, title: parsed.data.title || null, team: parsed.data.team || null },
  });
  await writeAudit({ action: "user.updated", actorId: admin.id, targetUserId: userId, entity: "User", entityId: userId });
  revalidateAdmin();
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: "admin" | "employee"): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (role === "employee" && (await wouldRemoveLastAdmin(userId))) {
    return { ok: false, error: "You can't demote the last remaining admin." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role: role.toUpperCase() as Role } });
  await writeAudit({ action: "user.role_changed", actorId: admin.id, targetUserId: userId, metadata: { role } });
  revalidateAdmin();
  return { ok: true };
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (!active && (await wouldRemoveLastAdmin(userId))) {
    return { ok: false, error: "You can't disable the last remaining admin." };
  }
  // Reactivating also clears any legacy soft-delete marker, so access is fully restored.
  await prisma.user.update({ where: { id: userId }, data: { active, deletedAt: active ? null : undefined } });
  await writeAudit({ action: active ? "user.reactivated" : "user.disabled", actorId: admin.id, targetUserId: userId });
  revalidateAdmin();
  return { ok: true };
}

/**
 * Resets a member for a new period: erases all of their work data — daily
 * reports, proof of work, tasks (and their progress notes, via cascade),
 * weekly goals, and notifications — while keeping the account, login, role
 * and audit history intact. Only this member's records are touched.
 */
export async function wipeEmployeeDataAction(userId: string): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  await prisma.$transaction([
    prisma.proofItem.deleteMany({ where: { userId } }),
    prisma.dailyReport.deleteMany({ where: { userId } }),
    prisma.task.deleteMany({ where: { userId } }), // cascades each task's progress notes
    prisma.weeklyGoal.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { recipientId: userId } }),
  ]);
  await writeAudit({
    action: "user.data_wiped",
    actorId: admin.id,
    targetUserId: userId,
    entity: "User",
    entityId: userId,
    metadata: { email: target.email },
  });
  revalidateAdmin();
  return { ok: true };
}

/**
 * Hard delete — permanently erases the account and ALL of its owned data.
 * Every ownership relation on User is ON DELETE CASCADE (daily reports, proof,
 * tasks + their progress notes, weekly goals, notifications, password-reset
 * tokens), so this removes exactly this user's data and nothing else: other
 * members' records and company settings are untouched. The unique email is
 * freed, so it can be used for a brand-new signup. Irreversible.
 */
export async function permanentDeleteUserAction(userId: string): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (target.id === admin.id) {
    return { ok: false, error: "You can't permanently delete your own account." };
  }
  if (await wouldRemoveLastAdmin(userId)) {
    return { ok: false, error: "You can't delete the last remaining admin." };
  }

  // Capture identity for the audit trail before the row is gone. The audit
  // log's target FK is SET NULL on delete, so we keep the details in metadata.
  const snapshot = { name: target.name, email: target.email, role: target.role };

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { ok: false, error: "Could not permanently delete this account. Please try again." };
  }

  await writeAudit({
    action: "user.permanently_deleted",
    actorId: admin.id,
    entity: "User",
    entityId: userId,
    metadata: snapshot,
  });
  revalidateAdmin();
  return { ok: true };
}

// ── Admin-assigned tasks & weekly goals ──────────────────────────────────────
const dayFromISO = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const assignTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

/** Admin creates a task on behalf of a member. */
export async function assignTaskAction(userId: string, input: unknown): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !target.active || target.deletedAt) return { ok: false, error: "User not found." };
  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task." };
  const d = parsed.data;
  await prisma.task.create({
    data: {
      userId,
      title: d.title,
      description: d.description || null,
      status: "NOT_STARTED",
      priority: d.priority.toUpperCase() as Priority,
      dueDate: d.dueDate ? dayFromISO(d.dueDate) : null,
    },
  });
  await notifyUser({
    recipientId: userId,
    audience: "employee",
    type: "ACCOUNT",
    severity: "INFO",
    title: "New task assigned",
    message: `${admin.name} assigned you a task: “${d.title}”.`,
  });
  await writeAudit({ action: "task.assigned", actorId: admin.id, targetUserId: userId, entity: "Task", metadata: { title: d.title } });
  revalidateAdmin();
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

const setGoalSchema = z.object({
  title: z.string().trim().min(1, "Give the goal a title.").max(200),
  metricLabel: z.string().trim().min(1, "Add a metric (e.g. PRs merged).").max(60),
  target: z.number().int().min(1, "Target must be at least 1.").max(1000),
});

/** Admin sets this week's goal for a member. */
export async function setWeeklyGoalAction(userId: string, input: unknown): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !target.active || target.deletedAt) return { ok: false, error: "User not found." };
  const parsed = setGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 });
  await prisma.weeklyGoal.create({
    data: {
      userId,
      title: parsed.data.title,
      metricLabel: parsed.data.metricLabel,
      target: parsed.data.target,
      current: 0,
      weekOf,
      deadline: addDays(weekOf, 4),
      status: "BEHIND",
    },
  });
  await notifyUser({
    recipientId: userId,
    audience: "employee",
    type: "ACCOUNT",
    severity: "INFO",
    title: "New weekly goal set",
    message: `${admin.name} set a weekly goal for you: “${parsed.data.title}” — target ${parsed.data.target} ${parsed.data.metricLabel}.`,
  });
  await writeAudit({ action: "goal.assigned", actorId: admin.id, targetUserId: userId, entity: "WeeklyGoal", metadata: { title: parsed.data.title } });
  revalidateAdmin();
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── Leave review ─────────────────────────────────────────────────────────────
export async function reviewLeaveAction(leaveId: string, decision: "approve" | "reject", note?: string): Promise<Result> {
  const admin = await adminOrThrow();
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) return { ok: false, error: "Leave request not found." };
  if (leave.status !== "PENDING") return { ok: false, error: "This request has already been reviewed." };

  const approved = decision === "approve";
  await prisma.leave.update({
    where: { id: leaveId },
    data: { status: approved ? "APPROVED" : "REJECTED", reviewedById: admin.id, reviewedAt: new Date(), reviewNote: note?.trim() || null },
  });
  const range = `${leave.startDate.toISOString().slice(0, 10)} → ${leave.endDate.toISOString().slice(0, 10)}`;
  await notifyUser({
    recipientId: leave.userId,
    audience: "employee",
    type: "ACCOUNT",
    severity: approved ? "SUCCESS" : "WARNING",
    title: approved ? "Leave approved" : "Leave request declined",
    message: approved
      ? `Your leave (${range}) was approved — performance tracking is paused for those days.`
      : `Your leave request (${range}) was declined${note?.trim() ? `: ${note.trim()}` : "."}`,
  });
  await writeAudit({ action: approved ? "leave.approved" : "leave.rejected", actorId: admin.id, targetUserId: leave.userId, entity: "Leave", entityId: leaveId });
  revalidateAdmin();
  revalidatePath("/admin/leave");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── Company settings ─────────────────────────────────────────────────────────
const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(160).optional(),
  workdayEndHour: z.number().int().min(0).max(23),
  timezone: z.string().trim().max(60),
  requireProof: z.boolean(),
});

export async function updateSettingsAction(input: unknown): Promise<Result> {
  const admin = await adminOrThrow();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  await prisma.companySettings.upsert({
    where: { id: "company" },
    update: { ...parsed.data, tagline: parsed.data.tagline || null },
    create: { id: "company", ...parsed.data, tagline: parsed.data.tagline || null },
  });
  await writeAudit({ action: "company.settings_updated", actorId: admin.id, entity: "CompanySettings" });
  revalidateAdmin();
  return { ok: true };
}
