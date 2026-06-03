"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskStatusPill, PriorityTag } from "@/components/common";
import { TaskEditor } from "./TaskEditor";
import { cn } from "@/lib/utils";
import { dueLabel, relativeTime } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { Task, TaskStatus, WeeklyGoal } from "@/lib/types";

const TONE_CLS: Record<string, string> = {
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
  success: "text-teal-600 dark:text-teal-400",
};

export function TaskRow({
  task,
  goalTitle,
  goals = [],
  readOnly = false,
}: {
  task: Task;
  goalTitle?: string;
  goals?: WeeklyGoal[];
  readOnly?: boolean;
}) {
  const { updateTaskStatus, addProgressNote, deleteTask } = useActions();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const completed = task.status === "completed";
  const due = task.dueDate ? dueLabel(task.dueDate) : null;

  const toggleComplete = () => updateTaskStatus(task.id, completed ? "in_progress" : "completed");
  const submitNote = () => {
    if (!note.trim()) return;
    addProgressNote(task.id, note.trim());
    setNote("");
  };

  return (
    <div className={cn("rounded-lg border bg-card transition-colors hover:border-foreground/15", task.status === "blocked" && "border-rose-200/70 dark:border-rose-500/25")}>
      <div className="flex items-center gap-3 p-3">
        {!readOnly ? (
          <button onClick={toggleComplete} className="shrink-0 text-muted-foreground transition-colors hover:text-teal-600" aria-label={completed ? "Reopen task" : "Complete task"}>
            {completed ? <CheckCircle2 className="h-5 w-5 text-teal-600" /> : task.status === "blocked" ? <Ban className="h-5 w-5 text-rose-500" /> : task.status === "in_progress" ? <CircleDot className="h-5 w-5 text-sky-500" /> : <Circle className="h-5 w-5" />}
          </button>
        ) : (
          <span className="shrink-0">
            {completed ? <CheckCircle2 className="h-5 w-5 text-teal-600" /> : task.status === "blocked" ? <Ban className="h-5 w-5 text-rose-500" /> : <CircleDot className="h-5 w-5 text-muted-foreground" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", completed && "text-muted-foreground line-through")}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <PriorityTag priority={task.priority} />
            {due && <span className={cn("tnum", TONE_CLS[due.tone])}>{due.text}</span>}
            {goalTitle && (
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Target className="h-3 w-3" /> {goalTitle}</span>
            )}
            {task.progressNotes.length > 0 && (
              <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground">
                {task.progressNotes.length} note{task.progressNotes.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden sm:block"><TaskStatusPill status={task.status} /></span>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit task</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExpanded(true)}><MessageSquarePlus className="mr-2 h-4 w-4" /> Add progress note</DropdownMenuItem>
                <DropdownMenuSeparator />
                <StatusItems current={task.status} onPick={(s) => updateTaskStatus(task.id, s)} />
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t px-3 py-3">
          {task.progressNotes.length > 0 && (
            <ul className="space-y-1.5">
              {task.progressNotes.map((n) => (
                <li key={n.id} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <div>
                    <p className="leading-snug">{n.text}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeTime(n.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <div className="flex items-center gap-2 pt-1">
              <Input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNote()} placeholder="Add a progress note…" className="h-9" />
              <Button size="sm" variant="secondary" onClick={submitNote} disabled={!note.trim()}>Add</Button>
            </div>
          )}
        </div>
      )}

      {editing && <TaskEditor open={editing} onOpenChange={setEditing} existing={task} goals={goals} />}
    </div>
  );
}

function StatusItems({ current, onPick }: { current: TaskStatus; onPick: (s: TaskStatus) => void }) {
  const opts: { s: TaskStatus; label: string; Icon: typeof Circle }[] = [
    { s: "not_started", label: "Not started", Icon: Circle },
    { s: "in_progress", label: "In progress", Icon: CircleDot },
    { s: "blocked", label: "Blocked", Icon: Ban },
    { s: "completed", label: "Completed", Icon: CheckCircle2 },
  ];
  return (
    <>
      {opts.map(({ s, label, Icon }) => (
        <DropdownMenuItem key={s} onClick={() => onPick(s)} className={cn(current === s && "bg-accent")}>
          <Icon className="mr-2 h-4 w-4" /> {label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
