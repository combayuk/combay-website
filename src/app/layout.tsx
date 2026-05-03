import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combay — Industrial Equipment Specialists",
  description: "Buy, repair or sell surplus industrial and commercial equipment. 10,000+ items, 30-day warranty, UK-based. Serving all industries.",
  keywords: "industrial equipment, surplus stock, equipment repair, asset recovery, PLCs, test equipment, laboratory equipment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
