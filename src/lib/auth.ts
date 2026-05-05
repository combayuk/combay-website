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

// PRE-LAUNCH mock credentials. Keep admin/customer credentials separate.
// Important: ADMIN_EMAIL is reserved elsewhere for notification emails, so do not use it as login.
const MOCK_AUTH_ENABLED = process.env.MOCK_AUTH_ENABLED !== "false";

const CUSTOMER_EMAIL =
  process.env.MOCK_CUSTOMER_EMAIL ??
  process.env.MOCK_AUTH_EMAIL ??
  process.env.TEST_USER_EMAIL ??
  "test@combay.co.uk";

const CUSTOMER_PASSWORD =
  process.env.MOCK_CUSTOMER_PASSWORD ??
  process.env.MOCK_AUTH_PASSWORD ??
  process.env.TEST_USER_PASSWORD ??
  "Test12345";

const ADMIN_LOGIN_EMAIL =
  process.env.MOCK_ADMIN_EMAIL ??
  process.env.ADMIN_LOGIN_EMAIL ??
  "admin@combay.co.uk";

const ADMIN_LOGIN_PASSWORD =
  process.env.MOCK_ADMIN_PASSWORD ??
  process.env.ADMIN_LOGIN_PASSWORD ??
  "Admin12345";

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
        if (credentials.email === ADMIN_LOGIN_EMAIL && credentials.password === ADMIN_LOGIN_PASSWORD) {
          return { id: "admin-001", email: ADMIN_LOGIN_EMAIL, name: "Combay Admin", role: "ADMIN" };
        }
        if (credentials.email === CUSTOMER_EMAIL && credentials.password === CUSTOMER_PASSWORD) {
          return { id: "user-001", email: CUSTOMER_EMAIL, name: "Test Customer", role: "CUSTOMER" };
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
