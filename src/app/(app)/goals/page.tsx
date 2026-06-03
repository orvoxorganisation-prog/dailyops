import { requireEmployee } from "@/lib/rbac";
import { getEmployeeBundle } from "@/lib/queries";
import { WeeklyGoals } from "@/components/views/WeeklyGoals";

export default async function GoalsPage() {
  const user = await requireEmployee();
  const bundle = await getEmployeeBundle(user.id);
  return <WeeklyGoals goals={bundle.goals} tasks={bundle.tasks} />;
}
