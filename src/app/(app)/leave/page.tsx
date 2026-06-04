import { requireEmployee } from "@/lib/rbac";
import { listLeavesForUser } from "@/lib/queries";
import { LeaveView } from "@/components/views/LeaveView";

export default async function LeavePage() {
  const user = await requireEmployee();
  const leaves = await listLeavesForUser(user.id);
  return <LeaveView leaves={leaves} />;
}
