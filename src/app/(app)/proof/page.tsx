import { requireEmployee } from "@/lib/rbac";
import { getEmployeeBundle } from "@/lib/queries";
import { ProofOfWork } from "@/components/views/ProofOfWork";

export default async function ProofPage() {
  const user = await requireEmployee();
  const bundle = await getEmployeeBundle(user.id);
  return <ProofOfWork proofs={bundle.proofs} />;
}
