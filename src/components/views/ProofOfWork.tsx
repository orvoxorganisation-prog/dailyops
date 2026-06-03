"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileUp, Paperclip, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader, EmptyState, ProofIcon } from "@/components/common";
import { cn } from "@/lib/utils";
import { proofLabel, relativeTime } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { ProofItem, ProofType } from "@/lib/types";

const TYPES: ProofType[] = ["image", "document", "screenshot", "link", "github", "loom"];

export function ProofOfWork({ proofs }: { proofs: ProofItem[] }) {
  const { removeProof } = useActions();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<ProofType | "all">("all");

  const counts: Record<string, number> = { all: proofs.length };
  for (const t of TYPES) counts[t] = proofs.filter((p) => p.type === t).length;
  const filtered = filter === "all" ? proofs : proofs.filter((p) => p.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proof of Work"
        description="Every piece of evidence attached to your reports — screenshots, docs, links, commits and recordings."
        actions={<Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add proof</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <TypeChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
        {TYPES.map((t) => (<TypeChip key={t} active={filter === t} onClick={() => setFilter(t)} label={proofLabel[t]} count={counts[t]} />))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Paperclip className="h-5 w-5" />} title="No proof of work yet" description="Attach evidence to your daily reports, or add items directly to your library." action={<Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add proof</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (<ProofCard key={p.id} proof={p} onRemove={() => removeProof(p.id)} />))}
        </div>
      )}

      <AddProofDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function ProofCard({ proof, onRemove }: { proof: ProofItem; onRemove: () => void }) {
  const isLink = proof.url.startsWith("http");
  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-foreground/15">
      <div className="flex items-start gap-3">
        <ProofIcon type={proof.type} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{proof.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{proof.url}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>{proof.reportId ? "Attached to a report" : `Added ${relativeTime(proof.addedAt)}`}</span>
        <div className="flex items-center gap-1">
          {isLink && (
            <a href={proof.url} target="_blank" rel="noreferrer" className="rounded p-1 hover:bg-muted hover:text-foreground" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
          )}
          <button onClick={onRemove} className="rounded p-1 opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function AddProofDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addProof } = useActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<ProofType>("link");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const isFile = ["image", "document", "screenshot"].includes(type);
  const ready = isFile ? !!label : !!url.trim();

  const reset = () => { setType("link"); setLabel(""); setUrl(""); };
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const res = await addProof({ type, label: label || url.replace(/^https?:\/\//, "").slice(0, 48), url: isFile ? url || `local://${label}` : url.trim() });
    setBusy(false);
    if (res.ok) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add proof of work</DialogTitle>
          <DialogDescription>Link or upload evidence for your work.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-sm">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ProofType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => (<SelectItem key={t} value={t}>{proofLabel[t]}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          {isFile ? (
            <div>
              <Label className="mb-1.5 block text-sm">File</Label>
              <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLabel(f.name); setUrl(`local://${f.name}`); } }} />
              <Button variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />{label || "Choose a file…"}</Button>
            </div>
          ) : (
            <>
              <div>
                <Label className="mb-1.5 block text-sm">URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/org/repo/pull/482" onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Label <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="PR #482 · streaming endpoint" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!ready || busy}>Add proof</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypeChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}>
      {label}<span className="tnum text-xs opacity-70">{count}</span>
    </button>
  );
}
