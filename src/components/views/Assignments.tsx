"use client";

import { useState } from "react";
import { CalendarDays, ListTodo, Target, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  EmptyState,
  GoalStatusPill,
  PageHeader,
  PriorityTag,
  StatCard,
  Tag,
  TaskStatusPill,
} from "@/components/common";
import { ExportButton } from "@/components/ExportButton";
import { Meter, TONE_HEX } from "@/components/charts";
import { cn } from "@/lib/utils";
import { prettyDate, weekRangeLabel } from "@/lib/format";
import { reportingUsers } from "@/lib/scoring";
import type { Dataset, GoalStatus, Task, User, WeeklyGoal } from "@/lib/types";

const goalTone = (s: GoalStatus) => (s === "behind" ? "critical" : s === "at_risk" ? "warning" : "success");
const TASK_ORDER: Record<Task["status"], number> = { blocked: 0, in_progress: 1, not_started: 2, completed: 3 };

export function Assignments({ data }: { data: Dataset }) {
  const team = reportingUsers(data);
  const [who, setWho] = useState<string>("all");

  const teamIds = new Set(team.map((u) => u.id));
  const teamTasks = data.tasks.filter((t) => teamIds.has(t.userId));
  const teamGoals = data.goals.filter((g) => teamIds.has(g.userId));
  const nameOf = (id: string) => team.find((u) => u.id === id)?.name ?? "—";

  const visible = who === "all" ? team : team.filter((u) => u.id === who);

  const exportRows = [
    ...teamTasks.map((t) => ({
      employee: nameOf(t.userId),
      type: "task",
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_or_week: t.dueDate ?? "",
    })),
    ...teamGoals.map((g) => ({
      employee: nameOf(g.userId),
      type: "goal",
      title: `${g.title} (${g.current}/${g.target} ${g.metricLabel})`,
      status: g.status,
      priority: "",
      due_or_week: weekRangeLabel(g.weekOf),
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks & Goals"
        description="See what's assigned to each team member — their tasks and this week's goals."
        actions={
          <>
            <ExportButton filename="assignments" rows={exportRows} />
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {team.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {team.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No team members yet" description="Once employees join, the tasks and goals assigned to them appear here." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Members" value={team.length} icon={<Users className="h-4 w-4" />} tone="info" />
            <StatCard label="Total tasks" value={teamTasks.length} icon={<ListTodo className="h-4 w-4" />} tone="info" />
            <StatCard label="Open tasks" value={teamTasks.filter((t) => t.status !== "completed").length} icon={<ListTodo className="h-4 w-4" />} tone="warning" />
            <StatCard label="Active goals" value={teamGoals.length} icon={<Target className="h-4 w-4" />} tone="success" />
          </div>

          <div className="space-y-4">
            {visible.map((u) => (
              <MemberBlock
                key={u.id}
                user={u}
                tasks={teamTasks.filter((t) => t.userId === u.id)}
                goals={teamGoals.filter((g) => g.userId === u.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MemberBlock({ user, tasks, goals }: { user: User; tasks: Task[]; goals: WeeklyGoal[] }) {
  const sortedTasks = [...tasks].sort((a, b) => TASK_ORDER[a.status] - TASK_ORDER[b.status]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 p-4">
        <Avatar user={user} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.title} · {user.team}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tag tone="info"><ListTodo className="h-3 w-3" /> {tasks.length} task{tasks.length === 1 ? "" : "s"}</Tag>
          <Tag tone="success"><Target className="h-3 w-3" /> {goals.length} goal{goals.length === 1 ? "" : "s"}</Tag>
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly goals</p>
          {goals.length === 0 ? (
            <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">No goals assigned.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <li key={g.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{g.title}</span>
                      <GoalStatusPill status={g.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {weekRangeLabel(g.weekOf)}</span>
                      <span className="tnum">{g.current}/{g.target} {g.metricLabel} · {pct}%</span>
                    </div>
                    <Meter value={g.current} max={g.target} color={TONE_HEX[goalTone(g.status)]} height={5} className="mt-2" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks</p>
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">No tasks assigned.</p>
          ) : (
            <ul className="space-y-1.5">
              {sortedTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <PriorityTag priority={t.priority} />
                      {t.dueDate && <span className="text-xs text-muted-foreground">Due {prettyDate(t.dueDate)}</span>}
                    </div>
                  </div>
                  <TaskStatusPill status={t.status} className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
