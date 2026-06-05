"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { startOfWeek, subDays, format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, BarChart, Sparkline, TONE_HEX } from "@/components/charts";
import { Avatar, StatCard, EmptyState } from "@/components/common";
import { ExportButton } from "@/components/ExportButton";
import { prettyDate, scoreLabel, scoreTone, shortDate, todayISO } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import { companyKpis, companyKpisForRange, computeAllMetrics, missedReportTrend, teamProductivityTrend } from "@/lib/scoring";
import type { Dataset } from "@/lib/types";

export function CompanyDashboard({ data, companyName }: { data: Dataset; companyName: string }) {
  const { nudge, runDailyCheck } = useActions();
  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [period, setPeriod] = useState<"today" | "yesterday" | "week" | "custom">("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const periodMeta = useMemo(() => {
    if (period === "yesterday") return { from: yesterday, to: yesterday, label: "Yesterday" };
    if (period === "week") return { from: weekStart, to: today, label: "This week" };
    if (period === "custom") {
      const from = customFrom || today;
      const to = customTo || from;
      return { from, to, label: from === to ? prettyDate(from) : `${shortDate(from)} → ${shortDate(to)}` };
    }
    return { from: today, to: today, label: "Today" };
  }, [period, customFrom, customTo, today, yesterday, weekStart]);

  const kpi = companyKpis(data);
  const range = companyKpisForRange(data, periodMeta.from, periodMeta.to);
  const reportPct = range.expected ? Math.round((range.reports / range.expected) * 100) : 0;
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
          <p className="mt-1 text-sm text-muted-foreground">{companyName} · {periodMeta.label} · {kpi.totalEmployees} reporting member{kpi.totalEmployees === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <>
              <Input type="date" value={customFrom} max={customTo || today} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px]" aria-label="From date" />
              <Input type="date" value={customTo} min={customFrom || undefined} max={today} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px]" aria-label="To date" />
            </>
          )}
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
            <StatCard label="Reports" value={range.expected ? `${range.reports}/${range.expected}` : `${range.reports}`} icon={<CalendarCheck className="h-4 w-4" />} tone={range.expected && range.reports >= range.expected ? "success" : "warning"} hint={range.expected ? `${reportPct}% submitted` : "No reports due"} />
            <StatCard label="Missing reports" value={range.missing.length} icon={<CircleAlert className="h-4 w-4" />} tone={range.missing.length ? "critical" : "success"} hint={range.missing.length ? "Awaiting submission" : "All in"} />
            <StatCard label="Tasks done" value={range.tasksCompleted} icon={<ListChecks className="h-4 w-4" />} tone="success" />
            <StatCard label="Open blockers" value={kpi.openBlockers} icon={<Ban className="h-4 w-4" />} tone={kpi.openBlockers ? "critical" : "success"} />
            <StatCard label="Goal progress" value={`${kpi.weeklyGoalProgress}%`} icon={<Target className="h-4 w-4" />} tone={scoreTone(kpi.weeklyGoalProgress)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold"><CircleAlert className="h-4 w-4 text-rose-500" /> Missing reports</h2>
                <span className="text-xs text-muted-foreground tnum">{range.missing.length} pending</span>
              </div>
              {range.missing.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Everyone has reported{period === "today" ? " today" : " in this period"}. 🎉</p>
              ) : (
                <ul className="space-y-1">
                  {range.missing.map((u) => (
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
