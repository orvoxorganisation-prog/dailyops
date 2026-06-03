import { requireEmployee } from "@/lib/rbac";
import { getEmployeeBundle } from "@/lib/queries";
import { EmployeeDashboard } from "@/components/views/EmployeeDashboard";

export default async function DashboardPage() {
  const user = await requireEmployee();
  const bundle = await getEmployeeBundle(user.id);
  return <EmployeeDashboard user={user} data={bundle.dataset} />;
}
