import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Automation & Control", slug: "automation-control", icon: "⚙️" },
  { name: "Lab & Scientific", slug: "lab-scientific", icon: "🔬" },
  { name: "Test & Measurement", slug: "test-measurement", icon: "📡" },
  { name: "IT & Networking", slug: "it-networking", icon: "🖧" },
  { name: "AV & Broadcast", slug: "av-broadcast", icon: "📺" },
  { name: "Drives & Motion", slug: "drives-motion", icon: "🏭" },
  { name: "Safety & Detection", slug: "safety-detection", icon: "🛡️" },
  { name: "Process Instrumentation", slug: "process-instrumentation", icon: "🧪" },
];

const demoProducts = [
  {
    sku: "CBUK00001",
    slug: "siemens-s7-400-cpu-412-2-6es7412-2xj05-0ab0",
    title: "Siemens SIMATIC S7-400 CPU 412-2 PLC Module",
    brand: "Siemens",
    manufacturer: "Siemens AG",
    model: "CPU 412-2",
    mpn: "6ES7412-2XJ05-0AB0",
    categorySlug: "automation-control",
    condition: "USED" as const,
    price: 1240,
    stockQty: 2,
    leadTime: "UK dispatch normally within 1–2 working days after cleared payment.",
    warranty: "30-day return-to-base warranty unless otherwise stated.",
    dispatchNote: "Packed for courier dispatch with serial number recorded before shipment.",
    description: "Used Siemens S7-400 CPU module for process and plant automation.",
  },
  {
    sku: "CBUK00002",
    slug: "thermo-scientific-nicolet-is5-ftir-spectrometer-id5-atr",
    title: "Thermo Scientific Nicolet iS5 FTIR Spectrometer with ID5 ATR",
    brand: "Thermo Scientific",
    manufacturer: "Thermo Fisher Scientific",
    model: "Nicolet iS5",
    mpn: "Nicolet iS5 / ID5 ATR",
    categorySlug: "lab-scientific",
    condition: "USED" as const,
    price: 2450,
    stockQty: 1,
    leadTime: "Specialist packing. Dispatch normally within 2–3 working days.",
    warranty: "30-day return-to-base warranty covering arrival as described.",
    dispatchNote: "Ships on reinforced packaging; collection welcome by appointment.",
    description: "Compact FTIR spectrometer package for materials identification, QA laboratories and teaching environments.",
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@combay.co.uk";
  const password = process.env.ADMIN_PASSWORD ?? "combay-admin-2024";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name: "Combay Admin", passwordHash: hash, role: "ADMIN" } });
    console.log(`Admin user created: ${email}`);
  } else {
    console.log("Admin already exists");
  }

  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: category, create: category });
  }
  console.log("Categories seeded");

  for (const product of demoProducts) {
    const category = await prisma.category.findUnique({ where: { slug: product.categorySlug } });
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        title: product.title,
        brand: product.brand,
        manufacturer: product.manufacturer,
        model: product.model,
        mpn: product.mpn,
        categoryId: category?.id,
        condition: product.condition,
        status: "PUBLISHED",
        price: product.price,
        stockQty: product.stockQty,
        description: product.description,
        productOverview: product.description,
        leadTime: product.leadTime,
        warranty: product.warranty,
        dispatchNote: product.dispatchNote,
        source: "seed",
      },
      create: {
        sku: product.sku,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        manufacturer: product.manufacturer,
        model: product.model,
        mpn: product.mpn,
        categoryId: category?.id,
        condition: product.condition,
        status: "PUBLISHED",
        price: product.price,
        stockQty: product.stockQty,
        description: product.description,
        productOverview: product.description,
        leadTime: product.leadTime,
        warranty: product.warranty,
        dispatchNote: product.dispatchNote,
        source: "seed",
      },
    });
  }
  console.log("Demo products seeded");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
