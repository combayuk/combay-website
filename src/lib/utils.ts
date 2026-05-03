import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string | null | undefined, currency = "GBP"): string {
  if (amount === null || amount === undefined) return "Price on request";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function generateOrderNumber(): string {
  return `CB${Date.now().toString(36).toUpperCase()}`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const CONDITIONS: Record<string, { label: string; color: string }> = {
  NEW:           { label: "New",              color: "text-green-700 bg-green-50 border-green-200" },
  NEW_OPEN_BOX:  { label: "New (Open Box)",   color: "text-blue-700 bg-blue-50 border-blue-200" },
  USED:          { label: "Used",             color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  FOR_PARTS:     { label: "For Parts",        color: "text-red-700 bg-red-50 border-red-200" },
};

export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT:  { label: "Pending Payment", color: "text-yellow-700 bg-yellow-50" },
  PAYMENT_RECEIVED: { label: "Payment Received",color: "text-blue-700 bg-blue-50" },
  PROCESSING:       { label: "Processing",      color: "text-blue-700 bg-blue-50" },
  DISPATCHED:       { label: "Dispatched",      color: "text-purple-700 bg-purple-50" },
  DELIVERED:        { label: "Delivered",       color: "text-green-700 bg-green-50" },
  CANCELLED:        { label: "Cancelled",       color: "text-red-700 bg-red-50" },
  REFUNDED:         { label: "Refunded",        color: "text-gray-700 bg-gray-50" },
};
