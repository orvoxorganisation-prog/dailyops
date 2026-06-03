"use client";

import { useState } from "react";
import { ChevronDown, Flame } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/common";
import { LineChart, Meter, Sparkline, TONE_HEX } from "@/components/charts";
import { PageHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import { scoreLabel, scoreTone, shortDate } from "@/lib/format";
import { computeAllMetrics, lastNDates } from "@/lib/scoring";
import type { Dataset, EmployeeMetrics } from "@/lib/types";

type SortKey = "score" | "reportStreak" | "weeklyCompletionRate" | "sopComplianceScore" | "tasksCompleted";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Productivity score" },
  { key: "reportStreak", label: "Report streak" },
  { key: "weeklyCompletionRate", label: "Weekly completion" },
  { key: "sopComplianceScore", label: "SOP compliance" },
  { key: "tasksCompleted", label: "Tasks completed" },
];

export function Performance({ data }: { data: Dataset }) {
  const [sort, setSort] = useState<SortKey>("score");
  const [openId, setOpenId] = useState<string | null>(null);

  const metrics = computeAllMetrics(data).sort((a, b) => {
    const av = sort === "score" ? a.score.total : (a[sort] as number);
    const bv = sort === "score" ? b.score.total : (b[sort] as number);
    return bv - av;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Performance"
        description="Streaks, completion rates, SOP compliance and productivity scores for every team member."
        actions={
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.key} value={s.key}>Sort: {s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        {/* header */}
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_2rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
          <span>Employee</span>
          <span className="text-center">Streak</span>
          <span className="text-center">Tasks</span>
          <span className="text-center">Weekly</span>
          <span className="text-center">SOP</span>
          <span className="text-center">Score</span>
          <span />
        </div>
        <ul className="divide-y">
          {metrics.map((m, i) => (
            <PerformanceRow key={m.user.id} m={m} rank={i + 1} open={openId === m.user.id} onToggle={() => setOpenId(openId === m.user.id ? null : m.user.id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PerformanceRow({ m, rank, open, onToggle }: { m: EmployeeMetrics; rank: number; open: boolean; onToggle: () => void }) {
  const color = TONE_HEX[scoreTone(m.score.total)];
  const trendPoints = m.trend.map((v, idx) => ({ label: shortDate(lastNDates(14)[idx]), value: v }));

  return (
    <li>
      <button onClick={onToggle} className="grid w-full grid-cols-2 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_2rem]">
        <div className="flex items-center gap-3">
          <span className="hidden w-5 text-xs font-semibold text-muted-foreground tnum sm:block">#{rank}</span>
          <Avatar user={m.user} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{m.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.user.team}</p>
          </div>
        </div>
        <Cell className="hidden lg:flex">
          <span className="inline-flex items-center gap-1 tnum"><Flame className="h-3.5 w-3.5 text-amber-500" />{m.reportStreak}d</span>
        </Cell>
        <Cell className="hidden lg:flex"><span className="tnum">{m.tasksCompleted}/{m.tasksTotal}</span></Cell>
        <Cell className="hidden lg:flex"><span className="tnum">{m.weeklyCompletionRate}%</span></Cell>
        <Cell className="hidden lg:flex"><span className="tnum">{m.sopComplianceScore}%</span></Cell>
        <div className="flex items-center justify-end gap-2 lg:justify-center">
          <Sparkline values={m.trend} color={color} width={56} height={24} fill={false} />
          <span className="font-display text-lg font-semibold tnum" style={{ color }}>{m.score.total}</span>
        </div>
        <ChevronDown className={cn("hidden h-4 w-4 justify-self-end text-muted-foreground transition-transform lg:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="grid gap-5 border-t bg-muted/20 px-4 py-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score breakdown · {scoreLabel(m.score.total)}</p>
            <ul className="space-y-2.5">
              {([
                ["Report consistency", m.score.reportConsistency],
                ["Task completion", m.score.taskCompletion],
                ["Weekly goals", m.score.goalCompletion],
                ["Blocker control", m.score.blockerControl],
                ["SOP compliance", m.score.sopCompliance],
              ] as const).map(([label, v]) => (
                <li key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium tnum">{v}</span>
                  </div>
                  <Meter value={v} color={TONE_HEX[scoreTone(v)]} height={6} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">14-day productivity</p>
            <LineChart points={trendPoints} color={color} height={150} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <MiniFig label="Streak" value={`${m.reportStreak}d`} />
              <MiniFig label="Reports" value={`${m.reportsThisCycle}/${m.reportsExpected}`} />
              <MiniFig label="Blockers" value={m.openBlockers} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("items-center justify-center text-sm", className)}>{children}</div>;
}
function MiniFig({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card py-2">
      <p className="font-display text-base font-semibold tnum">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
