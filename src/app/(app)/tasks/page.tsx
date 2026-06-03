import { requireEmployee } from "@/lib/rbac";
import { getEmployeeBundle } from "@/lib/queries";
import { TaskBoard } from "@/components/views/TaskBoard";

export default async function TasksPage() {
  const user = await requireEmployee();
  const bundle = await getEmployeeBundle(user.id);
  return <TaskBoard tasks={bundle.tasks} goals={bundle.goals} />;
}
