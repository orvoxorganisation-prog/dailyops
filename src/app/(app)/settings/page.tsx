import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { SettingsView } from "@/components/views/SettingsView";

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <SettingsView
      settings={{
        name: s.name,
        tagline: s.tagline ?? "",
        workdayEndHour: s.workdayEndHour,
        timezone: s.timezone,
        requireProof: s.requireProof,
      }}
    />
  );
}
