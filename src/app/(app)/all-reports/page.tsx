import { requireAdmin } from "@/lib/rbac";
import { getAllReports } from "@/lib/queries";
import { AllReports } from "@/components/views/AllReports";

export default async function AllReportsPage() {
  await requireAdmin();
  const { dataset } = await getAllReports();
  return <AllReports data={dataset} />;
}
