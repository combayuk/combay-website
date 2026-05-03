import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const testEmail = process.env.MOCK_AUTH_EMAIL || "test@combay.co.uk";
        const testPassword = process.env.MOCK_AUTH_PASSWORD || "Test12345";

        if (
          credentials?.email === testEmail &&
          credentials?.password === testPassword
        ) {
          return {
            id: "mock-user-1",
            email: testEmail,
            name: "Combay Test User",
            role: "ADMIN",
          };
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