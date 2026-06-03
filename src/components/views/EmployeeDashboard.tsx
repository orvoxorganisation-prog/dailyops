"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Flame,
  Gauge,
  ListChecks,
  Pencil,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing, Sparkline, LineChart, Meter, TONE_HEX } from "@/components/charts";
import { Avatar, EmptyState, GoalStatusPill, StatCard } from "@/components/common";
import { ReportEditor } from "./ReportEditor";
import { TaskRow } from "./TaskRow";
import { cn } from "@/lib/utils";
import { prettyDate, scoreLabel, scoreTone, shortDate, todayISO } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import { computeMetrics, lastNDates } from "@/lib/scoring";
import type { Dataset, ScoreBreakdown, User } from "@/lib/types";

const BREAKDOWN: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "reportConsistency", label: "Report consistency" },
  { key: "taskCompletion", label: "Task completion" },
  { key: "goalCompletion", label: "Weekly goals" },
  { key: "blockerControl", label: "Blocker control" },
  { key: "sopCompliance", label: "SOP compliance" },
];

export function EmployeeDashboard({ user, data }: { user: User; data: Dataset }) {
  const { adjustGoal } = useActions();
  const [reportOpen, setReportOpen] = useState(false);
  const today = todayISO();

  const m = computeMetrics(data, user);
  const tasks = data.tasks;
  const goals = data.goals;
  const todaysReport = data.reports.find((r) => r.date === today);

  const open = tasks.filter((t) => t.status !== "completed");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = open.filter((t) => t.dueDate === today);
  const blocked = open.filter((t) => t.status === "blocked");
  const focusSet = new Map<string, (typeof tasks)[number]>();
  [...overdue, ...dueToday, ...blocked, ...open.filter((t) => t.status === "in_progress")].forEach((t) => focusSet.set(t.id, t));
  const focus = [...focusSet.values()].slice(0, 5);
  const pending = open.filter((t) => !focusSet.has(t.id)).slice(0, 5);
  const completedToday = tasks.filter((t) => t.completedAt?.slice(0, 10) === today).length;

  const ringColor = TONE_HEX[scoreTone(m.score.total)];
  const trendPoints = m.trend.map((v, i) => ({ label: shortDate(lastNDates(14)[i]), value: v }));
  const goalTitle = (id?: string) => goals.find((g) => g.id === id)?.title;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{user.name.split(" ")[0]}&apos;s dashboard</h1>
            <p className="text-sm text-muted-foreground">{user.title} · {user.team} · {prettyDate(today)}</p>
          </div>
        </div>
        <Button onClick={() => setReportOpen(true)} size="lg" variant={todaysReport ? "outline" : "default"}>
          {todaysReport ? <Pencil className="mr-2 h-4 w-4" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
          {todaysReport ? "Edit today's report" : "Submit today's report"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn("relative overflow-hidden rounded-xl border p-5 lg:col-span-2", todaysReport ? "border-teal-200/70 bg-teal-50/50 dark:border-teal-500/20 dark:bg-teal-500/5" : "border-amber-200/70 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5")}>
          <div className="grid-dots pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl", todaysReport ? "bg-teal-600 text-white" : "bg-amber-500 text-white")}>
                {todaysReport ? <CheckCircle2 className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-display text-lg font-semibold">{todaysReport ? "Today's report is in" : "Daily report pending"}</p>
                <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
                  {todaysReport
                    ? todaysReport.flagged
                      ? "Submitted, but flagged for SOP review — tap edit to fix it."
                      : "Logged and SOP-compliant. Your streak is safe."
                    : "Submit before end of day to keep your streak and stay compliant with the SOP."}
                </p>
              </div>
            </div>
            <Button onClick={() => setReportOpen(true)} variant={todaysReport ? "outline" : "default"}>{todaysReport ? "Edit" : "Submit now"}</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-4">
            <ScoreRing value={m.score.total} color={ringColor} size={84} stroke={8} sublabel="score" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Productivity</p>
              <p className="font-display text-lg font-semibold" style={{ color: ringColor }}>{scoreLabel(m.score.total)}</p>
              <div className="mt-1"><Sparkline values={m.trend} color={ringColor} width={120} height={28} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Productivity" value={m.score.total} icon={<Gauge className="h-4 w-4" />} tone={scoreTone(m.score.total)} hint={scoreLabel(m.score.total)} />
        <StatCard label="Report streak" value={`${m.reportStreak}d`} icon={<Flame className="h-4 w-4" />} tone="warning" hint={`${m.reportsThisCycle}/${m.reportsExpected} this cycle`} />
        <StatCard label="Tasks done" value={`${m.tasksCompleted}/${m.tasksTotal}`} icon={<ListChecks className="h-4 w-4" />} tone="success" hint={`${completedToday} completed today`} />
        <StatCard label="Open blockers" value={m.openBlockers} icon={<Ban className="h-4 w-4" />} tone={m.openBlockers ? "critical" : "success"} hint={m.openBlockers ? "Needs attention" : "All clear"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Today&apos;s focus</h2>
              <Button asChild variant="ghost" size="sm"><Link href="/tasks">All tasks <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
            </div>
            {focus.length ? (
              <div className="space-y-2">{focus.map((t) => (<TaskRow key={t.id} task={t} goalTitle={goalTitle(t.goalId)} goals={goals} />))}</div>
            ) : (
              <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Nothing urgent today" description="No overdue, due-today, or in-progress tasks. Plan ahead from your board." />
            )}
          </section>

          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold">Pending / up next</h2>
              <div className="space-y-2">{pending.map((t) => (<TaskRow key={t.id} task={t} goalTitle={goalTitle(t.goalId)} goals={goals} />))}</div>
            </section>
          )}

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">14-day productivity</h2>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Daily score from reporting, hours, blockers & SOP.</p>
            <LineChart points={trendPoints} color={ringColor} height={180} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Weekly goals</h2>
              <Button asChild variant="ghost" size="sm"><Link href="/goals">Manage <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
            </div>
            {goals.length ? (
              <ul className="space-y-4">
                {goals.map((g) => {
                  const p = Math.round((g.current / g.target) * 100);
                  const tone = g.status === "behind" ? "critical" : g.status === "at_risk" ? "warning" : "success";
                  return (
                    <li key={g.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium"><Target className="h-3.5 w-3.5 text-muted-foreground" />{g.title}</span>
                        <GoalStatusPill status={g.status} />
                      </div>
                      <Meter value={g.current} max={g.target} color={TONE_HEX[tone]} />
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="tnum">{g.current}/{g.target} {g.metricLabel}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustGoal(g.id, -1)} className="rounded border px-1.5 leading-tight hover:bg-muted">–</button>
                          <span className="tnum font-medium text-foreground">{p}%</span>
                          <button onClick={() => adjustGoal(g.id, 1)} className="rounded border px-1.5 leading-tight hover:bg-muted">+</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No goals this week. Add one from the Goals page.</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-display text-base font-semibold">Score breakdown</h2>
            <ul className="space-y-3">
              {BREAKDOWN.map(({ key, label }) => {
                const v = m.score[key];
                return (
                  <li key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium tnum">{v}</span></div>
                    <Meter value={v} color={TONE_HEX[scoreTone(v)]} height={6} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {reportOpen && <ReportEditor open={reportOpen} onOpenChange={setReportOpen} date={today} existing={todaysReport} />}
    </div>
  );
}
