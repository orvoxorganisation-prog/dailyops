"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActions } from "@/lib/useActions";
import { priorityLabel, taskStatusLabel } from "@/lib/format";
import type { Priority, Task, TaskStatus, WeeklyGoal } from "@/lib/types";

const STATUSES: TaskStatus[] = ["not_started", "in_progress", "blocked", "completed"];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

export function TaskEditor({
  open,
  onOpenChange,
  existing,
  goals = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Task;
  goals?: WeeklyGoal[];
}) {
  const { addTask, updateTask } = useActions();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? "not_started");
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [goalId, setGoalId] = useState(existing?.goalId ?? "none");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const input = { title, description, status, priority, dueDate, goalId };
    const res = existing ? await updateTask(existing.id, input) : await addTask(input);
    setBusy(false);
    if (res.ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{existing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {existing ? "Update the details for this task." : "Add a task to your board."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-sm">Title</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Implement token streaming endpoint"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context, acceptance criteria…" className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (<SelectItem key={s} value={s}>{taskStatusLabel[s]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{priorityLabel[p]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Linked goal</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal</SelectItem>
                  {goals.map((g) => (<SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim()}>{existing ? "Save task" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
