import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import PublicTextStyleApplier from "@/components/visual-cms/PublicTextStyleApplier";
import RouteProgressIndicator from "@/components/navigation/RouteProgressIndicator";

export const metadata: Metadata = {
  title: { default: "Combay — Industrial Equipment Specialists", template: "%s | Combay" },
  description: "Buy, repair or sell surplus industrial and commercial equipment. 10,000+ tested items, 30-day warranty, UK-based. Serving all industries.",
  keywords: "industrial equipment, surplus stock, equipment repair, asset recovery, PLC, test equipment, laboratory equipment, UK",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: "Combay",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <Suspense fallback={null}>
            <RouteProgressIndicator />
          </Suspense>
          <PublicTextStyleApplier />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
