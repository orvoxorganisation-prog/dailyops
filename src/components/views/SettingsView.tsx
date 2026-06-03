"use client";

import { useState } from "react";
import { Building2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common";
import { useActions } from "@/lib/useActions";

export interface CompanySettingsDTO {
  name: string;
  tagline: string;
  workdayEndHour: number;
  timezone: string;
  requireProof: boolean;
}

export function SettingsView({ settings }: { settings: CompanySettingsDTO }) {
  const { updateSettings } = useActions();
  const [name, setName] = useState(settings.name);
  const [tagline, setTagline] = useState(settings.tagline);
  const [workdayEndHour, setWorkdayEndHour] = useState(settings.workdayEndHour);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [requireProof, setRequireProof] = useState(settings.requireProof);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await updateSettings({ name, tagline, workdayEndHour: Number(workdayEndHour), timezone, requireProof });
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Settings" description="Configure your workspace, workday, and SOP policy." />

      <div className="max-w-2xl space-y-4">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold"><Building2 className="h-4 w-4 text-muted-foreground" /> Workspace</h2>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">Company name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Tagline <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What your company does" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold"><Clock className="h-4 w-4 text-muted-foreground" /> Workday</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-sm">Report deadline (hour, 0–23)</Label>
              <Input type="number" min={0} max={23} value={workdayEndHour} onChange={(e) => setWorkdayEndHour(Number(e.target.value))} />
              <p className="mt-1 text-xs text-muted-foreground">Reports are expected before this hour.</p>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> SOP policy</h2>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Require proof of work</span>
              <span className="block text-xs text-muted-foreground">Daily reports must include at least one piece of proof.</span>
            </span>
            <Switch checked={requireProof} onCheckedChange={setRequireProof} />
          </label>
        </section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={busy || !name.trim()}>Save settings</Button>
        </div>
      </div>
    </div>
  );
}
