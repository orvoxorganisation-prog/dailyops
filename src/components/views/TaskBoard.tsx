"use client";

import { useMemo, useState } from "react";
import { ListTodo, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/common";
import { TaskRow } from "./TaskRow";
import { TaskEditor } from "./TaskEditor";
import { cn } from "@/lib/utils";
import { taskStatusLabel } from "@/lib/format";
import type { Task, TaskStatus, WeeklyGoal } from "@/lib/types";

const COLUMNS: { status: TaskStatus; dot: string }[] = [
  { status: "not_started", dot: "bg-slate-400" },
  { status: "in_progress", dot: "bg-sky-500" },
  { status: "blocked", dot: "bg-rose-500" },
  { status: "completed", dot: "bg-teal-500" },
];

export function TaskBoard({ tasks, goals }: { tasks: Task[]; goals: WeeklyGoal[] }) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const goalTitle = (id?: string) => goals.find((g) => g.id === id)?.title;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length };
    for (const col of COLUMNS) c[col.status] = tasks.filter((t) => t.status === col.status).length;
    return c;
  }, [tasks]);

  const filtered = tasks.filter(
    (t) => (filter === "all" || t.status === filter) && (!query || t.title.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Create tasks, move them across statuses, and log progress notes."
        actions={<Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New task</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All tasks" count={counts.all} dot="bg-foreground" />
        {COLUMNS.map((col) => (
          <FilterChip key={col.status} active={filter === col.status} onClick={() => setFilter(col.status)} label={taskStatusLabel[col.status]} count={counts[col.status]} dot={col.dot} />
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-5 w-5" />}
          title={query ? "No matching tasks" : "No tasks yet"}
          description={query ? "Try a different search." : "Create your first task to get started."}
          action={!query ? <Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New task</Button> : undefined}
        />
      ) : filter === "all" ? (
        <div className="space-y-6">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.status);
            if (!items.length) return null;
            return (
              <section key={col.status}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                  <h2 className="text-sm font-semibold">{taskStatusLabel[col.status]}</h2>
                  <span className="text-xs text-muted-foreground tnum">{items.length}</span>
                </div>
                <div className="space-y-2">{items.map((t) => (<TaskRow key={t.id} task={t} goalTitle={goalTitle(t.goalId)} goals={goals} />))}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">{filtered.map((t) => (<TaskRow key={t.id} task={t} goalTitle={goalTitle(t.goalId)} goals={goals} />))}</div>
      )}

      {creating && <TaskEditor open={creating} onOpenChange={setCreating} goals={goals} />}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, dot }: { active: boolean; onClick: () => void; label: string; count: number; dot: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-between rounded-xl border bg-card px-3.5 py-3 text-left transition-colors hover:border-foreground/20", active && "border-primary ring-1 ring-primary")}>
      <span className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", dot)} /><span className="text-sm font-medium">{label}</span></span>
      <span className="font-display text-lg font-semibold tnum">{count}</span>
    </button>
  );
}
