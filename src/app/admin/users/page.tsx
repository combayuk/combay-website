"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, RefreshCw, Search, UserRound, ShieldAlert } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  phoneCode?: string | null;
  role: "ADMIN" | "CUSTOMER";
  accountType?: string | null;
  company?: string | null;
  emailVerified?: string | null;
  requiresEmailVerification?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  suspendedEmailSentAt?: string | null;
  createdAt: string;
};

function fmt(value?: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true); setError("");
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error || "Could not load users."); return; }
    setUsers(data.users || []);
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.email, user.name, user.phone, user.phoneCode, user.company, user.role].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [users, query]);

  async function updateUser(user: AdminUser, action: "suspend" | "reactivate") {
    const confirmMessage = action === "suspend"
      ? `Suspend ${user.email}? They will not be able to sign in, or register again using the same email or phone number.`
      : `Reactivate ${user.email}?`;
    if (!window.confirm(confirmMessage)) return;
    setSavingId(user.id); setError(""); setMessage("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: "Commercial account access review" }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingId(null);
    if (!res.ok) { setError(data.error || "Could not update user."); return; }
    setMessage(action === "suspend" ? "User suspended and suspension email triggered." : "User reactivated.");
    await loadUsers();
  }

  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;
  const suspendedCount = users.filter((u) => u.suspendedAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Admin</p>
          <h1 className="font-display text-3xl font-900 tracking-tight text-navy-950">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">View registered customers, contact details and account status. Suspended users cannot sign in or create a new account with the same email/phone.</p>
        </div>
        <button onClick={loadUsers} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-800 uppercase tracking-wider text-slate-400">Total users</p><p className="mt-1 font-display text-3xl font-900 text-navy-950">{users.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-800 uppercase tracking-wider text-slate-400">Customers</p><p className="mt-1 font-display text-3xl font-900 text-navy-950">{customerCount}</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"><p className="text-xs font-800 uppercase tracking-wider text-red-500">Suspended</p><p className="mt-1 font-display text-3xl font-900 text-red-700">{suspendedCount}</p></div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-700 text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-700 text-green-700">{message}</div> : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <label className="flex max-w-lg items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-accent">
            <Search size={16} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email, name, phone or company" className="min-w-0 flex-1 text-sm outline-none" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-900 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading users...</td></tr> : null}
              {!loading && filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr> : null}
              {filtered.map((user) => {
                const suspended = Boolean(user.suspendedAt);
                return (
                  <tr key={user.id} className={suspended ? "bg-red-50/50" : "bg-white"}>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${suspended ? "bg-red-100 text-red-700" : "bg-slate-100 text-navy-900"}`}><UserRound size={17} /></span>
                        <div>
                          <p className="font-900 text-navy-950">{user.name || "Unnamed user"}</p>
                          <p className="text-slate-500">{user.email}</p>
                          {user.company ? <p className="mt-1 text-xs text-slate-400">{user.company}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-600">{[user.phoneCode, user.phone].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-4 align-top"><span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-800 text-slate-600">{user.role}{user.accountType ? ` · ${user.accountType}` : ""}</span></td>
                    <td className="px-4 py-4 align-top">
                      {suspended ? <div className="text-red-700"><p className="flex items-center gap-1 font-900"><ShieldAlert size={14} /> Suspended</p><p className="mt-1 text-xs text-red-500">{fmt(user.suspendedAt)}</p></div> : <p className="flex items-center gap-1 font-900 text-green-700"><CheckCircle2 size={14} /> Active</p>}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-500">{fmt(user.createdAt)}</td>
                    <td className="px-4 py-4 align-top text-right">
                      {user.role === "ADMIN" ? <span className="text-xs text-slate-400">Protected</span> : suspended ? <button disabled={savingId === user.id} onClick={() => updateUser(user, "reactivate")} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-900 text-navy-900 hover:bg-slate-50 disabled:opacity-50">Reactivate</button> : <button disabled={savingId === user.id} onClick={() => updateUser(user, "suspend")} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-900 text-red-700 hover:bg-red-50 disabled:opacity-50"><Ban size={13} /> Suspend</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
