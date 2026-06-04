import { requireAdmin } from "@/lib/rbac";
import { listAllLeaves } from "@/lib/queries";
import { LeaveRequests } from "@/components/views/LeaveRequests";

export default async function AdminLeavePage() {
  await requireAdmin();
  const leaves = await listAllLeaves();
  return <LeaveRequests leaves={leaves} />;
}
