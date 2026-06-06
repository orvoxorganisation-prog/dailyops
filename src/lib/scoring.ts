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
  taskCompletion: 0.2,
  tasksDone: 0.15,
  goalCompletion: 0.2,
  quality: 0.2,
};

// Completing this many tasks within the 14-day cycle earns full "tasks done" marks.
const TASKS_DONE_TARGET = 8;

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

/** Is this user on an approved leave covering the given YYYY-MM-DD date? */
export const onLeave = (ds: Dataset, id: string, date: string): boolean =>
  (ds.leaves ?? []).some(
    (l) => l.userId === id && l.status === "approved" && l.startDate <= date && date <= l.endDate
  );

export function reportingUsers(ds: Dataset): User[] {
  return ds.users.filter((u) => u.role === "employee" && u.active);
}

export function computeStreak(reports: DailyReport[], isOnLeave: (d: string) => boolean = () => false): number {
  const have = new Set(reports.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  if (!have.has(format(cursor, "yyyy-MM-dd"))) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 60; i++) {
    const key = format(cursor, "yyyy-MM-dd");
    // Weekends and approved-leave days are skipped — they don't break the streak.
    if (!isWeekday(cursor) || isOnLeave(key)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
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

function userDayScores(ds: Dataset, id: string, dates: string[]): (number | null)[] {
  const byDate = new Map(uReports(ds, id).map((r) => [r.date, r]));
  const goalsPct = goalCompletionForUser(ds, id);
  // null = not tracked (approved leave); 0 = expected day with no report.
  // (No synthetic fill for empty days — real data only.)
  return dates.map((d) => {
    if (onLeave(ds, id, d)) return null;
    const rep = byDate.get(d);
    if (!rep) return 0;
    return clamp(
      46 + (rep.hoursWorked - 6) * 5 + (rep.sopFollowed ? 12 : -16) + (rep.hasBlockers ? -10 : 6) + goalsPct * 0.1
    );
  });
}

export function scoreBreakdown(ds: Dataset, id: string): ScoreBreakdown {
  const reports = uReports(ds, id);
  const tasks = uTasks(ds, id);
  const cycle = lastNDates(14);
  const joined = (ds.users.find((u) => u.id === id)?.createdAt ?? "").slice(0, 10);
  // Expected = weekdays since the member joined, excluding approved leave.
  const workdays = cycle.filter((d) => isWeekday(parseISO(d)) && d >= joined && !onLeave(ds, id, d));
  const expected = workdays.length;
  const have = new Set(reports.map((r) => r.date));
  // Credit every cycle day the member actually reported (incl. weekends), minus leave days.
  const submitted = cycle.filter((d) => have.has(d) && !onLeave(ds, id, d)).length;
  const reportConsistency = expected ? clamp(pct(submitted, expected)) : 100;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const taskCompletion = total ? clamp(pct(completed, total)) : 0;

  // Volume of tasks completed within the cycle (TASKS_DONE_TARGET = full marks).
  const cycleSet = new Set(cycle);
  const tasksDoneInCycle = tasks.filter((t) => t.completedAt && cycleSet.has(t.completedAt.slice(0, 10))).length;
  const tasksDone = clamp((tasksDoneInCycle / TASKS_DONE_TARGET) * 100);

  const goalCompletion = goalCompletionForUser(ds, id);

  // Quality = share of cycle reports that passed admin review (i.e. were not flagged).
  const cycleReports = reports.filter((r) => cycleSet.has(r.date));
  const clean = cycleReports.filter((r) => !r.flagged).length;
  const quality = cycleReports.length ? clamp(pct(clean, cycleReports.length)) : 100;

  const total100 = Math.round(
    reportConsistency * SCORE_WEIGHTS.reportConsistency +
      taskCompletion * SCORE_WEIGHTS.taskCompletion +
      tasksDone * SCORE_WEIGHTS.tasksDone +
      goalCompletion * SCORE_WEIGHTS.goalCompletion +
      quality * SCORE_WEIGHTS.quality
  );

  return { reportConsistency, taskCompletion, tasksDone, goalCompletion, quality, total: clamp(total100) };
}

export function computeMetrics(ds: Dataset, user: User): EmployeeMetrics {
  const reports = uReports(ds, user.id);
  const tasks = uTasks(ds, user.id);
  const cycle = lastNDates(14);
  const joined = user.createdAt.slice(0, 10);
  const workdays = cycle.filter((d) => isWeekday(parseISO(d)) && d >= joined && !onLeave(ds, user.id, d));
  const expected = workdays.length;
  const have = new Set(reports.map((r) => r.date));
  const submitted = cycle.filter((d) => have.has(d) && !onLeave(ds, user.id, d)).length;
  const score = scoreBreakdown(ds, user.id);
  const today = todayStr();

  return {
    user,
    reportStreak: computeStreak(reports, (d) => onLeave(ds, user.id, d)),
    reportsThisCycle: submitted,
    reportsExpected: expected,
    tasksCompleted: tasks.filter((t) => t.status === "completed").length,
    tasksTotal: tasks.length,
    tasksBlocked: tasks.filter((t) => t.status === "blocked").length,
    weeklyCompletionRate: goalCompletionForUser(ds, user.id),
    openBlockers: tasks.filter((t) => t.status === "blocked").length,
    qualityScore: score.quality,
    score,
    submittedToday: have.has(today),
    flaggedToday: reports.some((r) => r.date === today && r.flagged),
    // Keep 14 points so date labels align; leave days surface as 0 in the
    // decorative sparkline (the score/consistency metrics already exclude them).
    trend: userDayScores(ds, user.id, cycle).map((v) => v ?? 0),
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
  const missingToday = team.filter((u) => !reportedIds.has(u.id) && !onLeave(ds, u.id, today));
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

function datesBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const cur = parseISO(fromISO);
  const end = parseISO(toISO);
  for (let i = 0; cur <= end && i < 400; i++) {
    out.push(format(cur, "yyyy-MM-dd"));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export interface RangeKpis {
  reports: number;
  expected: number;
  missing: User[];
  tasksCompleted: number;
  singleDay: boolean;
}

/** Period-aware company metrics for an inclusive [fromISO, toISO] date range.
 *  Expected counts only weekdays, members who existed, and excludes approved leave. */
export function companyKpisForRange(ds: Dataset, fromISO: string, toISO: string): RangeKpis {
  const team = reportingUsers(ds);
  const teamIds = new Set(team.map((u) => u.id));
  const reportsInRange = ds.reports.filter((r) => teamIds.has(r.userId) && r.date >= fromISO && r.date <= toISO);
  const reporterIds = new Set(reportsInRange.map((r) => r.userId));

  let expected = 0;
  for (const d of datesBetween(fromISO, toISO)) {
    if (!isWeekday(parseISO(d))) continue;
    for (const u of team) {
      if (u.createdAt.slice(0, 10) <= d && !onLeave(ds, u.id, d)) expected++;
    }
  }

  const missing = team.filter(
    (u) => !reporterIds.has(u.id) && u.createdAt.slice(0, 10) <= toISO && !onLeave(ds, u.id, toISO)
  );

  const tasksCompleted = ds.tasks.filter(
    (t) => t.completedAt && t.completedAt.slice(0, 10) >= fromISO && t.completedAt.slice(0, 10) <= toISO
  ).length;

  return { reports: reportsInRange.length, expected, missing, tasksCompleted, singleDay: fromISO === toISO };
}

export interface TrendPoint {
  date: string;
  value: number;
  submitted?: number;
  expected?: number;
}

export function missedReportTrend(ds: Dataset, days = 14): TrendPoint[] {
  const team = reportingUsers(ds);
  return lastNDates(days).map((d) => {
    const weekday = isWeekday(parseISO(d));
    // Members who existed and were NOT on approved leave that day — leave days
    // aren't counted as missed, and pre-creation days aren't counted at all.
    const dueUsers = team.filter((u) => u.createdAt.slice(0, 10) <= d && !onLeave(ds, u.id, d));
    const dueIds = new Set(dueUsers.map((u) => u.id));
    const expected = weekday ? dueUsers.length : 0;
    const submitted = ds.reports.filter((r) => r.date === d && dueIds.has(r.userId)).length;
    return { date: d, value: expected ? clamp(pct(submitted, expected)) : 0, submitted, expected };
  });
}

export function teamProductivityTrend(ds: Dataset, days = 14): TrendPoint[] {
  const team = reportingUsers(ds);
  const dates = lastNDates(days);
  const scores = new Map(team.map((u) => [u.id, userDayScores(ds, u.id, dates)]));
  return dates.map((d, i) => {
    // Average only over members who existed and were tracked (not on leave) that day.
    const tracked = team
      .filter((u) => u.createdAt.slice(0, 10) <= d)
      .map((u) => scores.get(u.id)![i])
      .filter((v): v is number => v !== null);
    const avg = tracked.length ? tracked.reduce((a, v) => a + v, 0) / tracked.length : 0;
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
