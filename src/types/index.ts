export type { User, Product, Category, Order, OrderItem, RepairRequest, AssetRecoveryRequest, ContactRequest, QuoteRequest, Promotion } from "@prisma/client";

export interface ProductWithRelations {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  mpn: string | null;
  sku: string;
  condition: string;
  status: string;
  price: any;
  priceOnRequest: boolean;
  stockQty: number;
  description: string | null;
  productOverview: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  addonSupport: boolean;
  addonWarranty: boolean;
  addonInstall: boolean;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  faqs: { id: string; question: string; answer: string }[];
  documents: { id: string; name: string; url: string; fileType: string | null }[];
  tags: { id: string; name: string }[];
}

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; desc?: string }[];
}
