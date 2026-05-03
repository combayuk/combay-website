import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.ADMIN_EMAIL    ?? "admin@combay.co.uk";
  const password = process.env.ADMIN_PASSWORD ?? "combay-admin-2024";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name: "Combay Admin", passwordHash: hash, role: "ADMIN" } });
    console.log(`Admin user created: ${email}`);
  } else {
    console.log("Admin already exists");
  }

  // Seed categories
  const cats = [
    { name:"Lab & Scientific",    slug:"lab-scientific",    icon:"🔬" },
    { name:"Automation & Control",slug:"automation-control",icon:"⚙️" },
    { name:"Test & Detection",    slug:"test-detection",    icon:"📡" },
    { name:"IT & Networking",     slug:"it-networking",     icon:"🖧" },
    { name:"Display & AV",       slug:"display-av",        icon:"📺" },
    { name:"Oil & Gas",           slug:"oil-gas",           icon:"🛢️" },
    { name:"Audio & Broadcast",  slug:"audio-broadcast",   icon:"🎙️" },
    { name:"Manufacturing",       slug:"manufacturing",     icon:"🏭" },
  ];
  for (const cat of cats) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }
  console.log("Categories seeded");
}

main().catch(console.error).finally(() => prisma.$disconnect());
