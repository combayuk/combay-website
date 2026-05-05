import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";

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
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password || "";
        if (!email || !password) return null;

        if (MOCK_AUTH_ENABLED) {
          if (email === ADMIN_LOGIN_EMAIL.toLowerCase() && password === ADMIN_LOGIN_PASSWORD) {
            return { id: "admin-001", email: ADMIN_LOGIN_EMAIL, name: "Combay Admin", role: "ADMIN" };
          }
          if (email === CUSTOMER_EMAIL.toLowerCase() && password === CUSTOMER_PASSWORD) {
            return { id: "user-001", email: CUSTOMER_EMAIL, name: "Test Customer", role: "CUSTOMER" };
          }
        }

        if (isDatabaseConfigured()) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, email: user.email, name: user.name || user.email, role: user.role };
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
