"use client";

import Link from "next/link";
import {
  Ban,
  BellRing,
  CalendarCheck,
  CircleAlert,
  ListChecks,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart, Sparkline, TONE_HEX } from "@/components/charts";
import { Avatar, StatCard, EmptyState } from "@/components/common";
import { ExportButton } from "@/components/ExportButton";
import { prettyDate, scoreLabel, scoreTone, shortDate, todayISO } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import { companyKpis, computeAllMetrics, missedReportTrend, teamProductivityTrend } from "@/lib/scoring";
import type { Dataset } from "@/lib/types";

export function CompanyDashboard({ data, companyName }: { data: Dataset; companyName: string }) {
  const { nudge, runDailyCheck } = useActions();
  const today = todayISO();
  const kpi = companyKpis(data);
  const metrics = computeAllMetrics(data);
  const prodTrend = teamProductivityTrend(data).map((p) => ({ label: shortDate(p.date), value: p.value }));
  const subTrend = missedReportTrend(data).map((p) => ({ label: shortDate(p.date), value: p.value, color: p.value >= 90 ? TONE_HEX.success : p.value >= 70 ? TONE_HEX.warning : TONE_HEX.critical }));

  const blockedTasks = data.tasks.filter((t) => t.status === "blocked");
  const topPerformers = metrics.slice(0, 4);
  const hasTeam = kpi.totalEmployees > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Company Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">{companyName} · {prettyDate(today)} · {kpi.totalEmployees} reporting member{kpi.totalEmployees === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename="company-overview"
            rows={metrics.map((m) => ({
              employee: m.user.name,
              team: m.user.team,
              role: m.user.role,
              score: m.score.total,
              submitted_today: m.submittedToday ? "yes" : "no",
              report_streak_days: m.reportStreak,
              reports: `${m.reportsThisCycle}/${m.reportsExpected}`,
              weekly_completion_pct: m.weeklyCompletionRate,
              sop_compliance_pct: m.sopComplianceScore,
              tasks_completed: m.tasksCompleted,
              tasks_total: m.tasksTotal,
              open_blockers: m.openBlockers,
            }))}
          />
          <Button onClick={() => runDailyCheck()} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Run daily check</Button>
        </div>
      </div>

      {!hasTeam ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No employees yet" description="Once employees sign up and submit reports, their activity and analytics will appear here in real time." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Team members" value={kpi.totalEmployees} icon={<Users className="h-4 w-4" />} tone="info" />
            <StatCard label="Reports today" value={`${kpi.reportsToday}/${kpi.totalEmployees}`} icon={<CalendarCheck className="h-4 w-4" />} tone={kpi.reportsToday === kpi.totalEmployees ? "success" : "warning"} hint={`${Math.round((kpi.reportsToday / kpi.totalEmployees) * 100)}% submitted`} />
            <StatCard label="Missing reports" value={kpi.missingToday.length} icon={<CircleAlert className="h-4 w-4" />} tone={kpi.missingToday.length ? "critical" : "success"} hint={kpi.missingToday.length ? "Awaiting submission" : "All in"} />
            <StatCard label="Tasks done today" value={kpi.tasksCompletedToday} icon={<ListChecks className="h-4 w-4" />} tone="success" />
            <StatCard label="Open blockers" value={kpi.openBlockers} icon={<Ban className="h-4 w-4" />} tone={kpi.openBlockers ? "critical" : "success"} />
            <StatCard label="Goal progress" value={`${kpi.weeklyGoalProgress}%`} icon={<Target className="h-4 w-4" />} tone={scoreTone(kpi.weeklyGoalProgress)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold"><CircleAlert className="h-4 w-4 text-rose-500" /> Missing reports</h2>
                <span className="text-xs text-muted-foreground tnum">{kpi.missingToday.length} pending</span>
              </div>
              {kpi.missingToday.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Everyone has reported today. 🎉</p>
              ) : (
                <ul className="space-y-1">
                  {kpi.missingToday.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
                      <Avatar user={u} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.title} · {u.team}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => nudge(u.id, u.name)}><BellRing className="mr-1.5 h-3.5 w-3.5" /> Nudge</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold"><Ban className="h-4 w-4 text-rose-500" /> Open blockers</h2>
                <span className="text-xs text-muted-foreground tnum">{blockedTasks.length} active</span>
              </div>
              {blockedTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No blockers across the team.</p>
              ) : (
                <ul className="space-y-1">
                  {blockedTasks.slice(0, 6).map((t) => {
                    const u = data.users.find((x) => x.id === t.userId);
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
                        {u && <Avatar user={u} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{u?.name} · {u?.team}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-1 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Team productivity</h2><TrendingUp className="h-4 w-4 text-muted-foreground" /></div>
              <p className="mb-3 text-xs text-muted-foreground">Average daily productivity score · last 14 days</p>
              <LineChart points={prodTrend} color={TONE_HEX.success} height={180} />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-1 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Report submission rate</h2><CalendarCheck className="h-4 w-4 text-muted-foreground" /></div>
              <p className="mb-3 text-xs text-muted-foreground">Daily % of team submitting reports · last 14 days</p>
              <BarChart data={subTrend} height={180} yUnit="%" />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Top performers</h2>
              <Button asChild variant="ghost" size="sm"><Link href="/performance">View all <TrendingUp className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topPerformers.map((m, i) => {
                const color = TONE_HEX[scoreTone(m.score.total)];
                return (
                  <div key={m.user.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-xs font-semibold text-muted-foreground tnum">#{i + 1}</span>
                      <Avatar user={m.user} size="sm" />
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{m.user.name}</p><p className="truncate text-xs text-muted-foreground">{m.user.team}</p></div>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div><p className="font-display text-2xl font-semibold tnum" style={{ color }}>{m.score.total}</p><p className="text-xs text-muted-foreground">{scoreLabel(m.score.total)}</p></div>
                      <Sparkline values={m.trend} color={color} width={80} height={32} fill={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
