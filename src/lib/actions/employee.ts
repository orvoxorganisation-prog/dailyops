"use server";

import { revalidatePath } from "next/cache";
import { startOfWeek, addDays } from "date-fns";
import { z } from "zod";
import { Mood, type NotificationType, Priority, ProofType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUserOrThrow } from "@/lib/rbac";
import { notifyAdmins } from "@/lib/notify";
import { clamp } from "@/lib/format";

export type Result = { ok: true } | { ok: false; error: string };

const EMPLOYEE_PATHS = ["/dashboard", "/reports", "/tasks", "/goals", "/proof"];
function revalidateEmployee() {
  for (const p of EMPLOYEE_PATHS) revalidatePath(p);
}
const dayFromISO = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function ownTaskOrThrow(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) throw new Error("Task not found.");
  return task;
}

// ── Daily report (SOP-enforced) ──────────────────────────────────────────────
const proofSchema = z.object({
  type: z.enum(["image", "document", "screenshot", "link", "github", "loom"]),
  label: z.string().min(1).max(200),
  url: z.string().min(1).max(2000),
});
const reportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedToday: z.string().trim().min(1, "Describe what you completed today."),
  progressMade: z.string().trim().min(1, "Describe the progress you made."),
  plannedTomorrow: z.string().trim().min(1, "Describe what's planned next."),
  hasBlockers: z.boolean(),
  blockers: z.string().trim().default(""),
  hoursWorked: z.number().positive("Log the hours you worked.").max(24),
  proof: z.array(proofSchema).min(1, "Attach at least one piece of proof of work."),
  sopConfirmed: z.literal(true, { message: "You must confirm the SOP was followed." }),
  mood: z.enum(["great", "good", "ok", "rough"]).optional(),
});

export async function submitReportAction(input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Report is incomplete." };
  const d = parsed.data;
  if (d.hasBlockers && !d.blockers.trim()) return { ok: false, error: "Describe the blocker, or switch to “No blockers”." };

  const sopFollowed = true; // a fully-validated submission is SOP-compliant
  const day = dayFromISO(d.date);

  const report = await prisma.dailyReport.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    create: {
      userId: user.id,
      date: day,
      completedToday: d.completedToday.trim(),
      progressMade: d.progressMade.trim(),
      plannedTomorrow: d.plannedTomorrow.trim(),
      blockers: d.hasBlockers ? d.blockers.trim() : "No blockers — clear runway.",
      hasBlockers: d.hasBlockers,
      hoursWorked: d.hoursWorked,
      sopConfirmed: true,
      sopFollowed,
      flagged: false,
      status: "SUBMITTED",
      mood: d.mood ? (d.mood.toUpperCase() as Mood) : null,
    },
    update: {
      completedToday: d.completedToday.trim(),
      progressMade: d.progressMade.trim(),
      plannedTomorrow: d.plannedTomorrow.trim(),
      blockers: d.hasBlockers ? d.blockers.trim() : "No blockers — clear runway.",
      hasBlockers: d.hasBlockers,
      hoursWorked: d.hoursWorked,
      sopConfirmed: true,
      sopFollowed,
      flagged: false,
      flagReason: null,
      status: "SUBMITTED",
      mood: d.mood ? (d.mood.toUpperCase() as Mood) : null,
      submittedAt: new Date(),
    },
  });

  await prisma.proofItem.deleteMany({ where: { reportId: report.id } });
  await prisma.proofItem.createMany({
    data: d.proof.map((p) => ({
      userId: user.id,
      reportId: report.id,
      type: p.type.toUpperCase() as ProofType,
      label: p.label,
      url: p.url,
    })),
  });

  // resolve any "missing report" nudges for this user/day
  await prisma.notification.updateMany({
    where: { recipientId: user.id, type: { in: ["REPORT_MISSING", "NUDGE"] as NotificationType[] }, read: false },
    data: { read: true },
  });

  revalidateEmployee();
  revalidatePath("/company");
  revalidatePath("/summary");
  return { ok: true };
}

