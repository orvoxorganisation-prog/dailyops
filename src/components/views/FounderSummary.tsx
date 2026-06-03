"use client";

import {
  Ban,
  BellRing,
  CalendarClock,
  CircleAlert,
  Clock,
  Hourglass,
  ShieldAlert,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Tag, EmptyState } from "@/components/common";
import { cn } from "@/lib/utils";
import { prettyDate, scoreTone, todayISO } from "@/lib/format";
import { TONE_HEX } from "@/components/charts";
import { useActions } from "@/lib/useActions";
import { founderSummary } from "@/lib/scoring";
import type { Dataset } from "@/lib/types";

export function FounderSummary({ data, companyName }: { data: Dataset; companyName: string }) {
  const { nudge } = useActions();
  const today = todayISO();
  const rows = founderSummary(data);

  const submitted = rows.filter((r) => r.submitted);
  const missing = rows.filter((r) => !r.submitted);
  const blockers = rows.filter((r) => r.blockers);
  const delayed = rows.filter((r) => r.overdueCount > 0);
  const wins = [...submitted].filter((r) => !r.flagged).sort((a, b) => b.score - a.score).slice(0, 3);

  const tiles = [
    { label: "Reports in", value: `${submitted.length}/${rows.length}`, icon: CalendarClock, tone: "text-teal-600" },
    { label: "Missing", value: missing.length, icon: CircleAlert, tone: "text-rose-600" },
    { label: "Major wins", value: wins.length, icon: Trophy, tone: "text-amber-600" },
    { label: "Blockers", value: blockers.length, icon: Ban, tone: "text-rose-600" },
    { label: "Delayed", value: delayed.length, icon: Hourglass, tone: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b pb-5">
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h1 className="font-display text-2xl font-semibold tracking-tight">Daily Founder Summary</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">{companyName} · {prettyDate(today)} · auto-generated from today&apos;s reports &amp; tasks</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Nothing to summarize yet" description="Once employees submit daily reports, this digest fills in automatically." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border bg-card p-4">
                <t.icon className={cn("h-5 w-5", t.tone)} />
                <p className="mt-2 font-display text-2xl font-semibold tnum">{t.value}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>

          {wins.length > 0 && (
            <section className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold"><Trophy className="h-4 w-4 text-amber-500" /> Major wins today</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {wins.map((w) => (
                  <div key={w.user.id} className="rounded-lg border bg-card p-3.5">
                    <div className="flex items-center gap-2"><Avatar user={w.user} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium">{w.user.name}</p><p className="truncate text-xs text-muted-foreground">{w.user.team}</p></div></div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{w.completed}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-base font-semibold">What everyone did today</h2>
            <div className="space-y-2.5">
              {rows.map((r) => {
                const color = TONE_HEX[scoreTone(r.score)];
                return (
                  <div key={r.user.id} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start", !r.submitted && "border-rose-200/70 bg-rose-50/30 dark:border-rose-500/20 dark:bg-rose-500/5")}>
                    <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
                      <Avatar user={r.user} size="md" />
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{r.user.name}</p><p className="truncate text-xs text-muted-foreground">{r.user.title}</p></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      {r.submitted ? (
                        <>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            {r.flagged && <Tag tone="critical"><ShieldAlert className="h-3 w-3" /> Flagged</Tag>}
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tnum"><Clock className="h-3 w-3" /> {r.hours}h</span>
                          </div>
                          <p className="text-sm leading-relaxed">{r.completed}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {r.blockers && <Tag tone="warning"><Ban className="h-3 w-3" /> {r.blockers}</Tag>}
                            {r.overdueCount > 0 && <Tag tone="critical"><Hourglass className="h-3 w-3" /> {r.overdueCount} overdue</Tag>}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-rose-600 dark:text-rose-400">No report submitted today.</p>
                          <Button size="sm" variant="outline" onClick={() => nudge(r.user.id, r.user.name)}><BellRing className="mr-1.5 h-3.5 w-3.5" /> Nudge</Button>
                        </div>
                      )}
                    </div>
                    {r.submitted && (
                      <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end">
                        <span className="font-display text-xl font-semibold tnum" style={{ color }}>{r.score}</span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">score</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
