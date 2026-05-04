"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Bell,
  CreditCard,
  Edit3,
  ExternalLink,
  FileUp,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  COUNTRIES,
  PHONE_CODES,
  PORTAL_ORDERS,
  PORTAL_RETURNS,
  RETURN_STAGES,
  canReturn,
  daysUntilReturnDeadline,
  formatDate,
  trackingUrl,
  type PortalOrder,
} from "@/lib/portal";

type Section = "orders" | "returns" | "tracking" | "support" | "account" | "addresses" | "payments" | "marketing";

type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
};

type SubmitState = { reference: string; message: string } | null;

type AddressDraft = Omit<Address, "id" | "isDefault">;

const NAV: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "orders", label: "Orders", icon: <Package size={15} /> },
  { id: "returns", label: "Returns", icon: <RotateCcw size={15} /> },
  { id: "tracking", label: "Tracking", icon: <MapPin size={15} /> },
  { id: "support", label: "Support", icon: <MessageSquare size={15} /> },
  { id: "account", label: "Account Settings", icon: <User size={15} /> },
  { id: "addresses", label: "Addresses", icon: <MapPin size={15} /> },
  { id: "payments", label: "Payment Methods", icon: <CreditCard size={15} /> },
  { id: "marketing", label: "Marketing Preferences", icon: <Bell size={15} /> },
];

const STATUS_STYLE: Record<string, string> = {
  PROCESSING: "text-blue-700 bg-blue-50 border-blue-100",
  DISPATCHED: "text-purple-700 bg-purple-50 border-purple-100",
  DELIVERED: "text-green-700 bg-green-50 border-green-100",
  CANCELLED: "text-red-700 bg-red-50 border-red-100",
};

const EMPTY_ADDRESS: AddressDraft = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
};

