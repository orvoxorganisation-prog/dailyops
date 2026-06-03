// ─────────────────────────────────────────────────────────────────────────────
// Productivity scoring & analytics — pure functions over real (serialized) data.
// ─────────────────────────────────────────────────────────────────────────────

import { format, getDay, parseISO } from "date-fns";
import { clamp, pct } from "./format";
import type {
  DailyReport,
  Dataset,
  EmployeeMetrics,
  ScoreBreakdown,
  Task,
  User,
  WeeklyGoal,
} from "./types";

const SCORE_WEIGHTS = {
  reportConsistency: 0.25,
  taskCompletion: 0.25,
  goalCompletion: 0.2,
  blockerControl: 0.15,
  sopCompliance: 0.15,
};

const isWeekday = (d: Date) => {
  const g = getDay(d);
  return g !== 0 && g !== 6;
};

export function lastNDates(n: number, end = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(format(d, "yyyy-MM-dd"));
  }
  return out;
}

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

const uReports = (ds: Dataset, id: string) => ds.reports.filter((r) => r.userId === id);
const uTasks = (ds: Dataset, id: string) => ds.tasks.filter((t) => t.userId === id);
const uGoals = (ds: Dataset, id: string) => ds.goals.filter((g) => g.userId === id);

export function reportingUsers(ds: Dataset): User[] {
  return ds.users.filter((u) => u.role === "employee" && u.active);
}

