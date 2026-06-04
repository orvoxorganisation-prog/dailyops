"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Minus, MoreHorizontal, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreRing, Meter, TONE_HEX } from "@/components/charts";
import { PageHeader, EmptyState, GoalStatusPill } from "@/components/common";
import { cn } from "@/lib/utils";
import { prettyDate, weekOptions, weekRangeLabel } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { GoalStatus, Task, WeeklyGoal } from "@/lib/types";

const goalTone = (s: GoalStatus) => (s === "behind" ? "critical" : s === "at_risk" ? "warning" : "success");

export function WeeklyGoals({ goals, tasks }: { goals: WeeklyGoal[]; tasks: Task[] }) {
  const { adjustGoal, deleteGoal } = useActions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WeeklyGoal | null>(null);

  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + Math.min(100, (g.current / g.target) * 100), 0) / goals.length) : 0;
  const byStatus = (s: GoalStatus) => goals.filter((g) => g.status === s).length;
  const deadline = goals[0]?.deadline;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Goals"
        description="Set measurable goals, choose which week they're for, and keep them on pace."
        actions={<Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New goal</Button>}
      />

      {goals.length === 0 ? (
        <EmptyState icon={<Target className="h-5 w-5" />} title="No goals yet" description="Create a weekly goal to track measurable progress." action={<Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New goal</Button>} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
              <ScoreRing value={avg} color={TONE_HEX[avg >= 70 ? "success" : avg >= 45 ? "warning" : "critical"]} size={84} stroke={8} label={`${avg}%`} sublabel="avg" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average completion</p>
                <p className="font-display text-lg font-semibold">{goals.length} active goal{goals.length > 1 ? "s" : ""}</p>
                {deadline && <p className="mt-0.5 text-sm text-muted-foreground">Next due {prettyDate(deadline)}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <MiniStat label="On track" value={byStatus("on_track")} tone="text-emerald-600" />
              <MiniStat label="At risk" value={byStatus("at_risk")} tone="text-amber-600" />
              <MiniStat label="Behind" value={byStatus("behind")} tone="text-rose-600" />
              <MiniStat label="Completed" value={byStatus("completed")} tone="text-teal-600" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                tasks={tasks.filter((t) => t.goalId === g.id)}
                onAdjust={(d) => adjustGoal(g.id, d)}
                onEdit={() => setEditing(g)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </div>
        </>
      )}

      <GoalDialog open={creating} onOpenChange={setCreating} />
      {editing && <GoalDialog open onOpenChange={(v) => !v && setEditing(null)} goal={editing} />}
    </div>
  );
}

function GoalCard({
  goal,
  tasks,
  onAdjust,
  onEdit,
  onDelete,
}: {
  goal: WeeklyGoal;
  tasks: Task[];
  onAdjust: (delta: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const tone = goalTone(goal.status);
  const linkedDone = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Target className="h-4 w-4" /></span>
          <div>
            <h3 className="font-display font-semibold leading-tight">{goal.title}</h3>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">{goal.metricLabel}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> {weekRangeLabel(goal.weekOf)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <GoalStatusPill status={goal.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit goal</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete goal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="font-display text-2xl font-semibold tnum" style={{ color: TONE_HEX[tone] }}>{pct}%</span>
          <span className="text-sm text-muted-foreground tnum">{goal.current} / {goal.target} {goal.metricLabel}</span>
        </div>
        <Meter value={goal.current} max={goal.target} color={TONE_HEX[tone]} height={10} />
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 rounded-lg bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Linked tasks</span>
            <span className="tnum text-muted-foreground">{linkedDone}/{tasks.length} done</span>
          </div>
          <ul className="mt-2 space-y-1">
            {tasks.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={cn("h-3.5 w-3.5", t.status === "completed" ? "text-teal-600" : "text-muted-foreground/40")} />
                <span className={cn("truncate", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Update progress</span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onAdjust(-1)} disabled={goal.current <= 0}><Minus className="h-3.5 w-3.5" /></Button>
          <span className="w-10 text-center font-display text-lg font-semibold tnum">{goal.current}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onAdjust(1)} disabled={goal.current >= goal.target}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (v: boolean) => void; goal?: WeeklyGoal }) {
  const { createGoal, updateGoal } = useActions();
  const weeks = useMemo(() => {
    const opts = weekOptions(6);
    // When editing a goal whose week isn't in the upcoming list (e.g. a past week), include it.
    if (goal && !opts.some((o) => o.value === goal.weekOf)) {
      return [{ value: goal.weekOf, label: `${weekRangeLabel(goal.weekOf)} (current)` }, ...opts];
    }
    return opts;
  }, [goal]);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [metricLabel, setMetricLabel] = useState(goal?.metricLabel ?? "");
  const [target, setTarget] = useState(goal?.target ?? 5);
  const [weekOf, setWeekOf] = useState(goal?.weekOf ?? weeks[0]?.value ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const payload = { title, metricLabel, target: Number(target), weekOf };
    const res = goal ? await updateGoal(goal.id, payload) : await createGoal(payload);
    setBusy(false);
    if (res.ok) {
      if (!goal) {
        setTitle("");
        setMetricLabel("");
        setTarget(5);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{goal ? "Edit weekly goal" : "New weekly goal"}</DialogTitle>
          <DialogDescription>Set a measurable target and choose which week it&apos;s for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-sm">Goal</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ship the onboarding redesign" autoFocus />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Which week?</Label>
            <Select value={weekOf} onValueChange={setWeekOf}>
              <SelectTrigger><SelectValue placeholder="Choose a week" /></SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Metric</Label>
              <Input value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} placeholder="flows delivered" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Target</Label>
              <Input type="number" min={1} max={1000} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim() || !metricLabel.trim() || !weekOf}>{goal ? "Save goal" : "Create goal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className={cn("font-display text-2xl font-semibold tnum", tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
