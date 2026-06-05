import { requireAdmin } from "@/lib/rbac";
import { getCompanyDataset } from "@/lib/queries";
import { Assignments } from "@/components/views/Assignments";

export default async function AssignmentsPage() {
  await requireAdmin();
  const data = await getCompanyDataset();
  return <Assignments data={data} />;
}
