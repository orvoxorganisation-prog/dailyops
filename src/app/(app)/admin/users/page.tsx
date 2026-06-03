import { requireAdmin } from "@/lib/rbac";
import { listAllUsers, listAuditLog } from "@/lib/queries";
import { UsersAdmin } from "@/components/views/UsersAdmin";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const [users, audit] = await Promise.all([listAllUsers(), listAuditLog()]);
  return <UsersAdmin users={users} currentUserId={admin.id} audit={audit} />;
}