export function computeStreak(reports: DailyReport[]): number {
  const have = new Set(reports.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  if (!have.has(format(cursor, "yyyy-MM-dd"))) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 60; i++) {
    if (!isWeekday(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const key = format(cursor, "yyyy-MM-dd");
    if (have.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function goalCompletionForUser(ds: Dataset, id: string): number {
  const gs = uGoals(ds, id);
  if (!gs.length) return 0;
  return Math.round(gs.reduce((a, g) => a + clamp(pct(g.current, g.target)), 0) / gs.length);
}

function userDayScores(ds: Dataset, id: string, dates: string[]): number[] {
  const byDate = new Map(uReports(ds, id).map((r) => [r.date, r]));
  const goalsPct = goalCompletionForUser(ds, id);
  let last = 45;
  return dates.map((d) => {
    const rep = byDate.get(d);
    if (rep) {
      const v = clamp(
        46 + (rep.hoursWorked - 6) * 5 + (rep.sopFollowed ? 12 : -16) + (rep.hasBlockers ? -10 : 6) + goalsPct * 0.1
      );
      last = v;
      return v;
    }
    if (!isWeekday(parseISO(d))) return last;
    last = clamp(last - 18);
    return last;
  });
}

export function scoreBreakdown(ds: Dataset, id: string): ScoreBreakdown {
  const reports = uReports(ds, id);
  const tasks = uTasks(ds, id);
  const cycle = lastNDates(14);
  const expected = cycle.filter((d) => isWeekday(parseISO(d))).length;
  const have = new Set(reports.map((r) => r.date));
  const submitted = cycle.filter((d) => isWeekday(parseISO(d)) && have.has(d)).length;
  const reportConsistency = clamp(pct(submitted, expected));

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const taskCompletion = total ? clamp(pct(completed, total)) : 0;

  const goalCompletion = goalCompletionForUser(ds, id);
  const openBlockers = tasks.filter((t) => t.status === "blocked").length;
  const blockerControl = clamp(100 - openBlockers * 22);

  const cycleReports = reports.filter((r) => cycle.includes(r.date));
  const sopOk = cycleReports.filter((r) => r.sopFollowed).length;
  const sopCompliance = cycleReports.length ? clamp(pct(sopOk, cycleReports.length)) : 100;

  const total100 = Math.round(
    reportConsistency * SCORE_WEIGHTS.reportConsistency +
      taskCompletion * SCORE_WEIGHTS.taskCompletion +
      goalCompletion * SCORE_WEIGHTS.goalCompletion +
      blockerControl * SCORE_WEIGHTS.blockerControl +
      sopCompliance * SCORE_WEIGHTS.sopCompliance
  );

  return { reportConsistency, taskCompletion, goalCompletion, blockerControl, sopCompliance, total: clamp(total100) };
}

export function computeMetrics(ds: Dataset, user: User): EmployeeMetrics {
  const reports = uReports(ds, user.id);
  const tasks = uTasks(ds, user.id);
  const cycle = lastNDates(14);
  const expected = cycle.filter((d) => isWeekday(parseISO(d))).length;
  const have = new Set(reports.map((r) => r.date));
  const submitted = cycle.filter((d) => isWeekday(parseISO(d)) && have.has(d)).length;
  const score = scoreBreakdown(ds, user.id);
  const today = todayStr();

  return {
    user,
    reportStreak: computeStreak(reports),
    reportsThisCycle: submitted,
    reportsExpected: expected,
    tasksCompleted: tasks.filter((t) => t.status === "completed").length,
    tasksTotal: tasks.length,
    tasksBlocked: tasks.filter((t) => t.status === "blocked").length,
    weeklyCompletionRate: goalCompletionForUser(ds, user.id),
    openBlockers: tasks.filter((t) => t.status === "blocked").length,
    sopComplianceScore: score.sopCompliance,
    score,
    submittedToday: have.has(today),
    flaggedToday: reports.some((r) => r.date === today && r.flagged),
    trend: userDayScores(ds, user.id, cycle),
  };
}

export function computeAllMetrics(ds: Dataset): EmployeeMetrics[] {
  return reportingUsers(ds)
    .map((u) => computeMetrics(ds, u))
    .sort((a, b) => b.score.total - a.score.total);
}

export interface CompanyKpis {
  totalEmployees: number;
  reportsToday: number;
  missingToday: User[];
  tasksCompletedToday: number;
  openBlockers: number;
  weeklyGoalProgress: number;
  avgScore: number;
  flaggedToday: number;
}

export function companyKpis(ds: Dataset): CompanyKpis {
  const team = reportingUsers(ds);
  const today = todayStr();
  const reportsToday = ds.reports.filter((r) => r.date === today && team.some((u) => u.id === r.userId));
  const reportedIds = new Set(reportsToday.map((r) => r.userId));
  const missingToday = team.filter((u) => !reportedIds.has(u.id));
  const tasksCompletedToday = ds.tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === today).length;
  const openBlockers = ds.tasks.filter((t) => t.status === "blocked").length;
  const goals = ds.goals.filter((g) => team.some((u) => u.id === g.userId));
  const goalProg = goals.length
    ? Math.round(goals.reduce((a, g) => a + clamp(pct(g.current, g.target)), 0) / goals.length)
    : 0;
  const metrics = computeAllMetrics(ds);
  const avgScore = metrics.length
    ? Math.round(metrics.reduce((a, m) => a + m.score.total, 0) / metrics.length)
    : 0;
  return {
    totalEmployees: team.length,
    reportsToday: reportsToday.length,
    missingToday,
    tasksCompletedToday,
    openBlockers,
    weeklyGoalProgress: goalProg,
    avgScore,
    flaggedToday: reportsToday.filter((r) => r.flagged).length,
  };
}

export interface TrendPoint {
  date: string;
  value: number;
  submitted?: number;
  expected?: number;
}

export function missedReportTrend(ds: Dataset, days = 14): TrendPoint[] {
  const team = reportingUsers(ds);
  const teamIds = new Set(team.map((u) => u.id));
  return lastNDates(days).map((d) => {
    const weekday = isWeekday(parseISO(d));
    const expected = weekday ? team.length : 0;
    const submitted = ds.reports.filter((r) => r.date === d && teamIds.has(r.userId)).length;
    return { date: d, value: expected ? clamp(pct(submitted, expected)) : 100, submitted, expected };
  });
}

export function teamProductivityTrend(ds: Dataset, days = 14): TrendPoint[] {
  const team = reportingUsers(ds);
  const dates = lastNDates(days);
  const perUser = team.map((u) => userDayScores(ds, u.id, dates));
  return dates.map((d, i) => {
    const avg = perUser.length ? perUser.reduce((a, arr) => a + arr[i], 0) / perUser.length : 0;
    return { date: d, value: Math.round(avg) };
  });
}

export function goalCompletionByMember(ds: Dataset): { user: User; pct: number }[] {
  return reportingUsers(ds)
    .map((u) => ({ user: u, pct: goalCompletionForUser(ds, u.id) }))
    .sort((a, b) => b.pct - a.pct);
}

export interface SummaryRow {
  user: User;
  submitted: boolean;
  flagged: boolean;
  completed: string;
  hours: number;
  blockers: string | null;
  overdueCount: number;
  score: number;
}

export function founderSummary(ds: Dataset): SummaryRow[] {
  const team = reportingUsers(ds);
  const today = todayStr();
  return team
    .map((u) => {
      const rep = ds.reports.find((r) => r.userId === u.id && r.date === today);
      const overdue = ds.tasks.filter(
        (t) => t.userId === u.id && t.status !== "completed" && t.dueDate && t.dueDate < today
      ).length;
      const blockedTasks = ds.tasks.filter((t) => t.userId === u.id && t.status === "blocked");
      const blockerText =
        rep && rep.hasBlockers ? rep.blockers : blockedTasks.length ? `${blockedTasks[0].title} (task blocked)` : null;
      return {
        user: u,
        submitted: !!rep,
        flagged: !!rep?.flagged,
        completed: rep?.completedToday ?? "—",
        hours: rep?.hoursWorked ?? 0,
        blockers: blockerText,
        overdueCount: overdue,
        score: scoreBreakdown(ds, u.id).total,
      };
    })
    .sort((a, b) => Number(b.submitted) - Number(a.submitted) || b.score - a.score);
}

// Real 6-week goal-completion trend computed from goals bucketed by weekOf.
export function weeklyGoalTrend(ds: Dataset): TrendPoint[] {
  const team = new Set(reportingUsers(ds).map((u) => u.id));
  const byWeek = new Map<string, { sum: number; n: number }>();
  for (const g of ds.goals) {
    if (!team.has(g.userId)) continue;
    const entry = byWeek.get(g.weekOf) ?? { sum: 0, n: 0 };
    entry.sum += clamp(pct(g.current, g.target));
    entry.n += 1;
    byWeek.set(g.weekOf, entry);
  }
  const weeks = [...byWeek.keys()].sort().slice(-6);
  return weeks.map((w) => ({ date: w, value: Math.round(byWeek.get(w)!.sum / byWeek.get(w)!.n) }));
}
