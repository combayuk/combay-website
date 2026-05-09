import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db";
import { normaliseEmail } from "@/lib/authSecurity";

export type AuthRole = "ADMIN" | "CUSTOMER";

export const MOCK_AUTH_ENABLED =
  process.env.MOCK_AUTH_ENABLED === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.MOCK_AUTH_ENABLED !== "false");

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

function normaliseLoginMode(value?: string | null): "admin" | "customer" | "generic" {
  if (value === "admin") return "admin";
  if (value === "customer") return "customer";
  return "generic";
}

function roleAllowedForMode(role: AuthRole, mode: "admin" | "customer" | "generic") {
  if (mode === "admin") return role === "ADMIN";
  if (mode === "customer") return role === "CUSTOMER";
  return true;
}

function routeForRole(role: AuthRole) {
  return role === "ADMIN" ? "/admin" : "/portal";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginMode: { label: "Login mode", type: "text" },
      },
      async authorize(credentials) {
        const email = normaliseEmail(credentials?.email);
        const password = credentials?.password || "";
        const loginMode = normaliseLoginMode((credentials as any)?.loginMode);
        if (!email || !password) return null;

        if (MOCK_AUTH_ENABLED) {
          if (email === normaliseEmail(ADMIN_LOGIN_EMAIL) && password === ADMIN_LOGIN_PASSWORD) {
            const role: AuthRole = "ADMIN";
            if (!roleAllowedForMode(role, loginMode)) throw new Error("WRONG_PORTAL");
            return { id: "admin-001", email: ADMIN_LOGIN_EMAIL, name: "Combay Admin", role, defaultRoute: routeForRole(role) } as any;
          }
          if (email === normaliseEmail(CUSTOMER_EMAIL) && password === CUSTOMER_PASSWORD) {
            const role: AuthRole = "CUSTOMER";
            if (!roleAllowedForMode(role, loginMode)) throw new Error("WRONG_PORTAL");
            return { id: "user-001", email: CUSTOMER_EMAIL, name: "Test Customer", role, defaultRoute: routeForRole(role) } as any;
          }
        }

        if (isDatabaseConfigured()) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;
          if (user.suspendedAt) return null;
          if (user.requiresEmailVerification && !user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
          const role = (user.role === "ADMIN" ? "ADMIN" : "CUSTOMER") as AuthRole;
          if (!roleAllowedForMode(role, loginMode)) throw new Error("WRONG_PORTAL");
          return { id: user.id, email: user.email, name: user.name || user.email, role, defaultRoute: routeForRole(role) } as any;
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
        token.defaultRoute = (user as any).defaultRoute;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).defaultRoute = token.defaultRoute || routeForRole(token.role === "ADMIN" ? "ADMIN" : "CUSTOMER");
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
