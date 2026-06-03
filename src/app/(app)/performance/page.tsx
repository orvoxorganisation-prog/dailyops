import { requireAdmin } from "@/lib/rbac";
import { getCompanyDataset } from "@/lib/queries";
import { Performance } from "@/components/views/Performance";

export default async function PerformancePage() {
  await requireAdmin();
  const data = await getCompanyDataset();
  return <Performance data={data} />;
}
