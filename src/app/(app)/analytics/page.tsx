import { requireAdmin } from "@/lib/rbac";
import { getCompanyDataset } from "@/lib/queries";
import { TeamAnalytics } from "@/components/views/TeamAnalytics";

export default async function AnalyticsPage() {
  await requireAdmin();
  const data = await getCompanyDataset();
  return <TeamAnalytics data={data} />;
}
