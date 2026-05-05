import { prisma } from "@/lib/db";
import { sendCustomerAcknowledgement } from "@/lib/mailer";

export const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Awaiting approval",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  COLLECTION_BOOKED: "Collection booked",
  IN_TRANSIT: "In transit",
  INSPECTING: "Inspecting",
  REFUND_APPROVED: "Refund approved",
  LABEL_SENT: "Collection/label sent",
  RECEIVED: "Received back",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
};

export const RETURN_FLOW = ["APPROVED", "COLLECTION_BOOKED", "IN_TRANSIT", "INSPECTING", "REFUND_APPROVED"] as const;

export function publicReturnStatus(status: string) {
  if (status === "REQUESTED") return "AWAITING_APPROVAL";
  return status;
}

export function returnReferenceFromNotes(notes?: string | null, fallback?: string) {
  const match = String(notes || "").match(/Reference:\s*([^\n]+)/i);
  return match?.[1]?.trim() || fallback || "RET";
}

export function formatReturnRow(row: any) {
  const order = row.order;
  const firstItem = order?.items?.[0];
  const item = firstItem?.title || order?.notes || "Order item";
  const sku = firstItem?.sku || "";
  const reference = returnReferenceFromNotes(row.notes, row.id);
  const status = publicReturnStatus(row.status);
  return {
    id: row.id,
    reference,
    orderId: order?.orderNumber || row.orderId,
    orderDbId: row.orderId,
    customerName: order?.customerName || "Customer",
    customerEmail: order?.customerEmail || "",
    customerPhone: order?.customerPhone || "",
    company: order?.company || "",
    item,
    sku,
    reason: row.reason,
    status,
    statusLabel: RETURN_STATUS_LABELS[status] || status.replace(/_/g, " "),
    notes: row.notes || "",
    returnLabelUrl: row.returnLabelUrl || "",
    returnLabelName: row.returnLabelName || "Return label",
    returnCourier: row.returnCourier || order?.courier || "",
    returnTrackingNumber: row.returnTrackingNumber || "",
    returnTrackingUrl: row.returnTrackingUrl || "",
    refundProofUrl: row.refundProofUrl || "",
    refundProofName: row.refundProofName || "Refund payment confirmation",
    orderTotal: order?.total ? Number(order.total) : 0,
    orderDate: order?.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findReturnWithOrder(id: string) {
  return prisma.return.findUnique({
    where: { id },
    include: { order: { include: { items: true } } },
  });
}

export async function sendReturnStatusEmail(row: any, previousStatus?: string) {
  const formatted = formatReturnRow(row);
  if (!formatted.customerEmail) {
    return { configured: false, sent: false, provider: "not-configured" as const, message: "Customer email not available." };
  }
  const statusLabel = formatted.statusLabel;
  const body = formatted.status === "REJECTED"
    ? `Your return request for order ${formatted.orderId} has been reviewed and rejected. Please reply if you need clarification or additional support.`
    : formatted.status === "REFUND_APPROVED"
      ? `Your return for order ${formatted.orderId} has been approved for refund. Refund processing is handled by Combay admin and may be completed manually or through the original payment provider.`
      : `Your return request for order ${formatted.orderId} has been updated to: ${statusLabel}.`;

  return sendCustomerAcknowledgement({
    to: formatted.customerEmail,
    name: formatted.customerName,
    subject: `Combay return update ${formatted.reference}`,
    title: `Return update: ${statusLabel}`,
    reference: formatted.reference,
    body,
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://combay.co.uk"}/portal/returns`,
    ctaLabel: "View return status",
  });
}
