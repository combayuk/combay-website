export type RequestStatus = "NEW" | "IN_PROGRESS" | "AWAITING_CUSTOMER" | "RESOLVED" | "CLOSED";

export type RequestRecord = {
  id: string;
  type: "quote" | "support" | "contact" | "repair" | "asset";
  date: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  productSku?: string;
  productTitle?: string;
  equipment?: string;
  service?: string;
  status: RequestStatus;
  source?: string;
};

export function generateReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

export function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getEmailStatus() {
  const configured = Boolean(
    process.env.SENDGRID_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  );

  return configured
    ? {
        configured: true,
        sent: false,
        message:
          "Email transport is configured, but this preview endpoint has not sent live mail yet. Phase 5 will wire the mailer.",
      }
    : {
        configured: false,
        sent: false,
        message:
          "Email not sent because SMTP/SendGrid environment variables are not configured yet.",
      };
}

export async function readJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function readFormBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const result: Record<string, string> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") result[key] = value;
      else result[key] = value.name;
    });
    return result;
  }

  return readJsonBody(req) as Promise<Record<string, string>>;
}

export const DEMO_REQUESTS: RequestRecord[] = [
  {
    id: "QT-MOCK-001",
    type: "quote",
    date: "04 May 2026",
    name: "James Walker",
    email: "j.walker@example.com",
    company: "Walker Pharma",
    subject: "Quote request",
    message: "Please quote for Siemens S7-400 CPU module, delivery to Manchester.",
    productSku: "CBUK00001",
    productTitle: "Siemens SIMATIC S7-400 CPU 412-2 PLC Module",
    status: "NEW",
  },
  {
    id: "SUP-MOCK-001",
    type: "support",
    date: "03 May 2026",
    name: "Maria Santos",
    email: "maria@example.com",
    company: "Santos Labs",
    subject: "Tracking update",
    message: "Can you confirm dispatch date for my order?",
    status: "IN_PROGRESS",
  },
  {
    id: "REP-MOCK-001",
    type: "repair",
    date: "02 May 2026",
    name: "Tom Richards",
    email: "tom@example.com",
    equipment: "ABB Drive ACS550",
    service: "Repair",
    message: "Drive powers up but trips under load.",
    status: "NEW",
  },
  {
    id: "AST-MOCK-001",
    type: "asset",
    date: "01 May 2026",
    name: "Priya Patel",
    email: "priya@example.com",
    company: "BiomedKit UK",
    message: "Surplus lab and automation equipment after site clearance.",
    status: "AWAITING_CUSTOMER",
  },
];
