"use client";

import { useMemo, useState } from "react";
import { startOfWeek, format } from "date-fns";
import { Inbox } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/common";
import { ExportButton } from "@/components/ExportButton";
import { ReportCard } from "./ReportCard";
import { todayISO } from "@/lib/format";
import { reportingUsers } from "@/lib/scoring";
import type { Dataset } from "@/lib/types";

export function AllReports({ data }: { data: Dataset }) {
  const team = reportingUsers(data);
  const userById = useMemo(() => Object.fromEntries(data.users.map((u) => [u.id, u])), [data.users]);

  const [who, setWho] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "flagged" | "clean">("all");
  const [period, setPeriod] = useState<"today" | "week" | "all">("today");

  const today = todayISO();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const reports = data.reports
    .filter((r) => (who === "all" ? true : r.userId === who))
    .filter((r) => (status === "all" ? true : status === "flagged" ? r.flagged : !r.flagged))
    .filter((r) => (period === "all" ? true : period === "today" ? r.date === today : r.date >= weekStart))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.userId < b.userId ? -1 : 1));

  const flaggedCount = reports.filter((r) => r.flagged).length;

  const exportRows = reports.map((r) => ({
    date: r.date,
    employee: userById[r.userId]?.name ?? r.userId,
    status: r.flagged ? "flagged" : "submitted",
    hours: r.hoursWorked,
    completed_today: r.completedToday,
    progress_made: r.progressMade,
    planned_next: r.plannedTomorrow,
    blockers: r.hasBlockers ? r.blockers : "",
    proof_count: r.proof.length,
    mood: r.mood ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Reports"
        description={`Browse every submitted report across the team. ${flaggedCount} flagged in this view.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton filename="all-reports" rows={exportRows} />
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {team.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="flagged">Flagged only</SelectItem>
                <SelectItem value="clean">SOP-met only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {reports.length === 0 ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title="No reports match" description="Try widening the filters or selecting a different period." />
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} author={userById[r.userId]} review showAuthor />
          ))}
        </div>
      )}
    </div>
  );
}
