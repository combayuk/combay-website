import OperationsReliabilityClient from "@/components/admin/OperationsReliabilityClient";
import { loadOperationsReliabilityDashboard } from "@/lib/operationalAudit";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const data = await loadOperationsReliabilityDashboard();
  return <OperationsReliabilityClient initialData={data} />;
}
