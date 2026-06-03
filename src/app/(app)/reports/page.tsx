import { requireEmployee } from "@/lib/rbac";
import { getEmployeeBundle } from "@/lib/queries";
import { DailyReports } from "@/components/views/DailyReports";

export default async function ReportsPage() {
  const user = await requireEmployee();
  const bundle = await getEmployeeBundle(user.id);
  return <DailyReports user={user} reports={bundle.reports} />;
}
