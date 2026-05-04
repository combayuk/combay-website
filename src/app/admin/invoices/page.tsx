import Link from "next/link";
import { Plus } from "lucide-react";
export default function InvoicesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-800 text-navy-950 text-2xl">Invoices & Quotes</h1>
        <Link href="/admin/invoices/new" className="btn-primary text-sm py-2 flex items-center gap-1.5"><Plus size={14}/> Create New</Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
        <p className="font-display font-600 text-sm mb-1">No invoices yet.</p>
        <p className="text-xs">Create a quote or invoice to get started.</p>
      </div>
    </div>
  );
}
