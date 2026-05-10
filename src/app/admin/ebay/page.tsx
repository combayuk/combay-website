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
  const [syncing, setSyncing] = useState<"test10" | "first50" | "all" | "repair" | "refresh" | "backgrounds" | "queueImages" | "backupImages" | null>(null);
  const [imageQueueStats, setImageQueueStats] = useState<any>(null);

  async function load() {
    const [configRes, runsRes, queueRes] = await Promise.all([
      fetch("/api/ebay/config", { cache: "no-store" }),
      fetch("/api/ebay/runs", { cache: "no-store" }),
      fetch("/api/admin/product-images/queue", { cache: "no-store" }).catch(() => null),
    ]);
    const configJson = await configRes.json();
    const runsJson = await runsRes.json();
    const queueJson = queueRes ? await queueRes.json().catch(() => null) : null;
    if (configJson.config) setConfig(configJson.config);
    setRuns(runsJson.runs ?? []);
    if (queueJson?.ok) setImageQueueStats(queueJson);
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

  async function sync(mode: "test10" | "first50" | "all") {
    setSyncing(mode);
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalRecords = 0;
    let page = 1;
    let done = false;
    const maxSafetyPages = mode === "all" ? 250 : 1; // 250 pages × 50 entries = 12,500 listings capacity.
    const label = mode === "test10" ? "test sync of first 10 listings" : mode === "first50" ? "first 50 listings" : "all available listings in safe batches";
    setMessage(`Starting ${label}. Do not start another sync until this finishes.`);

    try {
      while (!done && page <= maxSafetyPages) {
        const payload = mode === "all"
          ? { mode, startPage: page, maxPages: 1, maxListings: 50, entriesPerPage: 50, fast: true }
          : { mode, fast: true };
        setMessage(mode === "all" ? `Sync all running safely in batches. Processing eBay page ${page}...` : `Starting ${label}...`);
        const response = await fetch("/api/ebay/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.errors?.join(" ") || result.error || "eBay sync failed.");
        }
        totalImported += Number(result.imported || 0);
        totalUpdated += Number(result.updated || 0);
        totalSkipped += Number(result.skipped || 0);
        totalRecords += Number(result.records || 0);
        done = mode !== "all" || Boolean(result.done);
        page = Number(result.nextPage || page + 1);
        await load();
        if (mode !== "all") break;
      }

      setMessage(`Sync complete: ${totalImported} imported, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalRecords} records processed.${mode === "all" ? " Full sync ran in safe 50-listing batches to reduce timeout failures." : ""}`);
    } catch (error: any) {
      setMessage(error.message || "eBay sync failed.");
    } finally {
      setSyncing(null);
      await load();
    }
  }


  async function repairMissingDetails() {
    setSyncing("repair");
    setMessage("Scanning all eBay imports and repairing shallow products with missing images, fallback descriptions, missing specifics or eBay Import category.");
    try {
      const response = await fetch("/api/ebay/repair-missing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 75 }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.errors?.join(" ") || result.error || "Repair failed.");
      setMessage(`${result.message || "Repair complete."} Updated ${result.updated || 0}, imported ${result.imported || 0}, skipped ${result.skipped || 0}.`);
    } catch (error: any) {
      setMessage(error.message || "Could not repair shallow eBay imports.");
    } finally {
      setSyncing(null);
      await load();
    }
  }

  async function refreshCategoriesAndOverviews() {
    setSyncing("refresh");
    setMessage("Refreshing only the remaining eBay imports that still need category/overview work. Run again only if the message says products remain.");
    try {
      const response = await fetch("/api/ebay/refresh-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 100 }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.errors?.join(" ") || result.error || "Refresh failed.");
      setMessage(`${result.message || "Refresh complete."} Updated ${result.updated || 0}, skipped ${result.skipped || 0}.`);
    } catch (error: any) {
      setMessage(error.message || "Could not refresh eBay categories and overviews.");
    } finally {
      setSyncing(null);
      await load();
    }
  }

  async function queueImageBackgrounds() {
    setSyncing("queueImages");
    setMessage("Queueing eBay product images for VPS/local background removal. Original image files are not stored permanently.");
    try {
      const response = await fetch("/api/admin/product-images/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "queue", source: "ebay", limit: 5000, includeGallery: true }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not queue image background jobs.");
      setMessage(result.message || `Queued ${result.queued || 0} image(s).`);
    } catch (error: any) {
      setMessage(error.message || "Could not queue image background jobs.");
    } finally {
      setSyncing(null);
      await load();
    }
  }

  async function requestImageBackup() {
    setSyncing("backupImages");
    setMessage("Requesting a 48-hour downloadable processed-image backup export.");
    try {
      const response = await fetch("/api/admin/product-images/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "backup", email: "sales@combay.co.uk" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not request image backup export.");
      setMessage(result.message || "Image backup export queued.");
    } catch (error: any) {
      setMessage(error.message || "Could not request image backup export.");
    } finally {
      setSyncing(null);
      await load();
    }
  }

  async function resetSync() {
    setMessage("Resetting stuck sync state...");
    const response = await fetch("/api/ebay/sync", { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? `Reset ${result.resetCount || 0} stuck sync run(s).` : result.error || "Could not reset sync state.");
    await load();
  }

  const connected = config.refreshTokenConfigured;
  const accountDeletionEndpoint = typeof window !== "undefined" ? `${window.location.origin}/api/ebay/account-deletion` : "/api/ebay/account-deletion";

  function passFail(mode: "test10" | "first50" | "all") {
    const relevant = runs.filter((run) => (run.message || "").includes(`(${mode},`));
    const pass = relevant.filter((run) => run.status === "SUCCESS" || run.status === "PARTIAL").length;
    const fail = relevant.filter((run) => run.status === "FAILED").length;
    return `${pass}/${fail}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-800 text-navy-950 text-2xl">eBay Inventory Sync</h1>
          <p className="text-gray-400 text-sm mt-0.5">Connect eBay and import products using one unified sync. The system tries the Sell Inventory API first, then falls back to active eBay listings where needed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => sync("test10")} disabled={!!syncing || !connected} className="btn-secondary text-sm py-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncing === "test10" ? "animate-spin" : ""} /> Test sync 10
          </button>
          <button onClick={() => sync("first50")} disabled={!!syncing || !connected} className="btn-secondary text-sm py-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncing === "first50" ? "animate-spin" : ""} /> Sync first 50
          </button>
          <button onClick={() => sync("all")} disabled={!!syncing || !connected} className="btn-primary text-sm py-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncing === "all" ? "animate-spin" : ""} /> Sync all
          </button>
          <button onClick={repairMissingDetails} disabled={!!syncing || !connected} className="btn-secondary text-sm py-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncing === "repair" ? "animate-spin" : ""} /> Repair missing details
          </button>
          <button onClick={refreshCategoriesAndOverviews} disabled={!!syncing || !connected} className="btn-secondary text-sm py-2 disabled:opacity-50">
            <RefreshCw size={14} className={syncing === "refresh" ? "animate-spin" : ""} /> Refresh categories/overviews
          </button>
          <button type="button" disabled className="btn-secondary text-sm py-2 opacity-50 cursor-not-allowed" title="Background removal is parked for V2 after quality testing.">
            <RefreshCw size={14} /> Image processing parked for V2
          </button>
        </div>
      </div>

      {message && <div className={`rounded-xl px-4 py-3 text-sm border ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("could not") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-800"}`}>{message}</div>}

      <section className="grid sm:grid-cols-3 gap-3">
        {[
          ["Test sync 10", passFail("test10")],
          ["Sync first 50", passFail("first50")],
          ["Sync all", passFail("all")],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Since speed patch</p>
            <p className="font-display font-800 text-navy-950 mt-1">{label}</p>
            <p className="text-sm text-gray-500 mt-1">Pass / fail: <span className="font-display font-800 text-navy-950">{value}</span></p>
          </div>
        ))}
      </section>

      {imageQueueStats ? (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Image worker</p>
            <p className="font-display font-800 text-navy-950 mt-1">{imageQueueStats.stats?.workerConfigured ? "Secret configured" : "Secret missing"}</p>
            <p className="text-xs text-gray-500 mt-1">Set IMAGE_WORKER_SECRET for VPS/local workers.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Queued jobs</p>
            <p className="font-display font-800 text-navy-950 mt-1">{imageQueueStats.stats?.jobs?.QUEUED || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Waiting for background removal.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Needs review / failed</p>
            <p className="font-display font-800 text-navy-950 mt-1">{(imageQueueStats.stats?.jobs?.NEEDS_REVIEW || 0) + (imageQueueStats.stats?.jobs?.FAILED || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Review before applying poor cut-outs.</p>
          </div>
        </section>
      ) : null}

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <h2 className="font-display font-800 text-amber-950">Production keyset compliance</h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              eBay may keep production keys disabled until Marketplace Account Deletion/Closure Notifications are configured.
              Use the endpoint below in eBay Developer notifications, then add the same verification token to Vercel as <span className="font-mono">EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN</span>.
            </p>
            <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs">
              <p className="text-gray-500 mb-1">Notification endpoint URL</p>
              <code className="font-mono text-navy-950 break-all">{accountDeletionEndpoint}</code>
            </div>
            <p className="text-xs text-amber-800">The verification token must be 32-80 characters and use only letters, numbers, underscore or hyphen.</p>
          </div>
        </div>
      </section>

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
            <button type="button" onClick={resetSync} className="btn-secondary text-sm py-2">Reset stuck sync</button>
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-xl p-5 h-fit">
          <h2 className="font-display font-800 text-navy-950 text-lg mb-3">Sync behaviour</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>The sync still uses one unified engine: Sell Inventory API first, then Active Listings fallback if the inventory API returns no records.</p>
            <p>Use <strong>Test sync 10</strong> before a full import. Then use <strong>Sync first 50</strong> to check mapping, descriptions and images before running all listings.</p>
            <p><strong>Sync all</strong> now runs in safe 50-listing batches. This avoids one long Vercel request and is designed for larger inventories, including 5,000+ listings.</p>
            <p><strong>Repair missing details</strong> scans all imported eBay products, then repairs shallow records that still have missing images, fallback descriptions, missing specifics or generic eBay Import categories. It repairs a safe batch at a time; run again if the message says products remain queued.</p><p><strong>Refresh categories/overviews</strong> remaps eBay imports into the closest website category and rebuilds shorter, more precise overview text. It processes a safe batch at a time.</p>
            <p>Existing Combay products are updated by eBay item ID or SKU. New listings are created as published products, including title, price, stock, images, item specifics and cleaned description where available.</p>
            <p>Products marked as sync-excluded are skipped. Ended/out-of-stock listings are kept, not deleted. Reset stuck sync marks old running jobs as failed if Vercel/browser state gets stuck.</p><p><strong>Image background removal is parked for V2.</strong> The queue/worker infrastructure remains in the codebase, but bulk background removal is disabled in the admin UI because the first quality test was not acceptable for industrial/eBay source photos.</p>
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
