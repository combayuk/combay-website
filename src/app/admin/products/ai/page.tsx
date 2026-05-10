"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";

type QueueMode = "missing" | "ebay" | "oldest";

type QueuePreview = { id: string; sku: string; title: string; category: string };
type BulkResult = {
  ok?: boolean;
  mode?: QueueMode;
  batchSize?: number;
  totalScanned?: number;
  totalNeedingWork?: number;
  preview?: QueuePreview[];
  processed?: number;
  updated?: Array<{ sku: string; title: string; provider?: string; model?: string }>;
  errors?: Array<{ sku: string; title: string; error: string }>;
  message?: string;
  error?: string;
};

const MODES: Array<{ value: QueueMode; label: string; help: string }> = [
  { value: "missing", label: "Products missing useful overview/SEO", help: "Best default. Finds active products with weak descriptions, overview, SEO title, meta description or tags." },
  { value: "ebay", label: "eBay products missing useful overview/SEO", help: "Focuses on imported eBay products that still need cleaner website content." },
  { value: "oldest", label: "Oldest active products, even if already populated", help: "Use carefully. Refreshes older active products even if they already have content." },
];

export default function ProductAiPage() {
  const [mode, setMode] = useState<QueueMode>("missing");
  const [batchSize, setBatchSize] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  async function run(action: "queue" | "generate") {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai/bulk-product-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mode, batchSize }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult(payload);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Bulk AI request failed." });
    } finally {
      setLoading(false);
    }
  }

  const activeMode = MODES.find((item) => item.value === mode) ?? MODES[0];

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/products" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-navy-900 mb-1"><ArrowLeft size={14} /> Back to products</Link>
          <h1 className="font-display font-900 text-navy-950 text-2xl flex items-center gap-2"><Sparkles size={22} className="text-accent" /> Product AI</h1>
          <p className="text-gray-500 text-xs mt-1">Generate cleaner product overviews, SEO titles, meta descriptions and search tags in controlled batches.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900">
        This tool saves generated content directly to selected products. Start with batch size 1 or 3, review output, then increase cautiously. Gemini free-tier/rate limits can vary, so small batches are safer.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="grid lg:grid-cols-[1fr_160px] gap-3">
          <div>
            <label className="block text-xs font-display font-700 text-gray-500 uppercase tracking-wide mb-1">Queue</label>
            <select value={mode} onChange={(event) => setMode(event.target.value as QueueMode)} className="input py-2 text-sm">
              {MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{activeMode.help}</p>
          </div>
          <div>
            <label className="block text-xs font-display font-700 text-gray-500 uppercase tracking-wide mb-1">Batch size</label>
            <select value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))} className="input py-2 text-sm">
              {[1, 3, 5, 8, 10].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run("queue")} disabled={loading} className="btn-secondary text-xs py-2"><RefreshCw size={14} /> Refresh queue</button>
          <button type="button" onClick={() => run("generate")} disabled={loading} className="btn-primary text-xs py-2"><Sparkles size={14} /> Generate and save batch</button>
        </div>
      </div>

      {loading && <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm">Working…</div>}

      {result && (
        <div className={`border rounded-xl p-4 space-y-4 shadow-sm ${result.ok === false ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          {result.error ? <p className="text-sm text-red-700">{result.error}</p> : null}
          {result.message ? <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{result.message}</p> : null}

          <div className="grid md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-xs text-gray-400">Scanned</p><p className="font-display font-900 text-base text-navy-950">{result.totalScanned ?? 0}</p></div>
            <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-xs text-gray-400">Need work</p><p className="font-display font-900 text-base text-navy-950">{result.totalNeedingWork ?? 0}</p></div>
            <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-xs text-gray-400">Processed</p><p className="font-display font-900 text-base text-navy-950">{result.processed ?? 0}</p></div>
            <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-xs text-gray-400">Updated</p><p className="font-display font-900 text-base text-green-700">{result.updated?.length ?? 0}</p></div>
          </div>

          {result.preview?.length ? (
            <div>
              <h2 className="font-display font-700 text-navy-950 mb-2">Next products in queue</h2>
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="w-full table-fixed text-xs"><thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="w-[18%] px-3 py-2">SKU</th><th className="w-[46%] px-3 py-2">Product</th><th className="w-[24%] px-3 py-2">Category</th><th className="w-[12%] px-3 py-2 text-right">Open</th></tr></thead><tbody className="divide-y divide-slate-100">
                  {result.preview.map((product) => <tr key={product.id} className="hover:bg-slate-50"><td className="break-all px-3 py-2 font-mono text-[11px] text-accent">{product.sku}</td><td className="truncate px-3 py-2 text-xs text-navy-950">{product.title}</td><td className="truncate px-3 py-2 text-xs text-gray-500">{product.category}</td><td className="px-3 py-2 text-right"><Link className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-900 text-accent" href={`/admin/products/${product.id}`}>Edit</Link></td></tr>)}
                </tbody></table>
              </div>
            </div>
          ) : null}

          {result.updated?.length ? (
            <div>
              <h2 className="font-display font-700 text-navy-950 mb-2">Updated products</h2>
              <div className="space-y-2">
                {result.updated.map((product) => <div key={product.sku} className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs break-words"><span className="font-mono text-green-800">{product.sku}</span> — {product.title} <span className="text-green-700">({product.provider ?? "AI"} {product.model ?? ""})</span></div>)}
              </div>
            </div>
          ) : null}

          {result.errors?.length ? (
            <div>
              <h2 className="font-display font-700 text-red-800 mb-2">Errors</h2>
              <div className="space-y-2">
                {result.errors.map((item) => <div key={item.sku} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800 break-words"><span className="font-mono">{item.sku}</span> — {item.title}: {item.error}</div>)}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
