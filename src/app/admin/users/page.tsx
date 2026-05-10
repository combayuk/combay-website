"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, RefreshCw, Search, ShieldAlert, Trash2, UserPlus, UserRound } from "lucide-react";

const ROOT_ADMIN_EMAIL = "sales@combay.co.uk";

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
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", phone: "", password: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

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

  async function createAdmin(event: React.FormEvent) {
    event.preventDefault();
    setCreatingAdmin(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAdmin),
    });
    const data = await res.json().catch(() => ({}));
    setCreatingAdmin(false);
    if (!res.ok || !data.ok) { setError(data.error || "Could not create admin account."); return; }
    setMessage(`${data.user.email} has been created/updated as an admin account.`);
    setNewAdmin({ name: "", email: "", phone: "", password: "" });
    await loadUsers();
  }

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

  async function deleteAdmin(user: AdminUser) {
    if (user.role !== "ADMIN") return;
    if (user.email.toLowerCase() === ROOT_ADMIN_EMAIL) { setError("The sales@combay.co.uk primary admin account cannot be deleted."); return; }
    if (!window.confirm(`Delete admin account ${user.email}? This removes their admin login permanently.`)) return;
    setSavingId(user.id); setError(""); setMessage("");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setSavingId(null);
    if (!res.ok || !data.ok) { setError(data.error || "Could not delete admin account."); return; }
    setMessage(`${user.email} admin account deleted.`);
    await loadUsers();
  }

  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const suspendedCount = users.filter((u) => u.suspendedAt).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-900 uppercase tracking-[0.18em] text-accent">Admin</p>
          <h1 className="font-display text-2xl font-900 tracking-tight text-navy-950">Users</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">View registered customers, manage admin access and suspend accounts where needed. Suspended users cannot sign in or register again with the same email/phone.</p>
        </div>
        <button onClick={loadUsers} disabled={loading} className="btn-secondary inline-flex items-center gap-2 py-2 text-xs">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-900 text-navy-950">{users.length} users</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-900 text-blue-700">{customerCount} customers</span>
          <span className="rounded-full bg-purple-50 px-3 py-1.5 font-900 text-purple-700">{adminCount} admins</span>
          <span className="rounded-full bg-red-50 px-3 py-1.5 font-900 text-red-700">{suspendedCount} suspended</span>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-700 text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-700 text-green-700">{message}</div> : null}

      <form onSubmit={createAdmin} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={18} className="text-accent" />
          <div>
            <h2 className="font-display text-base font-900 text-navy-950">Create admin account</h2>
            <p className="text-xs text-slate-500">Additional admin accounts can be deleted later. The primary sales@combay.co.uk admin cannot be deleted.</p>
          </div>
        </div>
        <div className="grid gap-2.5 lg:grid-cols-4">
          <input className="input h-10 text-sm" placeholder="Name" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} />
          <input className="input h-10 text-sm" type="email" required placeholder="Admin email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
          <input className="input h-10 text-sm" placeholder="Phone optional" value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
          <input className="input h-10 text-sm" type="password" required minLength={10} placeholder="Temporary password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
        </div>
        <button disabled={creatingAdmin} className="btn-primary mt-3 inline-flex items-center gap-2 py-2 text-xs"><UserPlus size={15} /> {creatingAdmin ? "Creating..." : "Create admin"}</button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <label className="flex max-w-lg items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-accent">
            <Search size={16} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email, name, phone or company" className="min-w-0 flex-1 text-sm outline-none" />
          </label>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left text-[11px] font-900 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[28%] px-3 py-2">User</th>
                <th className="w-[13%] px-3 py-2">Phone</th>
                <th className="w-[14%] px-3 py-2">Type</th>
                <th className="w-[14%] px-3 py-2">Status</th>
                <th className="w-[11%] px-3 py-2">Created</th>
                <th className="w-[20%] px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading users...</td></tr> : null}
              {!loading && filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No users found.</td></tr> : null}
              {filtered.map((user) => {
                const suspended = Boolean(user.suspendedAt);
                const rootAdmin = user.email.toLowerCase() === ROOT_ADMIN_EMAIL;
                return (
                  <tr key={user.id} className={suspended ? "bg-red-50/50" : "bg-white"}>
                    <td className="px-3 py-3 align-top">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${suspended ? "bg-red-100 text-red-700" : "bg-slate-100 text-navy-900"}`}><UserRound size={17} /></span>
                        <div className="min-w-0">
                          <p className="font-900 text-navy-950 break-words">{user.name || "Unnamed user"} {rootAdmin ? <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-900 text-navy-950">Primary admin</span> : null}</p>
                          <p className="break-all text-[11px] text-slate-500">{user.email}</p>
                          {user.company ? <p className="mt-1 truncate text-[11px] text-slate-400">{user.company}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-600 break-words">{[user.phoneCode, user.phone].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-3 py-3 align-top"><span className="inline-flex max-w-full rounded-full border border-slate-200 px-2 py-1 text-[11px] font-800 text-slate-600"><span className="min-w-0 truncate">{user.role}{user.accountType ? ` · ${user.accountType}` : ""}</span></span></td>
                    <td className="px-3 py-3 align-top">
                      {suspended ? <div className="text-red-700"><p className="flex items-center gap-1 font-900"><ShieldAlert size={14} /> Suspended</p><p className="mt-1 text-xs text-red-500">{fmt(user.suspendedAt)}</p></div> : <p className="flex items-center gap-1 font-900 text-green-700"><CheckCircle2 size={14} /> Active</p>}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-500">{fmt(user.createdAt)}</td>
                    <td className="px-3 py-3 align-top text-right">
                      {user.role === "ADMIN" ? (
                        rootAdmin ? <span className="text-xs text-slate-400">Non-deletable</span> : <button disabled={savingId === user.id} onClick={() => deleteAdmin(user)} className="inline-flex max-w-full items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-[11px] font-900 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Delete</button>
                      ) : suspended ? (
                        <button disabled={savingId === user.id} onClick={() => updateUser(user, "reactivate")} className="inline-flex max-w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-900 text-navy-900 hover:bg-slate-50 disabled:opacity-50">Reactivate</button>
                      ) : (
                        <button disabled={savingId === user.id} onClick={() => updateUser(user, "suspend")} className="inline-flex max-w-full items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-[11px] font-900 text-red-700 hover:bg-red-50 disabled:opacity-50"><Ban size={13} /> Suspend</button>
                      )}
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
