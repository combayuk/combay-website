export const dynamic = "force-dynamic";

import { requireAdminApiSession } from "@/lib/apiAccess";
import { loadOperationsReliabilityDashboard } from "@/lib/operationalAudit";

export async function GET() {
  const access = await requireAdminApiSession();
  if (!access.ok) return access.response;
  try {
    const data = await loadOperationsReliabilityDashboard();
    return Response.json({ ok: true, data });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "Could not load operational diagnostics." }, { status: 500 });
  }
}
