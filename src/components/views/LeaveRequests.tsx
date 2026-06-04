"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Tag } from "@/components/common";
import { ExportButton } from "@/components/ExportButton";
import { prettyDate } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { Leave, LeaveStatus } from "@/lib/types";

const tone = (s: LeaveStatus) => (s === "approved" ? "success" : s === "rejected" ? "critical" : "warning");

export function LeaveRequests({ leaves }: { leaves: Leave[] }) {
  const pending = leaves.filter((l) => l.status === "pending");
  const reviewed = leaves.filter((l) => l.status !== "pending");

  const rows = leaves.map((l) => ({
    employee: l.userName,
    status: l.status,
    start_date: l.startDate,
    end_date: l.endDate,
    reason: l.reason,
    reviewed_by: l.reviewedByName ?? "",
    review_note: l.reviewNote ?? "",
    requested_at: l.createdAt.slice(0, 10),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave requests"
        description="Approve or decline time-off requests. Approved leave pauses performance tracking for those days."
        actions={<ExportButton filename="leave-requests" rows={rows} />}
      />
      <Section title={`Pending · ${pending.length}`} leaves={pending} empty="No pending requests right now." />
      <Section title="History" leaves={reviewed} empty="No reviewed requests yet." reviewed />
    </div>
  );
}

function Section({ title, leaves, empty, reviewed }: { title: string; leaves: Leave[]; empty: string; reviewed?: boolean }) {
  return (
    <div>
      <h2 className="mb-2 font-display text-base font-semibold">{title}</h2>
      {leaves.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {leaves.map((l) => (
            <LeaveRow key={l.id} leave={l} reviewed={reviewed} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaveRow({ leave: l, reviewed }: { leave: Leave; reviewed?: boolean }) {
  const { reviewLeave } = useActions();
  const [busy, setBusy] = useState(false);
  const act = async (decision: "approve" | "reject") => {
    setBusy(true);
    await reviewLeave(l.id, decision);
    setBusy(false);
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{l.userName}</span>
          <Tag tone={tone(l.status)}>{l.status}</Tag>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground tnum">{prettyDate(l.startDate)} → {prettyDate(l.endDate)}</p>
        <p className="mt-1 text-sm">{l.reason}</p>
        {reviewed && l.reviewedByName && (
          <p className="mt-1 text-xs text-muted-foreground">
            Reviewed by {l.reviewedByName}
            {l.reviewNote ? ` · ${l.reviewNote}` : ""}
          </p>
        )}
      </div>
      {!reviewed && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reject")}>
            <X className="mr-1 h-4 w-4" /> Decline
          </Button>
          <Button size="sm" disabled={busy} onClick={() => act("approve")}>
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
        </div>
      )}
    </div>
  );
}
