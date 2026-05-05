import { prisma, withDatabase } from "@/lib/db";
import { readJsonBody } from "@/lib/requests";
import { findReturnWithOrder, formatReturnRow, sendReturnStatusEmail } from "@/lib/returnUtils";

const VALID_STATUSES = new Set([
  "AWAITING_APPROVAL",
  "REQUESTED",
  "APPROVED",
  "COLLECTION_BOOKED",
  "IN_TRANSIT",
  "INSPECTING",
  "REFUND_APPROVED",
  "REJECTED",
  "LABEL_SENT",
  "RECEIVED",
  "REFUNDED",
]);

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const dbResult = await withDatabase(async () => {
    const row = await findReturnWithOrder(params.id);
    if (!row) throw new Error("Return not found");
    return formatReturnRow(row);
  });
  if (!dbResult.ok) return Response.json({ ok: false, error: dbResult.reason }, { status: 404 });
  return Response.json({ ok: true, mode: "database", return: dbResult.data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJsonBody(req);
  const nextStatus = String(body.status || "").trim();
  if (nextStatus && !VALID_STATUSES.has(nextStatus)) {
    return Response.json({ ok: false, error: "Invalid return status." }, { status: 400 });
  }

  const dbResult = await withDatabase(async () => {
    const current = await findReturnWithOrder(params.id);
    if (!current) throw new Error("Return not found");
    const previousStatus = current.status;
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
    const customerMessage = typeof body.customerMessage === "string" ? body.customerMessage.trim() : "";
    const noteLines = [current.notes || ""];
    if (adminNote || customerMessage || nextStatus) {
      noteLines.push(`\n--- Admin update ${new Date().toISOString()} ---`);
      if (nextStatus) noteLines.push(`Status: ${nextStatus}`);
      if (adminNote) noteLines.push(`Admin note: ${adminNote}`);
      if (customerMessage) noteLines.push(`Customer message: ${customerMessage}`);
    }
    const optionalText = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);
    const updated = await prisma.return.update({
      where: { id: params.id },
      data: {
        ...(nextStatus ? { status: nextStatus as any } : {}),
        notes: noteLines.filter(Boolean).join("\n"),
        ...(optionalText(body.returnLabelUrl) !== undefined ? { returnLabelUrl: optionalText(body.returnLabelUrl) || null } : {}),
        ...(optionalText(body.returnLabelName) !== undefined ? { returnLabelName: optionalText(body.returnLabelName) || null } : {}),
        ...(optionalText(body.returnCourier) !== undefined ? { returnCourier: optionalText(body.returnCourier) || null } : {}),
        ...(optionalText(body.returnTrackingNumber) !== undefined ? { returnTrackingNumber: optionalText(body.returnTrackingNumber) || null } : {}),
        ...(optionalText(body.returnTrackingUrl) !== undefined ? { returnTrackingUrl: optionalText(body.returnTrackingUrl) || null } : {}),
        ...(optionalText(body.refundProofUrl) !== undefined ? { refundProofUrl: optionalText(body.refundProofUrl) || null } : {}),
        ...(optionalText(body.refundProofName) !== undefined ? { refundProofName: optionalText(body.refundProofName) || null } : {}),
      },
      include: { order: { include: { items: true } } },
    });
    const email = body.notifyCustomer === false ? null : await sendReturnStatusEmail(updated, previousStatus);
    return { row: formatReturnRow(updated), email };
  });

  if (!dbResult.ok) return Response.json({ ok: false, error: dbResult.reason }, { status: 404 });
  return Response.json({ ok: true, mode: "database", return: dbResult.data.row, email: dbResult.data.email });
}
