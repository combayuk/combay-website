"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ExternalLink, RefreshCw, Settings, ShieldCheck, Wrench } from "lucide-react";

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
  mode?: string | null;
  startPage?: number | null;
  nextPage?: number | null;
  totalPages?: number | null;
  records?: number | null;
  message?: string | null;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string | null;
};

type SyncMode = "test10" | "first50" | "all";
type SyncingState = SyncMode | "repair" | "refresh" | "remapCategories" | "backgrounds" | "queueImages" | "backupImages" | null;
type Panel = "sync" | "maintenance" | "connection" | "compliance" | "runs";

const panels: Array<{ id: Panel; label: string }> = [
  { id: "sync", label: "Sync" },
  { id: "maintenance", label: "Maintenance" },
  { id: "connection", label: "Connection" },
  { id: "compliance", label: "Compliance" },
  { id: "runs", label: "Runs" },
];

export default function EbayAdminPage() {
  const [config, setConfig] = useState<Config>({
    environment: "production",
    marketplaceId: "EBAY_GB",
    clientId: "",
    clientSecretConfigured: false,
    ruName: "",
    refreshTokenConfigured: false,
  });
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<SyncingState>(null);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const [activePanel, setActivePanel] = useState<Panel>("sync");

  async function load() {
    const [configRes, runsRes, progressRes] = await Promise.all([
      fetch("/api/ebay/config", { cache: "no-store" }),
      fetch("/api/ebay/runs", { cache: "no-store" }),
      fetch("/api/ebay/sync", { cache: "no-store" }).catch(() => null),
    ]);
    const configJson = await configRes.json();
    const runsJson = await runsRes.json();
    const progressJson = progressRes ? await progressRes.json().catch(() => null) : null;
    if (configJson.config) setConfig(configJson.config);
    setRuns(runsJson.runs ?? []);
    if (progressJson?.ok) setSyncProgress(progressJson);
  }

  useEffect(() => {
    load().catch(() => setMessage("Could not load eBay settings."));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const payload = {
      environment: config.environment,
      marketplaceId: config.marketplaceId,
      clientId: config.clientId,
      clientSecret: clientSecret || undefined,
      ruName: config.ruName,
      refreshToken: refreshToken || undefined,
    };
    const response = await fetch("/api/ebay/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      setMessage(result.error || "Could not save eBay settings.");
      return;
    }
    setClientSecret("");
    setRefreshToken("");
    setMessage("eBay settings saved.");
    await load();
  }

  async function sync(mode: SyncMode) {
    setSyncing(mode);
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalRecords = 0;
    const savedCursor = Number(syncProgress?.config?.syncCursorPage || 1);
    let page = mode === "all" && syncProgress?.config?.syncDone === false ? Math.max(1, savedCursor) : 1;
    const startingPage = page;
    let done = false;
    const maxSafetyPages = mode === "all" ? 250 : 1;
    const label = mode === "test10" ? "test sync of first 10 listings" : mode === "first50" ? "first 50 listings" : mode === "all" && startingPage > 1 ? `all available listings from saved page ${startingPage}` : "all available listings in safe batches";
    setMessage(`Starting ${label}. Do not start another sync until this finishes.`);

    try {
      while (!done && page <= maxSafetyPages) {
        const payload = mode === "all"
          ? { mode, startPage: page, maxPages: 1, maxListings: 50, entriesPerPage: 50, fast: true }
          : { mode, fast: true };
        setMessage(mode === "all" ? `Sync all running safely in batches. Processing eBay page ${page}...` : `Starting ${label}...`);
        const response = await fetch("/api/ebay/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.errors?.join(" ") || result.error || "eBay sync failed.");
        totalImported += Number(result.imported || 0);
        totalUpdated += Number(result.updated || 0);
        totalSkipped += Number(result.skipped || 0);
        totalRecords += Number(result.records || 0);
        done = mode !== "all" || Boolean(result.done);
        page = Number(result.nextPage || page + 1);
        await load();
        if (mode !== "all") break;
      }

      setMessage(`Sync complete: ${totalImported} imported, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalRecords} records processed.${mode === "all" ? ` Full sync ran in safe 50-listing batches${startingPage > 1 ? ` from saved page ${startingPage}` : ""}.` : ""}`);
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
    setMessage("Refreshing only the remaining eBay imports that still need category/overview work.");
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

  async function remapCategoriesOnly() {
    setSyncing("remapCategories");
    setMessage("Remapping all visible products into the Combay public category taxonomy and cleaning unused noisy marketplace categories.");
    try {
      const response = await fetch("/api/ebay/remap-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 5000 }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.errors?.join(" ") || result.error || "Category remap failed.");
      setMessage(result.message || `Category remap complete. Updated ${result.updated || 0}; skipped ${result.skipped || 0}.`);
    } catch (error: any) {
      setMessage(error.message || "Could not remap product categories.");
    } finally {
      setSyncing(null);
      await load();
    }
  }

  async function requestImageBackup() {
    setSyncing("backupImages");
    setMessage("Requesting a 48-hour downloadable processed-image backup export.");
    try {
      const response = await fetch("/api/admin/product-images/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup", email: "sales@combay.co.uk" }),
      });
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
    setMessage("Resetting stuck sync state and saved full-sync cursor...");
    const response = await fetch("/api/ebay/sync", { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? result.message || `Reset ${result.resetCount || 0} stuck sync run(s).` : result.error || "Could not reset sync state.");
    await load();
  }

  async function pauseOrResumeFullSync(paused: boolean) {
    setMessage(paused ? "Pausing full sync after the current page..." : "Resuming full sync.");
    const response = await fetch("/api/ebay/sync", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: paused ? "pause" : "resume" }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? (paused ? "Full sync paused." : "Full sync resumed.") : result.error || "Could not update sync pause state.");
    await load();
  }

  async function resetFullSyncProgress() {
    setMessage("Resetting full-sync saved page to 1.");
    const response = await fetch("/api/ebay/sync", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-progress" }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? result.message || "Full-sync progress reset." : result.error || "Could not reset full-sync progress.");
    await load();
  }

  async function parkImageJobsForV2() {
    setSyncing("backgrounds");
    setMessage("Parking old background-removal jobs for V2 and keeping original product images live.");
    const response = await fetch("/api/admin/product-images/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "park-v2-cleanup" }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? result.message || "Image processing jobs parked for V2." : result.error || "Could not park image processing jobs.");
    setSyncing(null);
    await load();
  }

  async function deleteParkedImageRecords() {
    setSyncing("backgrounds");
    setMessage("Deleting parked/rejected image-processing database records. Original product images remain live.");
    const response = await fetch("/api/admin/product-images/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-parked-v2-records" }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(result.ok ? result.message || "Parked image-processing records deleted." : result.error || "Could not delete parked image-processing records.");
    setSyncing(null);
    await load();
  }

  const connected = config.refreshTokenConfigured;
  const configured = config.clientId && config.clientSecretConfigured && config.ruName;
  const accountDeletionEndpoint = typeof window !== "undefined" ? `${window.location.origin}/api/ebay/account-deletion` : "/api/ebay/account-deletion";
  const latestRun = runs[0] || null;
  const running = Boolean(syncing);
  const fullSyncPage = syncProgress?.config?.syncDone === false ? syncProgress?.config?.syncCursorPage || 1 : 1;
  const fullSyncLabel = syncProgress?.config?.syncDone === false ? `Saved page ${fullSyncPage}${syncProgress?.config?.syncTotalPages ? ` of ${syncProgress.config.syncTotalPages}` : ""}` : "Ready from page 1";
  const runStats = useMemo(() => {
    const recent = runs.slice(0, 20);
    return {
      success: recent.filter((run) => run.status === "SUCCESS" || run.status === "PARTIAL").length,
      failed: recent.filter((run) => run.status === "FAILED").length,
      running: recent.filter((run) => run.status === "RUNNING").length,
    };
  }, [runs]);

  function passFail(mode: SyncMode) {
    const relevant = runs.filter((run) => (run.message || "").includes(`(${mode},`));
    const pass = relevant.filter((run) => run.status === "SUCCESS" || run.status === "PARTIAL").length;
    const fail = relevant.filter((run) => run.status === "FAILED").length;
    return `${pass}/${fail}`;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-gray-400">Marketplace operations</p>
            <h1 className="font-display text-2xl font-900 text-navy-950">eBay inventory sync</h1>
            <p className="mt-1 text-xs text-gray-500">Compact operator console for OAuth, batch imports, detail repair, category cleanup and compliance checks.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatePill label="OAuth" ok={connected} okText="Connected" badText="Not connected" />
            <StatePill label="Keys" ok={Boolean(configured)} okText="Configured" badText="Incomplete" />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-900 text-slate-600">Runs: {runStats.success} pass · {runStats.failed} fail</span>
            <button type="button" onClick={() => load()} className="btn-secondary py-2 text-xs"><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>
      </section>

      {message ? <div className={`rounded-xl border px-4 py-3 text-sm ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("could not") ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{message}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Last sync" value={config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : "Never"} />
        <Metric label="Full-sync cursor" value={fullSyncLabel} />
        <Metric label="Latest run" value={latestRun ? `${latestRun.status} · ${latestRun.mode || "sync"}` : "No runs yet"} />
        <Metric label="Pass/fail" value={`10: ${passFail("test10")} · 50: ${passFail("first50")} · All: ${passFail("all")}`} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => setActivePanel(panel.id)}
              className={`rounded-lg px-3 py-2 text-xs font-900 transition-colors ${activePanel === panel.id ? "bg-white text-navy-950 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}
            >
              {panel.label}
            </button>
          ))}
        </div>

        {activePanel === "sync" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_330px]">
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <ActionButton title="Test 10" description="Quick check before larger imports." busy={syncing === "test10"} disabled={running || !connected} onClick={() => sync("test10")} />
                <ActionButton title="First 50" description="Review mapping, details and images." busy={syncing === "first50"} disabled={running || !connected} onClick={() => sync("first50")} />
                <ActionButton title="Sync all" description="Resumable 50-listing batches." primary busy={syncing === "all"} disabled={running || !connected} onClick={() => sync("all")} />
              </div>

              {syncProgress ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-display text-sm font-900 text-navy-950">Large inventory progress</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {fullSyncLabel}
                        {syncProgress.config?.syncPaused ? <span className="ml-2 font-900 text-amber-700">Paused</span> : null}
                      </p>
                      {syncProgress.config?.syncLastMessage ? <p className="mt-2 text-xs text-gray-500">{syncProgress.config.syncLastMessage}</p> : null}
                      {syncProgress.config?.syncLastError ? <p className="mt-2 text-xs text-red-600">{syncProgress.config.syncLastError}</p> : null}
                      {syncProgress.activeRun ? <p className="mt-2 text-xs text-blue-700">A sync run is marked RUNNING. Reset only if stale.</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => pauseOrResumeFullSync(!syncProgress.config?.syncPaused)} className="btn-secondary py-2 text-xs">{syncProgress.config?.syncPaused ? "Resume" : "Pause"}</button>
                      <button type="button" onClick={resetFullSyncProgress} className="btn-secondary py-2 text-xs">Reset page</button>
                      <button type="button" onClick={resetSync} className="btn-secondary py-2 text-xs">Reset stuck</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <OperatorCard title="Recommended sync flow" icon={<RefreshCw size={15} />}>
              <StepLine step="1" title="Connect" text={connected ? "OAuth token saved." : "Save keys and connect OAuth first."} />
              <StepLine step="2" title="Test" text="Run Test 10 after config changes." />
              <StepLine step="3" title="Import" text="Run First 50, then Sync all." />
              <StepLine step="4" title="Clean" text="Repair details and remap categories." />
            </OperatorCard>
          </div>
        )}

        {activePanel === "maintenance" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_330px]">
            <div className="grid gap-2 md:grid-cols-2">
              <ActionButton title="Repair missing details" description="Images, specifics, descriptions and shallow imports." busy={syncing === "repair"} disabled={running || !connected} onClick={repairMissingDetails} />
              <ActionButton title="Refresh categories/overviews" description="Safe batch refresh for remaining imports." busy={syncing === "refresh"} disabled={running || !connected} onClick={refreshCategoriesAndOverviews} />
              <ActionButton title="Remap categories only" description="No eBay call. Cleans public taxonomy." busy={syncing === "remapCategories"} disabled={running} onClick={remapCategoriesOnly} />
              <ActionButton title="Request image backup" description="48-hour export for processed-image records." busy={syncing === "backupImages"} disabled={running} onClick={requestImageBackup} />
            </div>

            <OperatorCard title="Parked V2 image worker" icon={<Wrench size={15} />}>
              <p className="text-xs leading-5 text-gray-500">Background removal remains parked after quality testing. Original eBay images stay live. Use cleanup only if old test records reappear.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={parkImageJobsForV2} disabled={running} className="btn-secondary py-2 text-xs">Park old jobs</button>
                <button type="button" onClick={deleteParkedImageRecords} disabled={running} className="btn-secondary py-2 text-xs">Delete parked records</button>
              </div>
            </OperatorCard>
          </div>
        )}

        {activePanel === "connection" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_330px]">
            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Environment">
                  <select className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={config.environment} onChange={(event) => setConfig((current) => ({ ...current, environment: event.target.value }))}>
                    <option value="production">Production</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </Field>
                <Field label="Marketplace">
                  <select className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent" value={config.marketplaceId} onChange={(event) => setConfig((current) => ({ ...current, marketplaceId: event.target.value }))}>
                    <option value="EBAY_GB">United Kingdom (EBAY_GB)</option>
                    <option value="EBAY_US">United States (EBAY_US)</option>
                    <option value="EBAY_DE">Germany (EBAY_DE)</option>
                    <option value="EBAY_FR">France (EBAY_FR)</option>
                  </select>
                </Field>
                <Field label="Client ID / App ID">
                  <input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent font-mono" value={config.clientId} onChange={(event) => setConfig((current) => ({ ...current, clientId: event.target.value }))} placeholder="Client ID" />
                </Field>
                <Field label="Client Secret / Cert ID">
                  <input type="password" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent font-mono" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder={config.clientSecretConfigured ? "Saved — enter to replace" : "Client Secret"} />
                </Field>
                <Field label="RuName / redirect URI name">
                  <input className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-accent font-mono" value={config.ruName} onChange={(event) => setConfig((current) => ({ ...current, ruName: event.target.value }))} placeholder="Your eBay RuName" />
                </Field>
                <Field label="Refresh token">
                  <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent min-h-[82px] font-mono" value={refreshToken} onChange={(event) => setRefreshToken(event.target.value)} placeholder={config.refreshTokenConfigured ? "Saved — paste to replace" : "Paste refresh token if generated manually"} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={saving} className="btn-primary py-2 text-xs">{saving ? "Saving…" : "Save settings"}</button>
                <a href="/api/ebay/auth/start" className="btn-secondary py-2 text-xs"><ExternalLink size={14} /> Connect OAuth</a>
                <button type="button" onClick={resetSync} className="btn-secondary py-2 text-xs">Reset stuck sync</button>
              </div>
            </section>

            <OperatorCard title="Connection status" icon={<Settings size={15} />}>
              <StatusRow label="Client secret" value={config.clientSecretConfigured ? "Saved" : "Missing"} ok={config.clientSecretConfigured} />
              <StatusRow label="Refresh token" value={config.refreshTokenConfigured ? "Saved" : "Missing"} ok={config.refreshTokenConfigured} />
              <StatusRow label="Marketplace" value={config.marketplaceId || "—"} ok={Boolean(config.marketplaceId)} />
              <StatusRow label="Last sync" value={config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : "Never"} ok={Boolean(config.lastSyncAt)} />
            </OperatorCard>
          </div>
        )}

        {activePanel === "compliance" && (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_330px]">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-display text-base font-900 text-amber-950">Production keyset compliance</h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900">eBay may keep production keys disabled until Marketplace Account Deletion/Closure Notifications are configured. Add the endpoint below in eBay Developer notifications and keep the same verification token in Vercel.</p>
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-xs">
                    <p className="mb-1 text-gray-500">Notification endpoint URL</p>
                    <code className="break-all font-mono text-navy-950">{accountDeletionEndpoint}</code>
                  </div>
                  <p className="mt-2 text-xs text-amber-800">Token requirement: 32–80 characters, letters/numbers/underscore/hyphen only.</p>
                </div>
              </div>
            </section>
            <OperatorCard title="Compliance checklist" icon={<ShieldCheck size={15} />}>
              <StepLine step="1" title="Endpoint challenge" text="GET challenge should return 200." />
              <StepLine step="2" title="Test notification" text="eBay Developer Portal notification should return 200." />
              <StepLine step="3" title="Token" text="Vercel token must match eBay portal token exactly." />
            </OperatorCard>
          </div>
        )}

        {activePanel === "runs" && (
          <section className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-display text-lg font-900 text-navy-950">Recent sync runs</h2>
              <p className="text-xs text-gray-500">Compact log of sync, repair and remap operations.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <tr><th className="px-4 py-2">Started</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Mode/page</th><th className="px-4 py-2">Imported</th><th className="px-4 py-2">Updated</th><th className="px-4 py-2">Skipped</th><th className="px-4 py-2">Records</th><th className="px-4 py-2">Message / errors</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3"><RunStatus status={run.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{run.mode || "—"}{run.startPage ? ` / p.${run.startPage}` : ""}{run.nextPage ? ` → ${run.nextPage}` : ""}</td>
                      <td className="px-4 py-3">{run.imported}</td>
                      <td className="px-4 py-3">{run.updated}</td>
                      <td className="px-4 py-3">{run.skipped}</td>
                      <td className="px-4 py-3">{run.records || 0}</td>
                      <td className="max-w-xl px-4 py-3 text-xs text-gray-500">{run.message}{run.errors?.length ? ` — ${run.errors.slice(0, 3).join(" | ")}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!runs.length ? <div className="p-8 text-center text-sm text-gray-400">No eBay sync runs yet.</div> : null}
          </section>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-900 uppercase tracking-wider text-gray-400">{label}</p><p className="mt-1 truncate text-sm font-900 text-navy-950">{value}</p></div>;
}

function StatePill({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-900 ${ok ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{label}: {ok ? okText : badText}</span>;
}

function ActionButton({ title, description, busy, disabled, onClick, primary }: { title: string; description: string; busy?: boolean; disabled?: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${primary ? "border-[#E8A44A] bg-[#FFF8E8] hover:bg-[#FFF3D7]" : "border-slate-200 bg-white hover:border-accent/60"}`}>
      <span className="flex items-center gap-2 font-display text-sm font-900 text-navy-950"><RefreshCw size={14} className={busy ? "animate-spin" : ""} /> {title}</span>
      <span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span>
    </button>
  );
}

function OperatorCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center gap-2 font-display text-sm font-900 text-navy-950">{icon}{title}</div>{children}</aside>;
}

function StepLine({ step, title, text }: { step: string; title: string; text: string }) {
  return <div className="flex gap-3 border-b border-slate-200 py-2 last:border-b-0"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-900 text-accent">{step}</span><span><span className="block text-xs font-900 text-navy-950">{title}</span><span className="block text-xs leading-5 text-gray-500">{text}</span></span></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-900 uppercase tracking-wide text-gray-400">{label}</span>{children}</label>;
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0"><span className="text-xs text-gray-500">{label}</span><span className={`text-xs font-900 ${ok ? "text-green-700" : "text-amber-700"}`}>{value}</span></div>;
}

function RunStatus({ status }: { status: string }) {
  const style = status === "SUCCESS" || status === "PARTIAL" ? "bg-green-50 text-green-700 border-green-200" : status === "FAILED" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200";
  return <span className={`rounded-full border px-2 py-1 text-xs font-900 ${style}`}>{status}</span>;
}
