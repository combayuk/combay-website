// ─── AUTH CONFIGURATION ───────────────────────────────────────────────────────
// PRE-LAUNCH: Mock credentials via env vars — zero database dependency.
// FUTURE DB SWAP: Replace the authorize() body with prisma lookup + bcrypt.compare
// and add: adapter: PrismaAdapter(prisma), session: { strategy: "database" }
// ─────────────────────────────────────────────────────────────────────────────
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// FUTURE: import { PrismaAdapter } from "@auth/prisma-adapter";
// FUTURE: import { prisma } from "./prisma";
// FUTURE: import bcrypt from "bcryptjs";

// Single shared test credential per master instruction
const MOCK_AUTH_ENABLED = process.env.MOCK_AUTH_ENABLED !== "false";
const TEST_EMAIL = process.env.MOCK_AUTH_EMAIL ?? process.env.TEST_USER_EMAIL ?? "test@combay.co.uk";
const TEST_PASSWORD = process.env.MOCK_AUTH_PASSWORD ?? process.env.TEST_USER_PASSWORD ?? "Test12345";

// Admin credential (separate for admin portal access)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? TEST_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? TEST_PASSWORD;

export const authOptions: NextAuthOptions = {
  // FUTURE DB: adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // MOCK AUTH — replace this entire block with DB lookup when ready
        if (!MOCK_AUTH_ENABLED) return null;
        if (credentials.email === ADMIN_EMAIL && credentials.password === ADMIN_PASSWORD) {
          return { id: "admin-001", email: ADMIN_EMAIL, name: "Combay Admin", role: "ADMIN" };
        }
        if (credentials.email === TEST_EMAIL && credentials.password === TEST_PASSWORD) {
          return { id: "user-001", email: TEST_EMAIL, name: "Test User", role: "CUSTOMER" };
        }
        // END MOCK AUTH

        // FUTURE DB AUTH:
        // const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        // if (!user?.passwordHash) return null;
        // const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        // if (!valid) return null;
        // return { id: user.id, email: user.email, name: user.name, role: user.role };

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id   = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id   = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn:  "/auth/login",
    signOut: "/auth/login",
    error:   "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
