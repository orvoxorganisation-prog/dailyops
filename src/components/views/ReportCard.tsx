"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock,
  ExternalLink,
  Flag,
  Pencil,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, ProofIcon, Tag } from "@/components/common";
import { cn } from "@/lib/utils";
import { moodEmoji, prettyDate, relativeTime } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { DailyReport, User } from "@/lib/types";

export function ReportCard({
  report,
  author,
  review = false,
  onEdit,
  defaultOpen = false,
  showAuthor = false,
}: {
  report: DailyReport;
  author: User;
  review?: boolean;
  onEdit?: () => void;
  defaultOpen?: boolean;
  showAuthor?: boolean;
}) {
  const { toggleFlag } = useActions();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-xl border bg-card transition-colors", report.flagged && "border-rose-300/70 dark:border-rose-500/30")}>
      <div className="flex items-center gap-3 p-4">
        {showAuthor && <Avatar user={author} size="sm" />}
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-semibold">{prettyDate(report.date)}</span>
              {showAuthor && <span className="text-xs text-muted-foreground">· {author.name}</span>}
              {report.flagged ? (
                <Tag tone="critical"><ShieldAlert className="h-3 w-3" /> SOP flagged</Tag>
              ) : (
                <Tag tone="success"><ShieldCheck className="h-3 w-3" /> SOP met</Tag>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{report.completedToday}</p>
          </div>
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            {report.mood && <span title="Mood">{moodEmoji[report.mood]}</span>}
            <span className="inline-flex items-center gap-1 tnum"><Clock className="h-3.5 w-3.5" />{report.hoursWorked}h</span>
            <span className="tnum">{report.proof.length} proof</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          {report.flagged && report.flagReason && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{report.flagReason}</span>
            </div>
          )}

          <Section n={1} label="Completed today" text={report.completedToday} />
          <Section n={2} label="Progress made" text={report.progressMade} />
          <Section n={3} label="Planned next" text={report.plannedTomorrow} />
          <Section n={4} label="Blockers" text={report.blockers} tone={report.hasBlockers ? "warning" : undefined} />

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">5 · Proof of work</p>
            {report.proof.length === 0 ? (
              <p className="text-sm text-muted-foreground">No proof attached.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.proof.map((p) => (
                  <a
                    key={p.id}
                    href={p.url.startsWith("http") ? p.url : undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => !p.url.startsWith("http") && e.preventDefault()}
                    className="group inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm transition-colors hover:border-foreground/20"
                  >
                    <ProofIcon type={p.type} />
                    <span className="max-w-[160px] truncate">{p.label}</span>
                    {p.url.startsWith("http") && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">{report.submittedAt ? `Submitted ${relativeTime(report.submittedAt)}` : "Draft"}</span>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
              )}
              {review && (
                <Button variant={report.flagged ? "secondary" : "outline"} size="sm" onClick={() => toggleFlag(report.id, !report.flagged)}>
                  <Flag className="mr-1.5 h-3.5 w-3.5" />
                  {report.flagged ? "Clear flag" : "Flag"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ n, label, text, tone }: { n: number; label: string; text: string; tone?: "warning" }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{n} · {label}</p>
      <p className={cn("text-sm leading-relaxed", tone === "warning" && "text-amber-700 dark:text-amber-300")}>{text}</p>
    </div>
  );
}
