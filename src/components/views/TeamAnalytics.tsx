"use client";

import type { ReactNode } from "react";
import {
  Ban,
  CalendarCheck,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, EmptyState, PageHeader } from "@/components/common";
import { LineChart, Meter, TONE_HEX } from "@/components/charts";
import { scoreTone, shortDate } from "@/lib/format";
import {
  computeAllMetrics,
  goalCompletionByMember,
  missedReportTrend,
  teamProductivityTrend,
  weeklyGoalTrend,
} from "@/lib/scoring";
import type { Dataset, User } from "@/lib/types";

export function TeamAnalytics({ data }: { data: Dataset }) {
  const metrics = computeAllMetrics(data);
  const prod = teamProductivityTrend(data).map((p) => ({ label: shortDate(p.date), value: p.value }));
  const goalTrend = weeklyGoalTrend(data).map((p) => ({ label: shortDate(p.date), value: p.value }));
  const subTrend = missedReportTrend(data).map((p) => ({ label: shortDate(p.date), value: p.value }));
  const totalMissed = missedReportTrend(data).reduce((a, p) => a + ((p.expected ?? 0) - (p.submitted ?? 0)), 0);

  const topPerformers = metrics.slice(0, 6);
  const mostBlocked = [...metrics]
    .sort((a, b) => b.openBlockers - a.openBlockers || b.tasksBlocked - a.tasksBlocked)
    .filter((m) => m.openBlockers > 0)
    .slice(0, 6);
  const goalByMember = goalCompletionByMember(data);
  const maxBlock = Math.max(1, ...mostBlocked.map((m) => m.openBlockers));

  if (!metrics.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team Analytics" description="Trends and rankings across productivity, reporting, blockers and goals." />
        <EmptyState icon={<Users className="h-5 w-5" />} title="No analytics yet" description="Analytics populate automatically once employees join and start submitting reports." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team Analytics" description="Trends and rankings across productivity, reporting, blockers and goals." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Team productivity trend" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} hint="Average daily score · last 14 days">
          <LineChart points={prod} color={TONE_HEX.success} height={185} />
        </Panel>
        <Panel title="Goal completion trend" icon={<Target className="h-4 w-4 text-muted-foreground" />} hint="Team weekly goal completion · 6 weeks">
          <LineChart points={goalTrend} color={TONE_HEX.info} height={185} yUnit="%" />
        </Panel>
      </div>

      <Panel
        title="Reporting trend"
        icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
        hint={`Daily submission rate · ${totalMissed} missed reports in the last 14 days`}
      >
        <LineChart points={subTrend} color={TONE_HEX.warning} height={170} yUnit="%" />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top performers" icon={<Trophy className="h-4 w-4 text-amber-500" />}>
          <RankList
            rows={topPerformers.map((m) => ({
              user: m.user,
              value: m.score.total,
              max: 100,
              display: `${m.score.total}`,
              color: TONE_HEX[scoreTone(m.score.total)],
            }))}
          />
        </Panel>

        <Panel title="Most blocked employees" icon={<Ban className="h-4 w-4 text-rose-500" />}>
          {mostBlocked.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No blockers across the team right now. 🎉</p>
          ) : (
            <RankList
              rows={mostBlocked.map((m) => ({
                user: m.user,
                value: m.openBlockers,
                max: maxBlock,
                display: `${m.openBlockers}`,
                color: TONE_HEX.critical,
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel title="Weekly goal completion by member" icon={<Target className="h-4 w-4 text-muted-foreground" />}>
        <RankList
          rows={goalByMember.map((g) => ({
            user: g.user,
            value: g.pct,
            max: 100,
            display: `${g.pct}%`,
            color: TONE_HEX[scoreTone(g.pct)],
          }))}
          columns={2}
        />
      </Panel>
    </div>
  );
}

function Panel({ title, icon, hint, children }: { title: string; icon?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {icon}
      </div>
      {hint && <p className="mb-3 text-xs text-muted-foreground">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function RankList({
  rows,
  columns = 1,
}: {
  rows: { user: User; value: number; max: number; display: string; color: string }[];
  columns?: number;
}) {
  return (
    <ul className={cn(columns === 2 ? "grid gap-x-6 gap-y-3 sm:grid-cols-2" : "space-y-3")}>
      {rows.map((r) => (
        <li key={r.user.id} className="flex items-center gap-3">
          <Avatar user={r.user} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{r.user.name}</span>
              <span className="shrink-0 text-sm font-semibold tnum" style={{ color: r.color }}>{r.display}</span>
            </div>
            <Meter value={r.value} max={r.max} color={r.color} height={6} />
          </div>
        </li>
      ))}
    </ul>
  );
}