export default function PortalClient({ initialSection = "orders" }: { initialSection?: Section }) {
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>(initialSection);
  const [supportOrder, setSupportOrder] = useState<string>("");
  const [returnOrder, setReturnOrder] = useState<PortalOrder | null>(null);
  const [returnResult, setReturnResult] = useState<SubmitState>(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [accountNotice, setAccountNotice] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: "addr-1",
      label: "Main office",
      line1: "Unit 12, Industrial Estate",
      line2: "",
      city: "London",
      postcode: "E16 1AA",
      country: "United Kingdom",
      isDefault: true,
    },
  ]);
  const [savedCardPreview, setSavedCardPreview] = useState(false);

  const activeReturn = useMemo(
    () => PORTAL_RETURNS[0],
    []
  );

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <h2 className="font-display font-800 text-navy-950 text-2xl mb-2">Sign in to access your portal</h2>
        <p className="text-gray-500 mb-6 text-sm">View orders, track shipments, manage returns and support requests.</p>
        <div className="flex gap-3">
          <Link href="/auth/login" className="btn-primary">Sign In →</Link>
          <Link href="/auth/register" className="btn-secondary">Create Account</Link>
        </div>
      </div>
    );
  }

  function openSupportForOrder(orderId: string) {
    setSupportOrder(orderId);
    setSection("support");
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnOrder) return;
    setReturnLoading(true);
    setReturnResult(null);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, orderId: returnOrder.id, item: returnOrder.item, sku: returnOrder.sku, source: "customer-portal" }),
    });
    const result = await response.json();
    setReturnLoading(false);
    setReturnResult({ reference: result.reference || "RET-PREVIEW", message: result.message || "Return request logged." });
  }

  function startAddAddress() {
    setAddingAddress(true);
    setEditingAddressId(null);
    setAddressDraft(EMPTY_ADDRESS);
  }

  function startEditAddress(address: Address) {
    setEditingAddressId(address.id);
    setAddingAddress(true);
    setAddressDraft({ label: address.label, line1: address.line1, line2: address.line2, city: address.city, postcode: address.postcode, country: address.country });
  }

  function saveAddress() {
    if (!addressDraft.label || !addressDraft.line1 || !addressDraft.city || !addressDraft.postcode) return;
    if (editingAddressId) {
      setAddresses((items) => items.map((address) => (address.id === editingAddressId ? { ...address, ...addressDraft } : address)));
    } else if (addresses.length < 5) {
      setAddresses((items) => [...items, { ...addressDraft, id: `addr-${Date.now()}`, isDefault: items.length === 0 }]);
    }
    setAddingAddress(false);
    setEditingAddressId(null);
    setAddressDraft(EMPTY_ADDRESS);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">Customer Portal</p>
            <h1 className="font-display font-800 text-navy-950 text-2xl">Welcome back, {session.user?.name ?? "Combay customer"}</h1>
            <p className="text-gray-500 text-sm mt-1">Manage orders, returns, support tickets, addresses and account details.</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm transition-colors font-display font-600">
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-60 flex-shrink-0">
            <nav className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-display font-600 transition-all border-l-2 ${
                    section === item.id ? "bg-navy-950 text-white border-accent" : "text-gray-600 border-transparent hover:bg-surface hover:text-navy-950"
                  }`}
                >
                  <span className={section === item.id ? "text-accent" : ""}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {section === "orders" && <OrdersPanel onReturn={setReturnOrder} onSupport={openSupportForOrder} />}
            {section === "returns" && <ReturnsPanel onReturn={setReturnOrder} />}
            {section === "tracking" && <TrackingPanel />}
            {section === "support" && <SupportPanel orderId={supportOrder} onOrderChange={setSupportOrder} />}
            {section === "account" && (
              <AccountPanel
                accountType={accountType}
                onAccountTypeChange={setAccountType}
                emailVerificationSent={emailVerificationSent}
                onSendVerification={() => setEmailVerificationSent(true)}
                notice={accountNotice}
                onSave={(message) => setAccountNotice(message)}
                userEmail={session.user?.email || "test@combay.co.uk"}
                userName={session.user?.name || "Combay Test User"}
              />
            )}
            {section === "addresses" && (
              <AddressesPanel
                addresses={addresses}
                addingAddress={addingAddress}
                editingAddressId={editingAddressId}
                draft={addressDraft}
                onDraftChange={setAddressDraft}
                onAdd={startAddAddress}
                onEdit={startEditAddress}
                onCancel={() => { setAddingAddress(false); setEditingAddressId(null); setAddressDraft(EMPTY_ADDRESS); }}
                onSave={saveAddress}
                onDelete={(id) => setAddresses((items) => items.filter((address) => address.id !== id))}
                onSetDefault={(id) => setAddresses((items) => items.map((address) => ({ ...address, isDefault: address.id === id })))}
              />
            )}
            {section === "payments" && <PaymentsPanel savedCardPreview={savedCardPreview} onSavePreview={() => setSavedCardPreview(true)} />}
            {section === "marketing" && <MarketingPanel />}
          </div>
        </div>
      </div>

      {returnOrder && (
        <ReturnModal
          order={returnOrder}
          loading={returnLoading}
          result={returnResult}
          onClose={() => { setReturnOrder(null); setReturnResult(null); }}
          onSubmit={submitReturn}
        />
      )}
    </div>
  );
}

function OrdersPanel({ onReturn, onSupport }: { onReturn: (order: PortalOrder) => void; onSupport: (orderId: string) => void }) {
  return (
    <section>
      <SectionHeader title="Your Orders" subtitle="Track purchases, request support, and check return eligibility." />
      <div className="space-y-3">
        {PORTAL_ORDERS.map((order) => {
          const eligible = canReturn(order);
          return (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-display font-700 text-navy-950 text-sm">Order #{order.id}</p>
                  <p className="text-gray-400 text-xs">Placed {formatDate(order.date)} · {order.sku}</p>
                </div>
                <div className="text-right">
                  <span className={`badge border ${STATUS_STYLE[order.status] || "text-gray-700 bg-gray-50 border-gray-100"}`}>{order.status.replace(/_/g, " ")}</span>
                  <p className="font-display font-700 text-navy-950 text-sm mt-1">{order.total}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{order.item}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {order.tracking && (
                  <a href={trackingUrl(order)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-accent hover:text-accent-dark transition-colors">
                    {order.tracking} <ExternalLink size={10} />
                  </a>
                )}
                {eligible ? (
                  <button onClick={() => onReturn(order)} className="text-accent hover:text-accent-dark font-display font-600 transition-colors">Return item</button>
                ) : order.status === "DELIVERED" ? (
                  <span className="text-gray-400 font-display font-600">Return window expired</span>
                ) : (
                  <span className="text-gray-400 font-display font-600">Return available after delivery</span>
                )}
                <button onClick={() => onSupport(order.id)} className="text-gray-500 hover:text-navy-950 font-display font-600 transition-colors">Report a problem</button>
              </div>
              {eligible && <p className="text-[11px] text-gray-400 mt-3">{daysUntilReturnDeadline(order)} days left to request a return.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReturnsPanel({ onReturn }: { onReturn: (order: PortalOrder) => void }) {
  const eligibleOrders = PORTAL_ORDERS.filter(canReturn);
  const returnStageIndex = RETURN_STAGES.findIndex((stage) => stage.id === PORTAL_RETURNS[0]?.stage);

  return (
    <section>
      <SectionHeader title="Returns" subtitle="Returns are available within 30 days of confirmed delivery." />
      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        {eligibleOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">No orders are currently eligible for return.</div>
        ) : (
          eligibleOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="font-display font-700 text-sm text-navy-950">{order.item}</p>
              <p className="text-gray-400 text-xs mt-1">Order #{order.id} · {daysUntilReturnDeadline(order)} days left</p>
              <button onClick={() => onReturn(order)} className="btn-secondary text-xs py-1.5 px-3 mt-4">Return item</button>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="font-display font-700 text-sm text-navy-950 mb-1">Existing return: {PORTAL_RETURNS[0].id}</p>
        <p className="text-gray-500 text-sm mb-4">{PORTAL_RETURNS[0].statusText}</p>
        <div className="grid sm:grid-cols-5 gap-2">
          {RETURN_STAGES.map((stage, index) => (
            <div key={stage.id} className={`rounded-lg border p-3 ${index <= returnStageIndex ? "border-accent bg-accent/10" : "border-gray-200 bg-gray-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-800 mb-2 ${index <= returnStageIndex ? "bg-accent text-navy-950" : "bg-gray-200 text-gray-400"}`}>{index + 1}</div>
              <p className="text-xs font-display font-700 text-navy-950">{stage.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrackingPanel() {
  return (
    <section>
      <SectionHeader title="Tracking" subtitle="Carrier tracking links open directly with your tracking number." />
      <div className="space-y-3">
        {PORTAL_ORDERS.filter((order) => order.tracking).map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <p className="font-display font-700 text-sm text-navy-950">{order.item}</p>
                <p className="text-gray-400 text-xs">Order #{order.id} · {order.courier}</p>
              </div>
              <span className={`badge border ${STATUS_STYLE[order.status] || "text-gray-700 bg-gray-50 border-gray-100"}`}>{order.status.replace(/_/g, " ")}</span>
            </div>
            <a href={trackingUrl(order)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent font-mono text-xs px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors font-600">
              Track: {order.tracking} <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupportPanel({ orderId, onOrderChange }: { orderId: string; onOrderChange: (value: string) => void }) {
  const [sent, setSent] = useState<SubmitState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "customer-portal" }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to submit support ticket.");
      return;
    }

    setSent({ reference: result.reference, message: result.email?.message || "Support ticket logged." });
  }

  return (
    <section>
      <SectionHeader title="Support" subtitle="Send a message linked to an order, return or repair request." />
      {sent ? (
        <SuccessBox title="Ticket submitted" reference={sent.reference} message={sent.message} />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Subject">
              <select name="subject" required className="input">
                <option value="">Select...</option>
                <option value="Order query">Order query</option>
                <option value="Delivery issue">Delivery issue</option>
                <option value="Return / refund">Return / refund</option>
                <option value="Technical question">Technical question</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Related order">
              <select name="orderId" className="input" value={orderId} onChange={(event) => onOrderChange(event.target.value)}>
                <option value="">Optional</option>
                {PORTAL_ORDERS.map((order) => <option key={order.id} value={order.id}>#{order.id} — {order.sku}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name"><input name="name" required className="input" placeholder="Your full name" /></Field>
            <Field label="Email"><input name="email" required type="email" className="input" placeholder="you@company.com" /></Field>
          </div>
          <Field label="Message"><textarea name="message" required className="input min-h-[120px]" placeholder="Describe your issue in detail..." /></Field>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button disabled={loading} type="submit" className="btn-primary">{loading ? "Submitting..." : "Submit ticket →"}</button>
        </form>
      )}
    </section>
  );
}

function AccountPanel({
  accountType,
  onAccountTypeChange,
  emailVerificationSent,
  onSendVerification,
  notice,
  onSave,
  userEmail,
  userName,
}: {
  accountType: "individual" | "company";
  onAccountTypeChange: (type: "individual" | "company") => void;
  emailVerificationSent: boolean;
  onSendVerification: () => void;
  notice: string;
  onSave: (message: string) => void;
  userEmail: string;
  userName: string;
}) {
  return (
    <section>
      <SectionHeader title="Account Settings" subtitle="Update contact details, company profile and security settings." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="label">Account type</label>
          <div className="flex gap-2">
            <button onClick={() => onAccountTypeChange("individual")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border capitalize transition-colors ${accountType === "individual" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>Individual</button>
            <button onClick={() => onAccountTypeChange("company")} className={`font-display font-600 text-sm px-4 py-2 rounded-md border capitalize transition-colors ${accountType === "company" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>Company</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name"><input className="input" defaultValue={userName} /></Field>
          <Field label="Email address" hint="Changing email requires verification."><input className="input" type="email" defaultValue={userEmail} /></Field>
          <Field label="Phone number">
            <div className="flex">
              <select className="input rounded-r-none w-56 flex-shrink-0 border-r-0">
                {PHONE_CODES.map((item) => <option key={`${item.country}-${item.code}`} value={item.code}>{item.label}</option>)}
              </select>
              <input className="input rounded-l-none" type="tel" placeholder="7xxx xxxxxx" />
            </div>
          </Field>
          {accountType === "company" && <Field label="Company name"><input className="input" placeholder="Company Ltd" /></Field>}
          {accountType === "company" && <Field label="Company number"><input className="input" placeholder="12345678" /></Field>}
          {accountType === "company" && <Field label="VAT number"><input className="input" placeholder="GB123456789" /></Field>}
        </div>

        {accountType === "company" && (
          <div>
            <label className="label">Business documents</label>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all block">
              <FileUp size={22} className="mx-auto text-gray-400 mb-2" />
              <p className="font-display font-600 text-sm text-gray-600">Upload incorporation certificate or verification document</p>
              <p className="text-gray-400 text-xs mt-1">PDF/JPG/PNG — preview only until storage is connected</p>
              <input type="file" className="hidden" />
            </label>
          </div>
        )}

        <div className="border-t border-gray-100 pt-5 space-y-3">
          <p className="font-display font-700 text-sm text-navy-950">Security changes</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Verification code"><input className="input" placeholder="Enter code" disabled={!emailVerificationSent} /></Field>
            <Field label="Old password"><input className="input" type="password" placeholder="Required" /></Field>
            <Field label="New password"><input className="input" type="password" minLength={8} /></Field>
          </div>
          <button type="button" onClick={onSendVerification} className="btn-secondary text-sm">Send email verification code</button>
          {emailVerificationSent && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Preview mode: verification email is not sent until email transport is configured.</p>}
        </div>

        <button onClick={() => onSave("Account settings saved in preview state. Database persistence will be connected in the DB phase.")} className="btn-primary">Save changes →</button>
        {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{notice}</p>}
      </div>
    </section>
  );
}

function AddressesPanel({
  addresses,
  addingAddress,
  editingAddressId,
  draft,
  onDraftChange,
  onAdd,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onSetDefault,
}: {
  addresses: Address[];
  addingAddress: boolean;
  editingAddressId: string | null;
  draft: AddressDraft;
  onDraftChange: (draft: AddressDraft) => void;
  onAdd: () => void;
  onEdit: (address: Address) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <SectionHeader title="Addresses" subtitle="Store up to five delivery or billing addresses." compact />
        {addresses.length < 5 && <button onClick={onAdd} className="btn-primary text-sm py-2 flex items-center gap-1.5"><Plus size={14} /> Add address</button>}
      </div>
      {addresses.length >= 5 && <p className="text-sm text-gray-500 mb-3">Maximum 5 addresses reached.</p>}
      <div className="space-y-3">
        {addresses.map((address) => (
          <div key={address.id} className={`bg-white border rounded-xl p-5 ${address.isDefault ? "border-accent" : "border-gray-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-700 text-sm text-navy-950">{address.label}</span>
                  {address.isDefault && <span className="text-[10px] bg-accent text-navy-950 font-display font-700 px-2 py-0.5 rounded-full">DEFAULT</span>}
                </div>
                <p className="text-gray-600 text-sm">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                <p className="text-gray-600 text-sm">{address.city}, {address.postcode}</p>
                <p className="text-gray-400 text-xs">{address.country}</p>
              </div>
              <div className="flex gap-2 items-center">
                {!address.isDefault && <button onClick={() => onSetDefault(address.id)} className="text-xs text-accent hover:text-accent-dark font-display font-600">Set default</button>}
                <button onClick={() => onEdit(address)} className="text-gray-400 hover:text-navy-950"><Edit3 size={14} /></button>
                <button onClick={() => onDelete(address.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {addingAddress && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-700 text-navy-950 mb-2">{editingAddressId ? "Edit address" : "New address"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Label"><input className="input" value={draft.label} onChange={(event) => onDraftChange({ ...draft, label: event.target.value })} placeholder="Home / Office" /></Field>
            <Field label="Address line 1"><input className="input" value={draft.line1} onChange={(event) => onDraftChange({ ...draft, line1: event.target.value })} /></Field>
            <Field label="Address line 2"><input className="input" value={draft.line2} onChange={(event) => onDraftChange({ ...draft, line2: event.target.value })} /></Field>
            <Field label="City"><input className="input" value={draft.city} onChange={(event) => onDraftChange({ ...draft, city: event.target.value })} /></Field>
            <Field label="Postcode"><input className="input" value={draft.postcode} onChange={(event) => onDraftChange({ ...draft, postcode: event.target.value })} /></Field>
            <Field label="Country">
              <select className="input" value={draft.country} onChange={(event) => onDraftChange({ ...draft, country: event.target.value })}>
                {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onSave} className="btn-primary text-sm">{editingAddressId ? "Save address" : "Add address"}</button>
            <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

function PaymentsPanel({ savedCardPreview, onSavePreview }: { savedCardPreview: boolean; onSavePreview: () => void }) {
  return (
    <section>
      <SectionHeader title="Payment Methods" subtitle="Stripe-ready saved card structure for faster future checkouts." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Saved cards require Stripe setup. This screen is prepared for tokenised Stripe payment methods; no raw card data is stored by Combay.
        </div>
        {savedCardPreview ? (
          <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><CreditCard size={20} className="text-accent" /><div><p className="font-display font-700 text-sm text-navy-950">Visa ending 4242</p><p className="text-xs text-gray-400">Preview payment method · not stored in Stripe yet</p></div></div>
            <span className="badge bg-gray-50 text-gray-500 border-gray-200">Preview</span>
          </div>
        ) : (
          <button onClick={onSavePreview} className="btn-secondary">Add preview payment method</button>
        )}
      </div>
    </section>
  );
}

function MarketingPanel() {
  return (
    <section>
      <SectionHeader title="Marketing Preferences" subtitle="Control product alerts and category interest emails." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {[
          ["New stock notifications", "Email alerts when matching inventory is added."],
          ["Promotions and discounts", "Seasonal offers and discount codes."],
        ].map(([title, detail]) => (
          <label key={title} className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 accent-accent" />
            <div><p className="font-display font-600 text-sm text-navy-950">{title}</p><p className="text-gray-400 text-xs">{detail}</p></div>
          </label>
        ))}
        <div>
          <p className="font-display font-700 text-sm text-navy-950 mb-3">Categories of interest</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {["Lab & Scientific", "Automation & Control", "Test & Detection", "IT & Networking", "Display & AV", "Oil & Gas", "Audio & Broadcast", "Manufacturing"].map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-accent" /><span className="text-sm text-gray-600 font-display font-600">{cat}</span></label>
            ))}
          </div>
        </div>
        <button className="btn-primary">Save preferences →</button>
      </div>
    </section>
  );
}

function ReturnModal({ order, loading, result, onClose, onSubmit }: { order: PortalOrder; loading: boolean; result: SubmitState; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        {result ? (
          <SuccessBox title="Return request submitted" reference={result.reference} message={result.message} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">Order #{order.id}</p>
              <h3 className="font-display font-800 text-lg text-navy-950">Request return</h3>
              <p className="text-sm text-gray-500 mt-1">{order.item}</p>
            </div>
            <Field label="Reason"><select name="reason" required className="input"><option value="">Select...</option><option>Item not as described</option><option>Arrived damaged</option><option>Wrong item received</option><option>Changed mind</option><option>Other</option></select></Field>
            <Field label="Additional details"><textarea name="message" required className="input min-h-[100px]" placeholder="Please describe the issue and upload photos if requested by our team." /></Field>
            <div className="bg-surface border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">Returns are assessed after inspection. Approved refunds are processed after the item is received in the same condition.</div>
            <button disabled={loading} type="submit" className="btn-primary w-full">{loading ? "Submitting..." : "Submit return request"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return <div className={compact ? "" : "mb-5"}><h2 className="font-display font-700 text-navy-950 text-lg">{title}</h2><p className="text-gray-500 text-sm mt-1">{subtitle}</p></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><label className="label">{label}</label>{hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}{children}</div>;
}

function SuccessBox({ title, reference, message }: { title: string; reference: string; message: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <div className="text-3xl mb-2">✓</div>
      <h3 className="font-display font-700 text-green-800 text-lg mb-1">{title}</h3>
      <p className="text-green-700 text-sm mb-2">Reference: <span className="font-mono font-700">{reference}</span></p>
      <p className="text-green-700 text-xs">{message}</p>
    </div>
  );
}
