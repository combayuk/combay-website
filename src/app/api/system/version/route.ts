import { COMBAY_BUILD_ARCHIVE, COMBAY_BUILD_LABEL, COMBAY_BUILD_PHASE } from "@/lib/buildInfo";

export async function GET() {
  return Response.json({ ok: true, phase: COMBAY_BUILD_PHASE, label: COMBAY_BUILD_LABEL, archive: COMBAY_BUILD_ARCHIVE, generatedAt: new Date().toISOString() });
}
