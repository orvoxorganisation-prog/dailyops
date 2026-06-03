"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  FileUp,
  Link2,
  Paperclip,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProofIcon } from "@/components/common";
import { cn } from "@/lib/utils";
import { moodEmoji, moodLabel, prettyDate } from "@/lib/format";
import { submitReportAction } from "@/lib/actions/employee";
import type { DailyReport, Mood, ProofItem, ProofType } from "@/lib/types";

const MOODS: Mood[] = ["great", "good", "ok", "rough"];
const HOUR_CHIPS = [4, 6, 7.5, 8, 9];
const uid = () => `pf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function fileToType(name: string): ProofType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return name.toLowerCase().includes("screenshot") ? "screenshot" : "image";
  return "document";
}

interface FormData {
  completedToday: string;
  progressMade: string;
  plannedTomorrow: string;
  blockers: string;
  hasBlockers: boolean;
  hoursWorked: number;
  proof: ProofItem[];
  sopConfirmed: boolean;
  mood: Mood;
}

export function ReportEditor({
  open,
  onOpenChange,
  date,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  existing?: DailyReport;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>(() => ({
    completedToday: existing?.completedToday ?? "",
    progressMade: existing?.progressMade ?? "",
    plannedTomorrow: existing?.plannedTomorrow ?? "",
    blockers: existing?.hasBlockers ? existing.blockers : "",
    hasBlockers: existing?.hasBlockers ?? false,
    hoursWorked: existing?.hoursWorked ?? 8,
    proof: existing?.proof ?? [],
    sopConfirmed: existing?.sopConfirmed ?? false,
    mood: existing?.mood ?? "good",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkType, setLinkType] = useState<ProofType>("link");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }));
  const addProofItems = (items: ProofItem[]) => set("proof", [...form.proof, ...items]);
  const removeProof = (id: string) => set("proof", form.proof.filter((p) => p.id !== id));

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const items: ProofItem[] = Array.from(files).map((f) => ({
      id: uid(),
      type: fileToType(f.name),
      label: f.name,
      url: `local://${f.name}`,
      addedAt: new Date().toISOString(),
    }));
    addProofItems(items);
    toast.success(`${items.length} file${items.length > 1 ? "s" : ""} attached`);
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    const labelMap: Record<string, string> = { link: "Link", github: "GitHub commit", loom: "Loom recording" };
    addProofItems([{ id: uid(), type: linkType, label: labelMap[linkType] ?? linkUrl.replace(/^https?:\/\//, "").slice(0, 40), url: linkUrl.trim(), addedAt: new Date().toISOString() }]);
    setLinkUrl("");
  };

  const sop = [
    { q: "Completed today", done: !!form.completedToday.trim() },
    { q: "Progress made", done: !!form.progressMade.trim() },
    { q: "Planned next", done: !!form.plannedTomorrow.trim() },
    { q: "Blockers answered", done: !form.hasBlockers || !!form.blockers.trim() },
    { q: "Proof attached", done: form.proof.length > 0 },
    { q: "SOP confirmed", done: form.sopConfirmed },
  ];
  const sopDone = sop.filter((s) => s.done).length;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.completedToday.trim()) e.completedToday = "Required — what did you complete today?";
    if (!form.progressMade.trim()) e.progressMade = "Required — what progress did you make?";
    if (!form.plannedTomorrow.trim()) e.plannedTomorrow = "Required — what's planned next?";
    if (form.hasBlockers && !form.blockers.trim()) e.blockers = "Describe the blocker, or switch to “No blockers”.";
    if (!form.hoursWorked || form.hoursWorked <= 0) e.hoursWorked = "Log the hours you worked.";
    if (form.proof.length === 0) e.proof = "Attach at least one piece of proof of work.";
    if (!form.sopConfirmed) e.sopConfirmed = "You must confirm the SOP was followed.";
    return e;
  }

  const onSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      toast.error("Report can't be submitted with empty fields", { description: "Every SOP section is required before submitting." });
      return;
    }
    setBusy(true);
    const res = await submitReportAction({
      date,
      completedToday: form.completedToday,
      progressMade: form.progressMade,
      plannedTomorrow: form.plannedTomorrow,
      hasBlockers: form.hasBlockers,
      blockers: form.blockers,
      hoursWorked: form.hoursWorked,
      proof: form.proof.map((p) => ({ type: p.type, label: p.label, url: p.url })),
      sopConfirmed: form.sopConfirmed,
      mood: form.mood,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
    toast.success("Daily report submitted", { description: "Nice work — streak kept alive." });
  };

  const err = (k: string) => errors[k];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-xl">{existing ? "Edit daily report" : "Submit daily report"}</DialogTitle>
              <DialogDescription className="mt-0.5">{prettyDate(date)} · follow the SOP — all fields are required.</DialogDescription>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 sm:flex">
              <ShieldCheck className={cn("h-4 w-4", sopDone === 6 ? "text-teal-600" : "text-muted-foreground")} />
              <span className="text-xs font-medium tnum">{sopDone}/6 SOP</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5 scroll-thin lg:grid-cols-[1fr_220px]">
          <div className="space-y-5">
            <Field label="1 · What did you complete today?" error={err("completedToday")} required>
              <Textarea value={form.completedToday} onChange={(e) => set("completedToday", e.target.value)} placeholder="Shipped the streaming endpoint, closed 3 tickets…" className="min-h-[80px]" />
            </Field>
            <Field label="2 · What progress did you make?" error={err("progressMade")} required>
              <Textarea value={form.progressMade} onChange={(e) => set("progressMade", e.target.value)} placeholder="Latency epic is ~70% done; remaining is the cache path…" className="min-h-[70px]" />
            </Field>
            <Field label="3 · What will you work on next?" error={err("plannedTomorrow")} required>
              <Textarea value={form.plannedTomorrow} onChange={(e) => set("plannedTomorrow", e.target.value)} placeholder="Finish the cache warm-up, then start the load test…" className="min-h-[70px]" />
            </Field>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">4 · Any blockers?</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{form.hasBlockers ? "Yes, I'm blocked" : "No blockers"}</span>
                  <Switch checked={form.hasBlockers} onCheckedChange={(v) => set("hasBlockers", v)} />
                </div>
              </div>
              {form.hasBlockers && (
                <div className="mt-3">
                  <Textarea value={form.blockers} onChange={(e) => set("blockers", e.target.value)} placeholder="Waiting on staging DB credentials from infra…" className={cn("min-h-[60px]", err("blockers") && "border-destructive")} />
                  {err("blockers") && <p className="mt-1 text-xs text-destructive">{err("blockers")}</p>}
                </div>
              )}
            </div>

            <div className={cn("rounded-lg border p-4", err("proof") && "border-destructive")}>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm"><Paperclip className="h-3.5 w-3.5" /> 5 · Proof of work</Label>
                <span className="text-xs text-muted-foreground tnum">{form.proof.length} attached</span>
              </div>

              {form.proof.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {form.proof.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-1.5">
                      <ProofIcon type={p.type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.url}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProof(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><FileUp className="mr-1.5 h-3.5 w-3.5" /> Upload file</Button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Select value={linkType} onValueChange={(v) => setLinkType(v as ProofType)}>
                  <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="loom">Loom</SelectItem>
                    <SelectItem value="screenshot">Screenshot</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())} placeholder="https://github.com/org/repo/pull/482" className="h-9 flex-1" />
                <Button type="button" size="sm" variant="secondary" onClick={addLink} disabled={!linkUrl.trim()}><Link2 className="mr-1 h-3.5 w-3.5" /> Add</Button>
              </div>
              {err("proof") && <p className="mt-2 text-xs text-destructive">{err("proof")}</p>}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border p-4">
              <Label className="text-sm">Hours worked</Label>
              <div className="mt-2 flex items-baseline gap-1">
                <Input type="number" step="0.5" min={0} max={16} value={form.hoursWorked} onChange={(e) => set("hoursWorked", Number(e.target.value))} className={cn("h-10 w-20 text-center font-display text-lg tnum", err("hoursWorked") && "border-destructive")} />
                <span className="text-sm text-muted-foreground">hrs</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {HOUR_CHIPS.map((h) => (
                  <button key={h} onClick={() => set("hoursWorked", h)} className={cn("rounded-md border px-2 py-0.5 text-xs tnum transition-colors hover:bg-muted", form.hoursWorked === h && "border-primary bg-primary/10 text-primary")}>{h}</button>
                ))}
              </div>
              {err("hoursWorked") && <p className="mt-1 text-xs text-destructive">{err("hoursWorked")}</p>}
            </div>

            <div className="rounded-lg border p-4">
              <Label className="text-sm">How did the day feel?</Label>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {MOODS.map((m) => (
                  <button key={m} onClick={() => set("mood", m)} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors hover:bg-muted", form.mood === m && "border-primary bg-primary/10 text-primary")}>
                    <span>{moodEmoji[m]}</span>{moodLabel[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">SOP checklist</p>
              <ul className="space-y-1.5">
                {sop.map((s) => (
                  <li key={s.q} className="flex items-center gap-2 text-sm">
                    {s.done ? <CheckCircle2 className="h-4 w-4 text-teal-600" /> : <Circle className="h-4 w-4 text-muted-foreground/50" />}
                    <span className={cn(s.done ? "text-foreground" : "text-muted-foreground")}>{s.q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <DialogFooter className="shrink-0 items-center justify-between gap-3 border-t px-6 py-4 sm:justify-between">
          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox checked={form.sopConfirmed} onCheckedChange={(v) => set("sopConfirmed", !!v)} className={cn("mt-0.5", err("sopConfirmed") && "border-destructive")} />
            <span className="text-sm leading-tight">
              <span className="font-medium">6 · I confirm this report follows the SOP.</span>
              <span className="block text-xs text-muted-foreground">Accurate, complete, and backed by proof of work.</span>
            </span>
          </label>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}><X className="mr-1 h-4 w-4" /> Cancel</Button>
            <Button onClick={onSubmit} disabled={busy}>{existing ? "Save report" : "Submit report"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1 text-sm">{label}{required && <span className="text-destructive">*</span>}</Label>
      <div className={cn(error && "[&_textarea]:border-destructive")}>{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
