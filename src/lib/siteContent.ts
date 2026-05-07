import { prisma, withDatabase } from "@/lib/db";

export type SiteHeroSlide = {
  eyebrow: string;
  heading: string;
  accent: string;
  body: string;
  cta1Label: string;
  cta1Href: string;
  cta2Label: string;
  cta2Href: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
};

export type SiteContent = {
  heroSlides: SiteHeroSlide[];
  trust: { eyebrow: string; heading: string; accent: string; clients: string[] };
  finalCta: {
    eyebrow: string;
    heading: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    tertiaryLabel: string;
    tertiaryHref: string;
  };
  contact: { salesEmail: string; repairEmail: string; procurementEmail: string; phone: string; location: string; whatsapp: string };
  footer: { description: string };
};

export const SITE_CONTENT_KEY = "site.content.v1";

export const defaultSiteContent: SiteContent = {
  heroSlides: [
    {
      eyebrow: "10,000+ Items In Stock",
      heading: "Mission-critical equipment,",
      accent: "ready to dispatch.",
      body: "Tested, warranted industrial and commercial equipment. 30-day warranty. Trusted by UK businesses across every industry.",
      cta1Label: "Browse Equipment",
      cta1Href: "/shop",
      cta2Label: "View Categories",
      cta2Href: "/shop",
      stat1Value: "10K+",
      stat1Label: "In stock",
      stat2Value: "30d",
      stat2Label: "Warranty",
      stat3Value: "48h",
      stat3Label: "Dispatch",
    },
    {
      eyebrow: "Repair Service",
      heading: "40% lower than",
      accent: "manufacturer quotes.",
      body: "Free collection. 60-day checking warranty. Calibration, repair, PPM and installation — all covered by our engineers.",
      cta1Label: "Book a Repair",
      cta1Href: "/repair",
      cta2Label: "How It Works",
      cta2Href: "/repair#how",
      stat1Value: "40%",
      stat1Label: "Below OEM",
      stat2Value: "60d",
      stat2Label: "Warranty",
      stat3Value: "Free",
      stat3Label: "Collection",
    },
    {
      eyebrow: "Asset Recovery",
      heading: "Cash for your",
      accent: "surplus equipment.",
      body: "Fair value. Free collection from anywhere. Payment before goods leave your site. No stock list needed.",
      cta1Label: "Get Cash for Goods",
      cta1Href: "/asset-recovery",
      cta2Label: "How It Works",
      cta2Href: "/asset-recovery#how",
      stat1Value: "Same Day",
      stat1Label: "Collection",
      stat2Value: "Cash",
      stat2Label: "On-site",
      stat3Value: "24h",
      stat3Label: "Response",
    },
  ],
  trust: {
    eyebrow: "Why Businesses Use Combay",
    heading: "Built by engineers,",
    accent: "for engineers.",
    clients: ["Nutrein", "AG Solutions", "Fiber Logic", "Poole IT", "Transend (UK) Ltd"],
  },
  finalCta: {
    eyebrow: "Get Started Today",
    heading: "Ready to keep things running?",
    body: "Whether you need equipment, a repair, or want to recover cash on surplus stock — Combay responds within 24 hours.",
    primaryLabel: "Browse Stock →",
    primaryHref: "/shop",
    secondaryLabel: "Book a Repair",
    secondaryHref: "/repair",
    tertiaryLabel: "Sell Your Stock",
    tertiaryHref: "/asset-recovery",
  },
  contact: {
    salesEmail: "info@combay.co.uk",
    repairEmail: "service@combay.co.uk",
    procurementEmail: "procurement@combay.co.uk",
    phone: "+44 7340 383334",
    location: "Chelmsford, Essex, UK",
    whatsapp: "447340383334",
  },
  footer: {
    description: "UK-based industrial and commercial equipment specialists. Buy, repair, or sell surplus stock — backed by engineers.",
  },
};

function asText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function safeHref(value: unknown, fallback: string) {
  const text = asText(value, fallback);
  if (text.startsWith("/") || text.startsWith("https://") || text.startsWith("http://") || text.startsWith("mailto:") || text.startsWith("tel:")) return text;
  return fallback;
}

