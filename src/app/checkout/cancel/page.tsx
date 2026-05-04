import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Payment cancelled | Combay",
  description: "Your Combay checkout was cancelled.",
};

export default function CheckoutCancelPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <main>
      <TopBar />
      <Navigation />
      <div className="bg-gray-50 min-h-screen py-14">
        <div className="max-w-2xl mx-auto px-4 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-display font-900 text-2xl text-navy-950 mb-2">Payment was not completed</h1>
          <p className="text-sm text-gray-600 mb-4">Your checkout was cancelled before payment. No card payment has been taken.</p>
          {searchParams.order && <p className="text-xs text-gray-500 mb-5">Order reference: <span className="font-mono text-navy-950">{searchParams.order}</span></p>}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/checkout" className="btn-primary">Return to checkout</Link>
            <Link href="/cart" className="btn-secondary">View cart</Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
