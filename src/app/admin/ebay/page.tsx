"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";

type Config = {
  environment: string;
  marketplaceId: string;
  clientId: string;
  clientSecretConfigured: boolean;
  ruName: string;
  refreshTokenConfigured: boolean;
  lastSyncAt?: string | null;
};

type Run = {
  id: string;
  status: string;
  message?: string | null;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string | null;
};

export default function EbayAdminPage() {
  const [config, setConfig] = useState<Config>({ environment: "production", marketplaceId: "EBAY_GB", clientId: "", clientSecretConfigured: false, ruName: "", refreshTokenConfigured: false });
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [configRes, runsRes] = await Promise.all([fetch("/api/ebay/config", { cache: "no-store" }), fetch("/api/ebay/runs", { cache: "no-store" })]);
    const configJson = await configRes.json();
    const runsJson = await runsRes.json();
    if (configJson.config) setConfig(configJson.config);
    setRuns(runsJson.runs ?? []);
  }

  useEffect(() => { load().catch(() => setMessage("Could not load eBay settings.")); }, []);

  async function save() {
    setSaving(true); setMessage("");
    const payload = {
      environment: config.environment,
      marketplaceId: config.marketplaceId,
      clientId: config.clientId,
      clientSecret: clientSecret || undefined,
      ruName: config.ruName,
      refreshToken: refreshToken || undefined,
    };
    const response = await fetch("/api/ebay/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) { setMessage(result.error || "Could not save eBay settings."); return; }
    setClientSecret(""); setRefreshToken(""); setMessage("eBay settings saved.");
    await load();
  }

  async function sync() {
    setSyncing(true); setMessage("Syncing eBay inventory. This can take a few minutes for large accounts...");
    const response = await fetch("/api/ebay/sync", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setSyncing(false);
    if (!response.ok || !result.ok) { setMessage(result.errors?.join(" ") || result.error || "eBay sync failed."); await load(); return; }
    setMessage(`Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`);
    await load();
  }

  const connected = config.refreshTokenConfigured;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">eBay Inventory Sync</h1>
          <p className="text-gray-400 text-sm mt-0.5">Connect eBay and import active Inventory API listings into Combay products.</p>
        </div>
        <button onClick={sync} disabled={syncing || !connected} className="btn-primary text-sm py-2 disabled:opacity-50">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync eBay Inventory"}
        </button>
      </div>

      {message && <div className={`rounded-xl px-4 py-3 text-sm border ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("could not") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>{message}</div>}

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-800 text-navy-950 text-lg">Connection settings</h2>
              <p className="text-xs text-gray-500 mt-1">Use your eBay developer application keys. For OAuth, your eBay developer app must have the Combay callback/accept URL configured.</p>
            </div>
            <div className={`badge border ${connected ? "bg-green-50 border-green-200 text-green-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
              {connected ? <CheckCircle size={13} /> : <AlertTriangle size={13} />} {connected ? "Connected" : "Not connected"}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Environment</label>
              <select className="input text-sm" value={config.environment} onChange={(e)=>setConfig(c=>({...c, environment:e.target.value}))}>
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Marketplace</label>
              <select className="input text-sm" value={config.marketplaceId} onChange={(e)=>setConfig(c=>({...c, marketplaceId:e.target.value}))}>
                <option value="EBAY_GB">United Kingdom (EBAY_GB)</option>
                <option value="EBAY_US">United States (EBAY_US)</option>
                <option value="EBAY_DE">Germany (EBAY_DE)</option>
                <option value="EBAY_FR">France (EBAY_FR)</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">eBay Client ID / App ID</label>
              <input className="input text-sm font-mono" value={config.clientId} onChange={(e)=>setConfig(c=>({...c, clientId:e.target.value}))} placeholder="Client ID" />
            </div>
            <div>
              <label className="label text-xs">eBay Client Secret / Cert ID</label>
              <input type="password" className="input text-sm font-mono" value={clientSecret} onChange={(e)=>setClientSecret(e.target.value)} placeholder={config.clientSecretConfigured ? "Saved - enter to replace" : "Client Secret"} />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">RuName / OAuth redirect URI name</label>
              <input className="input text-sm font-mono" value={config.ruName} onChange={(e)=>setConfig(c=>({...c, ruName:e.target.value}))} placeholder="Your eBay RuName" />
              <p className="text-[11px] text-gray-400 mt-1">eBay calls this the RuName. Configure the app Accept URL to your Combay callback URL in the eBay developer portal.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Refresh token</label>
              <textarea className="input text-sm font-mono min-h-[90px]" value={refreshToken} onChange={(e)=>setRefreshToken(e.target.value)} placeholder={config.refreshTokenConfigured ? "Saved - paste to replace" : "Paste refresh token if generated manually"} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm py-2">{saving ? "Saving…" : "Save eBay settings"}</button>
            <a href="/api/ebay/auth/start" className="btn-secondary text-sm py-2"><ExternalLink size={14} /> Connect with eBay OAuth</a>
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-xl p-5 h-fit">
          <h2 className="font-display font-800 text-navy-950 text-lg mb-3">Sync behaviour</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>Sync imports eBay Inventory API items by SKU, title, price, quantity, images and item specifics.</p>
            <p>Existing Combay products are updated when SKU matches. New SKUs are created as published products under eBay Import.</p>
            <p>Products marked as sync-excluded are skipped. Ended/out-of-stock listings are kept, not deleted.</p>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 text-xs text-gray-400 space-y-1">
            <p>Last sync: {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : "Never"}</p>
            <p>Secret saved: {config.clientSecretConfigured ? "Yes" : "No"}</p>
            <p>Refresh token saved: {config.refreshTokenConfigured ? "Yes" : "No"}</p>
          </div>
        </aside>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-800 text-navy-950">Recent sync runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead><tr><th>Started</th><th>Status</th><th>Imported</th><th>Updated</th><th>Skipped</th><th>Message / errors</th></tr></thead>
            <tbody>{runs.map(run=>(
              <tr key={run.id}>
                <td className="whitespace-nowrap text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</td>
                <td><span className={`badge border text-xs ${run.status === "SUCCESS" ? "bg-green-50 text-green-700 border-green-200" : run.status === "FAILED" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{run.status}</span></td>
                <td>{run.imported}</td><td>{run.updated}</td><td>{run.skipped}</td>
                <td className="text-xs text-gray-500 max-w-lg">{run.message}{run.errors?.length ? ` — ${run.errors.slice(0,3).join(" | ")}` : ""}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!runs.length && <div className="p-8 text-sm text-gray-400 text-center">No eBay sync runs yet.</div>}
      </section>
    </div>
  );
}
