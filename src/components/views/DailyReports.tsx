"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { CalendarCheck, Clock, Flame, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/common";
import { ReportCard } from "./ReportCard";
import { ReportEditor } from "./ReportEditor";
import { cn } from "@/lib/utils";
import { prettyDate, todayISO } from "@/lib/format";
import { computeMetrics, lastNDates } from "@/lib/scoring";
import type { DailyReport, User } from "@/lib/types";

export function DailyReports({ user, reports }: { user: User; reports: DailyReport[] }) {
  const today = todayISO();
  const [editor, setEditor] = useState<{ date: string; existing?: DailyReport } | null>(null);

  const sorted = [...reports].sort((a, b) => (a.date < b.date ? 1 : -1));
  const todaysReport = sorted.find((r) => r.date === today);
  const m = computeMetrics({ users: [user], reports: sorted, tasks: [], goals: [] }, user);
  const avgHours = sorted.length
    ? (sorted.slice(0, 14).reduce((a, r) => a + r.hoursWorked, 0) / Math.min(14, sorted.length)).toFixed(1)
    : "0";

  const heat = useMemo(() => {
    const byDate = new Map(sorted.map((r) => [r.date, r]));
    return lastNDates(28)
      .filter((iso) => {
        const g = parseISO(iso).getDay();
        return g !== 0 && g !== 6;
      })
      .map((iso) => {
        const r = byDate.get(iso);
        return { iso, state: !r ? "missing" : r.flagged ? "flagged" : "submitted" } as const;
      });
  }, [sorted]);

  const stats = [
    { label: "Streak", value: `${m.reportStreak}d`, icon: Flame, tone: "text-amber-600" },
    { label: "This cycle", value: `${m.reportsThisCycle}/${m.reportsExpected}`, icon: CalendarCheck, tone: "text-teal-600" },
    { label: "SOP compliance", value: `${m.sopComplianceScore}%`, icon: ShieldCheck, tone: "text-sky-600" },
    { label: "Avg hours", value: `${avgHours}h`, icon: Clock, tone: "text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Reports"
        description="Your SOP-structured end-of-day reports and submission history."
        actions={
          <Button onClick={() => setEditor({ date: today, existing: todaysReport })} variant={todaysReport ? "outline" : "default"}>
            {todaysReport ? <Pencil className="mr-2 h-4 w-4" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
            {todaysReport ? "Edit today's report" : "Submit today's report"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <s.icon className={cn("h-5 w-5", s.tone)} />
            <div>
              <p className="font-display text-xl font-semibold tnum leading-none">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Reporting consistency</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Legend className="bg-teal-500" label="Submitted" />
            <Legend className="bg-amber-500" label="Flagged" />
            <Legend className="bg-muted-foreground/25" label="Missed" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {heat.map((h) => (
            <span key={h.iso} title={`${prettyDate(h.iso)} — ${h.state}`} className={cn("h-7 w-7 rounded-md", h.state === "submitted" && "bg-teal-500/85", h.state === "flagged" && "bg-amber-500/85", h.state === "missing" && "bg-muted-foreground/20")} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Last 4 weeks of working days. Hover for detail.</p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">History <span className="text-sm font-normal text-muted-foreground">({sorted.length})</span></h2>
        {sorted.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No reports yet" description="Submit your first daily report to start building your streak." action={<Button onClick={() => setEditor({ date: today })}>Submit today&apos;s report</Button>} />
        ) : (
          <div className="space-y-2.5">
            {sorted.map((r) => (<ReportCard key={r.id} report={r} author={user} defaultOpen={r.date === today} onEdit={() => setEditor({ date: r.date, existing: r })} />))}
          </div>
        )}
      </div>

      {editor && <ReportEditor open={!!editor} onOpenChange={(v) => !v && setEditor(null)} date={editor.date} existing={editor.existing} />}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", className)} />
      {label}
    </span>
  );
}
