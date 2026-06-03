import "server-only";
import { subDays } from "date-fns";
import { prisma } from "./db";
import {
  serializeAudit,
  serializeGoal,
  serializeNotification,
  serializeProof,
  serializeReport,
  serializeTask,
  serializeUser,
} from "./serialize";
import { computeMetrics } from "./scoring";
import type {
  AuditEntry,
  DailyReport,
  Dataset,
  EmployeeMetrics,
  Notification,
  ProofItem,
  Task,
  User,
  WeeklyGoal,
} from "./types";

const HISTORY_DAYS = 45;

export interface EmployeeBundle {
  user: User;
  reports: DailyReport[];
  tasks: Task[];
  goals: WeeklyGoal[];
  proofs: ProofItem[];
  dataset: Dataset;
  metrics: EmployeeMetrics;
}

export async function getEmployeeBundle(userId: string): Promise<EmployeeBundle> {
  const cutoff = subDays(new Date(), HISTORY_DAYS);
  const [dbUser, reports, tasks, goals, proofs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.dailyReport.findMany({
      where: { userId, date: { gte: cutoff } },
      include: { proof: true },
      orderBy: { date: "desc" },
    }),
    prisma.task.findMany({
      where: { userId },
      include: { progressNotes: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.weeklyGoal.findMany({
      where: { userId, weekOf: { gte: subDays(new Date(), 42) } },
      orderBy: { weekOf: "desc" },
    }),
    prisma.proofItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const user = serializeUser(dbUser);
  const sReports = reports.map(serializeReport);
  const sTasks = tasks.map(serializeTask);
  const sGoals = goals.map(serializeGoal);
  const dataset: Dataset = { users: [user], reports: sReports, tasks: sTasks, goals: sGoals };

  return {
    user,
    reports: sReports,
    tasks: sTasks,
    goals: sGoals,
    proofs: proofs.map(serializeProof),
    dataset,
    metrics: computeMetrics(dataset, user),
  };
}

export async function getCompanyDataset(): Promise<Dataset> {
  const cutoff = subDays(new Date(), 60);
  const [users, reports, tasks, goals] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dailyReport.findMany({
      where: { date: { gte: cutoff } },
      include: { proof: true },
      orderBy: { date: "desc" },
    }),
    prisma.task.findMany({ include: { progressNotes: true } }),
    prisma.weeklyGoal.findMany({ where: { weekOf: { gte: subDays(new Date(), 56) } } }),
  ]);
  return {
    users: users.map(serializeUser),
    reports: reports.map(serializeReport),
    tasks: tasks.map(serializeTask),
    goals: goals.map(serializeGoal),
  };
}

export async function getAllReports(): Promise<{ dataset: Dataset; reports: DailyReport[] }> {
  const [users, reports] = await Promise.all([
    prisma.user.findMany(),
    prisma.dailyReport.findMany({ include: { proof: true }, orderBy: { date: "desc" }, take: 400 }),
  ]);
  return {
    dataset: { users: users.map(serializeUser), reports: reports.map(serializeReport), tasks: [], goals: [] },
    reports: reports.map(serializeReport),
  };
}

export async function listNotifications(user: User): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { recipientId: user.id, audience: user.role },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(serializeNotification);
}

export async function listAllUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  return rows.map(serializeUser);
}

export async function listAuditLog(limit = 40): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    include: { actor: true, target: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serializeAudit);
}

export async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", active: true, deletedAt: null } });
}
