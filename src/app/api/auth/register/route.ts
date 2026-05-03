import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, passwordHash: hash, company } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
