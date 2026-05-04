export type OrderStatus = "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";

export type PortalOrder = {
  id: string;
  date: string;
  deliveredAt?: string;
  item: string;
  sku: string;
  total: string;
  status: OrderStatus;
  courier?: string;
  tracking?: string;
};

export type ReturnStage = "REQUEST_SUBMITTED" | "COLLECTION_BOOKED" | "IN_TRANSIT" | "INSPECTING" | "REFUND_APPROVED";

export type PortalReturn = {
  id: string;
  orderId: string;
  item: string;
  requestedAt: string;
  stage: ReturnStage;
  statusText: string;
};

export const RETURN_STAGES: { id: ReturnStage; label: string }[] = [
  { id: "REQUEST_SUBMITTED", label: "Request submitted" },
  { id: "COLLECTION_BOOKED", label: "Collection booked" },
  { id: "IN_TRANSIT", label: "In transit" },
  { id: "INSPECTING", label: "Inspecting" },
  { id: "REFUND_APPROVED", label: "Refund approved" },
];

export const COURIER_LINKS: Record<string, string> = {
  "Royal Mail": "https://www.royalmail.com/track-your-item#/tracking-results/",
  DPD: "https://track.dpd.co.uk/tracking/",
  DHL: "https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=",
  FedEx: "https://www.fedex.com/apps/fedextrack/?tracknumbers=",
  UPS: "https://www.ups.com/track?tracknum=",
};

export const PORTAL_ORDERS: PortalOrder[] = [
  {
    id: "CB1ACB2F",
    date: "2026-04-28",
    deliveredAt: "2026-04-28",
    item: "Siemens SIMATIC S7-400 CPU 412-2 PLC Module",
    sku: "CBUK00001",
    total: "£1,240.00",
    status: "DELIVERED",
    courier: "Royal Mail",
    tracking: "RM123456789GB",
  },
  {
    id: "CB0D9E1A",
    date: "2026-03-01",
    deliveredAt: "2026-03-05",
    item: "ABB ACS550 Industrial Drive 7.5kW",
    sku: "CBUK00002",
    total: "£890.00",
    status: "DELIVERED",
    courier: "DPD",
    tracking: "DPD987654321",
  },
  {
    id: "CB7F92AC",
    date: "2026-05-03",
    item: "PerkinElmer Lambda UV/VIS/NIR Accessory Kit",
    sku: "CBUK00004",
    total: "£2,450.00",
    status: "DISPATCHED",
    courier: "DHL",
    tracking: "JD0146000099999999",
  },
];

export const PORTAL_RETURNS: PortalReturn[] = [
  {
    id: "RET-MOCK-001",
    orderId: "CB0D9E1A",
    item: "ABB ACS550 Industrial Drive 7.5kW",
    requestedAt: "2026-03-10",
    stage: "INSPECTING",
    statusText: "Item received back and currently under inspection.",
  },
];

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vietnam", "Zambia", "Zimbabwe",
];

export const PHONE_CODES = [
  { country: "United Kingdom", code: "+44", label: "🇬🇧 United Kingdom +44" },
  { country: "United States", code: "+1", label: "🇺🇸 United States +1" },
  { country: "United Arab Emirates", code: "+971", label: "🇦🇪 UAE +971" },
  { country: "Pakistan", code: "+92", label: "🇵🇰 Pakistan +92" },
  { country: "India", code: "+91", label: "🇮🇳 India +91" },
  { country: "Germany", code: "+49", label: "🇩🇪 Germany +49" },
  { country: "France", code: "+33", label: "🇫🇷 France +33" },
  { country: "Italy", code: "+39", label: "🇮🇹 Italy +39" },
  { country: "Netherlands", code: "+31", label: "🇳🇱 Netherlands +31" },
  { country: "Spain", code: "+34", label: "🇪🇸 Spain +34" },
  { country: "Singapore", code: "+65", label: "🇸🇬 Singapore +65" },
  { country: "China", code: "+86", label: "🇨🇳 China +86" },
  { country: "Japan", code: "+81", label: "🇯🇵 Japan +81" },
  { country: "Australia", code: "+61", label: "🇦🇺 Australia +61" },
  { country: "Canada", code: "+1", label: "🇨🇦 Canada +1" },
  { country: "South Africa", code: "+27", label: "🇿🇦 South Africa +27" },
  { country: "Saudi Arabia", code: "+966", label: "🇸🇦 Saudi Arabia +966" },
  { country: "Qatar", code: "+974", label: "🇶🇦 Qatar +974" },
  { country: "Kuwait", code: "+965", label: "🇰🇼 Kuwait +965" },
  { country: "Oman", code: "+968", label: "🇴🇲 Oman +968" },
];

export function daysSince(dateStr?: string) {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function daysUntilReturnDeadline(order: PortalOrder) {
  const elapsed = daysSince(order.deliveredAt || order.date);
  return Math.max(0, 30 - elapsed);
}

export function canReturn(order: PortalOrder) {
  return order.status === "DELIVERED" && daysUntilReturnDeadline(order) > 0;
}

export function trackingUrl(order: PortalOrder) {
  if (!order.courier || !order.tracking) return "#";
  return COURIER_LINKS[order.courier] ? `${COURIER_LINKS[order.courier]}${order.tracking}` : "#";
}

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
}
