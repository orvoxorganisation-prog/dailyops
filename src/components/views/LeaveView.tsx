"use client";

import { useState } from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState, Tag } from "@/components/common";
import { prettyDate } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { Leave, LeaveStatus } from "@/lib/types";

const tone = (s: LeaveStatus) => (s === "approved" ? "success" : s === "rejected" ? "critical" : "warning");

export function LeaveView({ leaves }: { leaves: Leave[] }) {
  const { cancelLeave } = useActions();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Request time off. While a leave is approved, your performance isn't tracked for those days."
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Request leave</Button>}
      />

      {leaves.length === 0 ? (
        <EmptyState
          icon={<CalendarOff className="h-5 w-5" />}
          title="No leave requests yet"
          description="Request leave and an admin will review it. Approved days are excluded from performance tracking."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Request leave</Button>}
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {leaves.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tnum">{prettyDate(l.startDate)} → {prettyDate(l.endDate)}</span>
                  <Tag tone={tone(l.status)}>{l.status}</Tag>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{l.reason}</p>
                {l.status === "rejected" && l.reviewNote && (
                  <p className="mt-1 text-xs text-rose-600">Admin note: {l.reviewNote}</p>
                )}
                {l.reviewedByName && (
                  <p className="mt-1 text-xs text-muted-foreground">Reviewed by {l.reviewedByName}</p>
                )}
              </div>
              {l.status === "pending" && (
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => cancelLeave(l.id)}>
                  <X className="mr-1 h-4 w-4" /> Withdraw
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <RequestLeaveDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function RequestLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { requestLeave } = useActions();
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await requestLeave({ reason, startDate, endDate });
    setBusy(false);
    if (res.ok) {
      setReason("");
      setStartDate("");
      setEndDate("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request leave</DialogTitle>
          <DialogDescription>An admin will review this. Approved days are excluded from performance tracking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">End date</Label>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Family event, medical, vacation…" className="min-h-[70px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim() || !startDate || !endDate}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
