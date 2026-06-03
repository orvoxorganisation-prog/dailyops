import { requireAdmin } from "@/lib/rbac";
import { getCompanyDataset } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { FounderSummary } from "@/components/views/FounderSummary";

export default async function SummaryPage() {
  await requireAdmin();
  const [data, settings] = await Promise.all([getCompanyDataset(), getSettings()]);
  return <FounderSummary data={data} companyName={settings.name} />;
}