// ── Tasks ────────────────────────────────────────────────────────────────────
const taskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["not_started", "in_progress", "blocked", "completed"]).default("not_started"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  goalId: z.string().optional(),
});

export async function createTaskAction(input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task." };
  const d = parsed.data;
  await prisma.task.create({
    data: {
      userId: user.id,
      title: d.title,
      description: d.description || null,
      status: d.status.toUpperCase() as TaskStatus,
      priority: d.priority.toUpperCase() as Priority,
      dueDate: d.dueDate ? dayFromISO(d.dueDate) : null,
      completedAt: d.status === "completed" ? new Date() : null,
      goalId: d.goalId && d.goalId !== "none" ? d.goalId : null,
    },
  });
  revalidateEmployee();
  return { ok: true };
}

export async function updateTaskAction(taskId: string, input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  await ownTaskOrThrow(taskId, user.id);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task." };
  const d = parsed.data;
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: d.title,
      description: d.description || null,
      status: d.status.toUpperCase() as TaskStatus,
      priority: d.priority.toUpperCase() as Priority,
      dueDate: d.dueDate ? dayFromISO(d.dueDate) : null,
      completedAt: d.status === "completed" ? new Date() : null,
      goalId: d.goalId && d.goalId !== "none" ? d.goalId : null,
    },
  });
  revalidateEmployee();
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: string): Promise<Result> {
  const user = await currentUserOrThrow();
  await ownTaskOrThrow(taskId, user.id);
  const valid = ["not_started", "in_progress", "blocked", "completed"];
  if (!valid.includes(status)) return { ok: false, error: "Invalid status." };
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: status.toUpperCase() as TaskStatus,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
  if (status === "blocked") {
    await notifyAdmins({
      type: "TASK_BLOCKED",
      severity: "CRITICAL",
      relatedUserId: user.id,
      title: `${user.name} is blocked`,
      message: `A task was marked blocked and needs attention.`,
    });
  }
  revalidateEmployee();
  revalidatePath("/company");
  return { ok: true };
}

export async function addProgressNoteAction(taskId: string, text: string): Promise<Result> {
  const user = await currentUserOrThrow();
  await ownTaskOrThrow(taskId, user.id);
  const t = text.trim();
  if (!t) return { ok: false, error: "Note can't be empty." };
  await prisma.progressNote.create({ data: { taskId, authorId: user.id, text: t.slice(0, 2000) } });
  revalidateEmployee();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<Result> {
  const user = await currentUserOrThrow();
  await ownTaskOrThrow(taskId, user.id);
  await prisma.task.delete({ where: { id: taskId } });
  revalidateEmployee();
  return { ok: true };
}

// ── Weekly goals ─────────────────────────────────────────────────────────────
const goalSchema = z.object({
  title: z.string().trim().min(1, "Give the goal a title.").max(200),
  metricLabel: z.string().trim().min(1, "Add a metric (e.g. PRs merged).").max(60),
  target: z.number().int().min(1, "Target must be at least 1.").max(1000),
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

const goalStatusFor = (current: number, target: number) =>
  current >= target ? "COMPLETED" : current >= target * 0.7 ? "ON_TRACK" : current >= target * 0.45 ? "AT_RISK" : "BEHIND";

export async function createGoalAction(input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  const weekOf = parsed.data.weekOf ? dayFromISO(parsed.data.weekOf) : startOfWeek(new Date(), { weekStartsOn: 1 });
  await prisma.weeklyGoal.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      metricLabel: parsed.data.metricLabel,
      target: parsed.data.target,
      current: 0,
      weekOf,
      deadline: addDays(weekOf, 4),
      status: "BEHIND",
    },
  });
  revalidateEmployee();
  return { ok: true };
}

export async function updateGoalAction(goalId: string, input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const goal = await prisma.weeklyGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== user.id) return { ok: false, error: "Goal not found." };
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  const weekOf = parsed.data.weekOf ? dayFromISO(parsed.data.weekOf) : goal.weekOf;
  const target = parsed.data.target;
  const current = Math.min(goal.current, target);
  await prisma.weeklyGoal.update({
    where: { id: goalId },
    data: {
      title: parsed.data.title,
      metricLabel: parsed.data.metricLabel,
      target,
      current,
      weekOf,
      deadline: addDays(weekOf, 4),
      status: goalStatusFor(current, target),
    },
  });
  revalidateEmployee();
  return { ok: true };
}