function mergeSlide(input: any, fallback: SiteHeroSlide): SiteHeroSlide {
  return {
    eyebrow: asText(input?.eyebrow, fallback.eyebrow),
    heading: asText(input?.heading, fallback.heading),
    accent: asText(input?.accent, fallback.accent),
    body: asText(input?.body, fallback.body),
    cta1Label: asText(input?.cta1Label, fallback.cta1Label),
    cta1Href: safeHref(input?.cta1Href, fallback.cta1Href),
    cta2Label: asText(input?.cta2Label, fallback.cta2Label),
    cta2Href: safeHref(input?.cta2Href, fallback.cta2Href),
    stat1Value: asText(input?.stat1Value, fallback.stat1Value),
    stat1Label: asText(input?.stat1Label, fallback.stat1Label),
    stat2Value: asText(input?.stat2Value, fallback.stat2Value),
    stat2Label: asText(input?.stat2Label, fallback.stat2Label),
    stat3Value: asText(input?.stat3Value, fallback.stat3Value),
    stat3Label: asText(input?.stat3Label, fallback.stat3Label),
  };
}

export function normaliseSiteContent(input: unknown): SiteContent {
  const raw = typeof input === "object" && input ? (input as any) : {};
  const rawSlides = Array.isArray(raw.heroSlides) ? raw.heroSlides : [];
  return {
    heroSlides: defaultSiteContent.heroSlides.map((slide, index) => mergeSlide(rawSlides[index], slide)),
    trust: {
      eyebrow: asText(raw.trust?.eyebrow, defaultSiteContent.trust.eyebrow),
      heading: asText(raw.trust?.heading, defaultSiteContent.trust.heading),
      accent: asText(raw.trust?.accent, defaultSiteContent.trust.accent),
      clients: Array.isArray(raw.trust?.clients)
        ? raw.trust.clients.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : defaultSiteContent.trust.clients,
    },
    finalCta: {
      eyebrow: asText(raw.finalCta?.eyebrow, defaultSiteContent.finalCta.eyebrow),
      heading: asText(raw.finalCta?.heading, defaultSiteContent.finalCta.heading),
      body: asText(raw.finalCta?.body, defaultSiteContent.finalCta.body),
      primaryLabel: asText(raw.finalCta?.primaryLabel, defaultSiteContent.finalCta.primaryLabel),
      primaryHref: safeHref(raw.finalCta?.primaryHref, defaultSiteContent.finalCta.primaryHref),
      secondaryLabel: asText(raw.finalCta?.secondaryLabel, defaultSiteContent.finalCta.secondaryLabel),
      secondaryHref: safeHref(raw.finalCta?.secondaryHref, defaultSiteContent.finalCta.secondaryHref),
      tertiaryLabel: asText(raw.finalCta?.tertiaryLabel, defaultSiteContent.finalCta.tertiaryLabel),
      tertiaryHref: safeHref(raw.finalCta?.tertiaryHref, defaultSiteContent.finalCta.tertiaryHref),
    },
    contact: {
      salesEmail: asText(raw.contact?.salesEmail, defaultSiteContent.contact.salesEmail),
      repairEmail: asText(raw.contact?.repairEmail, defaultSiteContent.contact.repairEmail),
      procurementEmail: asText(raw.contact?.procurementEmail, defaultSiteContent.contact.procurementEmail),
      phone: asText(raw.contact?.phone, defaultSiteContent.contact.phone),
      location: asText(raw.contact?.location, defaultSiteContent.contact.location),
      whatsapp: asText(raw.contact?.whatsapp, defaultSiteContent.contact.whatsapp),
    },
    footer: { description: asText(raw.footer?.description, defaultSiteContent.footer.description) },
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const dbResult = await withDatabase(async () => {
    const row = await prisma.siteSetting.findUnique({ where: { key: SITE_CONTENT_KEY } });
    if (!row?.value) return defaultSiteContent;
    try {
      return normaliseSiteContent(JSON.parse(row.value));
    } catch {
      return defaultSiteContent;
    }
  });
  return dbResult.ok ? dbResult.data : defaultSiteContent;
}

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  const safe = normaliseSiteContent(content);
  await prisma.siteSetting.upsert({
    where: { key: SITE_CONTENT_KEY },
    update: { value: JSON.stringify(safe) },
    create: { key: SITE_CONTENT_KEY, value: JSON.stringify(safe) },
  });
  return safe;
}
