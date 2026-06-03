"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminOrThrow } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins, notifyUser } from "@/lib/notify";
import { todayStr } from "@/lib/scoring";

export type Result = { ok: true } | { ok: false; error: string };

const ADMIN_PATHS = ["/company", "/summary", "/performance", "/analytics", "/all-reports", "/admin/users", "/settings"];
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
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await writeAudit({ action: active ? "user.reactivated" : "user.disabled", actorId: admin.id, targetUserId: userId });
  revalidateAdmin();
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<Result> {
  const admin = await adminOrThrow();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.deletedAt) return { ok: false, error: "User not found." };
  if (await wouldRemoveLastAdmin(userId)) {
    return { ok: false, error: "You can't delete the last remaining admin." };
  }
  // Soft delete: lose access immediately, historical data + audit logs remain.
  await prisma.user.update({
    where: { id: userId },
    data: { active: false, deletedAt: new Date() },
  });
  await writeAudit({ action: "user.deleted", actorId: admin.id, targetUserId: userId, entity: "User", entityId: userId });
  revalidateAdmin();
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