export async function deleteGoalAction(goalId: string): Promise<Result> {
  const user = await currentUserOrThrow();
  const goal = await prisma.weeklyGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== user.id) return { ok: false, error: "Goal not found." };
  await prisma.weeklyGoal.delete({ where: { id: goalId } });
  revalidateEmployee();
  return { ok: true };
}

export async function adjustGoalAction(goalId: string, delta: number): Promise<Result> {
  const user = await currentUserOrThrow();
  const goal = await prisma.weeklyGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== user.id) return { ok: false, error: "Goal not found." };
  const current = clamp(goal.current + delta, 0, goal.target);
  const status =
    current >= goal.target ? "COMPLETED" : current >= goal.target * 0.7 ? "ON_TRACK" : current >= goal.target * 0.45 ? "AT_RISK" : "BEHIND";
  await prisma.weeklyGoal.update({ where: { id: goalId }, data: { current, status } });
  revalidateEmployee();
  return { ok: true };
}

// ── Proof of work ────────────────────────────────────────────────────────────
export async function addProofAction(input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const parsed = proofSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid proof." };
  await prisma.proofItem.create({
    data: {
      userId: user.id,
      type: parsed.data.type.toUpperCase() as ProofType,
      label: parsed.data.label,
      url: parsed.data.url,
    },
  });
  revalidateEmployee();
  return { ok: true };
}

export async function removeProofAction(proofId: string): Promise<Result> {
  const user = await currentUserOrThrow();
  const proof = await prisma.proofItem.findUnique({ where: { id: proofId } });
  if (!proof || proof.userId !== user.id) return { ok: false, error: "Proof not found." };
  await prisma.proofItem.delete({ where: { id: proofId } });
  revalidateEmployee();
  return { ok: true };
}

// ── Notifications ────────────────────────────────────────────────────────────
export async function markNotificationReadAction(id: string): Promise<Result> {
  const user = await currentUserOrThrow();
  await prisma.notification.updateMany({ where: { id, recipientId: user.id }, data: { read: true } });
  revalidatePath("/dashboard");
  revalidatePath("/company");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<Result> {
  const user = await currentUserOrThrow();
  await prisma.notification.updateMany({
    where: { recipientId: user.id, audience: user.role },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  revalidatePath("/company");
  return { ok: true };
}

// ── Leave requests ───────────────────────────────────────────────────────────
const leaveSchema = z.object({
  reason: z.string().trim().min(3, "Add a brief reason for your leave.").max(500),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date."),
});

export async function requestLeaveAction(input: unknown): Promise<Result> {
  const user = await currentUserOrThrow();
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid leave request." };
  const { reason, startDate, endDate } = parsed.data;
  if (endDate < startDate) return { ok: false, error: "End date can't be before the start date." };

  await prisma.leave.create({
    data: { userId: user.id, reason: reason.trim(), startDate: dayFromISO(startDate), endDate: dayFromISO(endDate), status: "PENDING" },
  });
  await notifyAdmins({
    type: "ACCOUNT",
    severity: "INFO",
    relatedUserId: user.id,
    title: `Leave request — ${user.name}`,
    message: `${user.name} requested leave from ${startDate} to ${endDate}. Pending your approval.`,
  });
  revalidatePath("/leave");
  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function cancelLeaveAction(leaveId: string): Promise<Result> {
  const user = await currentUserOrThrow();
  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave || leave.userId !== user.id) return { ok: false, error: "Leave request not found." };
  if (leave.status !== "PENDING") return { ok: false, error: "Only pending requests can be withdrawn." };
  await prisma.leave.delete({ where: { id: leaveId } });
  revalidatePath("/leave");
  revalidatePath("/admin/leave");
  return { ok: true };
}
