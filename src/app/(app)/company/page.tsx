import { requireAdmin } from "@/lib/rbac";
import { getCompanyDataset } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { CompanyDashboard } from "@/components/views/CompanyDashboard";

export default async function CompanyPage() {
  await requireAdmin();
  const [data, settings] = await Promise.all([getCompanyDataset(), getSettings()]);
  return <CompanyDashboard data={data} companyName={settings.name} />;
}
