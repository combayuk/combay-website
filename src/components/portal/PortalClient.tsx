"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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

type PortalReturnRow = {
  id: string;
  reference: string;
  orderId: string;
  item: string;
  sku?: string;
  reason: string;
  status: string;
  statusLabel?: string;
  notes?: string;
  returnLabelUrl?: string;
  returnLabelName?: string;
  returnCourier?: string;
  returnTrackingNumber?: string;
  returnTrackingUrl?: string;
  refundProofUrl?: string;
  refundProofName?: string;
  createdAt: string;
  updatedAt: string;
};


type PortalSupportMessage = {
  id: string;
  authorType: "ADMIN" | "CUSTOMER" | "SYSTEM";
  authorName?: string;
  message: string;
  isCustomerVisible: boolean;
  createdAt: string;
};

type PortalSupportTicket = {
  id: string;
  subject: string;
  status: string;
  orderId?: string;
  productSku?: string;
  productTitle?: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: PortalSupportMessage[];
};

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
  PAYMENT_RECEIVED: "text-blue-700 bg-blue-50 border-blue-100",
  PENDING_PAYMENT: "text-yellow-700 bg-yellow-50 border-yellow-100",
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
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [savedCardPreview, setSavedCardPreview] = useState(false);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [portalReturns, setPortalReturns] = useState<PortalReturnRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("section") as Section | null;
    if (requested && NAV.some((item) => item.id === requested)) setSection(requested);
  }, []);

  useEffect(() => {
    if (!session) return;
    setOrdersLoading(true);
    Promise.all([
      fetch("/api/orders?portal=1", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/returns?portal=1", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ portalReturns: [] })),
    ])
      .then(([ordersData, returnsData]) => {
        const portalOrders = Array.isArray(ordersData.portalOrders) ? ordersData.portalOrders : [];
        const returnRows = Array.isArray(returnsData.portalReturns) ? returnsData.portalReturns : Array.isArray(returnsData.returns) ? returnsData.returns : [];
        setOrders(portalOrders.length ? portalOrders : []);
        setPortalReturns(returnRows);
      })
      .catch(() => { setOrders([]); setPortalReturns([]); })
      .finally(() => setOrdersLoading(false));
  }, [session]);

  function normaliseAddress(row: any): Address {
    return {
      id: String(row.id),
      label: String(row.label || ""),
      line1: String(row.address1 || row.line1 || ""),
      line2: String(row.address2 || row.line2 || ""),
      city: String(row.city || ""),
      postcode: String(row.postcode || ""),
      country: String(row.country || "United Kingdom"),
      isDefault: Boolean(row.isPrimary ?? row.isDefault),
    };
  }

  async function loadAddresses() {
    if (!session) return;
    setAddressesLoading(true);
    setAddressError(null);
    try {
      const response = await fetch("/api/account/addresses", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load addresses.");
      setAddresses(Array.isArray(data.addresses) ? data.addresses.map(normaliseAddress) : []);
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Could not load addresses.");
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }

  useEffect(() => { loadAddresses(); }, [session]);

  const portalOrders = orders;

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <h2 className="font-display font-800 text-navy-950 text-2xl mb-2">Sign in to access your portal</h2>
        <p className="text-gray-500 mb-6 text-sm">View orders, track shipments, manage returns and support requests.</p>
        <div className="flex gap-3">
          <Link href="/portal/login" className="btn-primary">Customer Sign In →</Link>
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
    fetch("/api/returns?portal=1", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setPortalReturns(Array.isArray(data.portalReturns) ? data.portalReturns : Array.isArray(data.returns) ? data.returns : []))
      .catch(() => undefined);
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

  async function saveAddress() {
    if (!addressDraft.line1 || !addressDraft.city || !addressDraft.postcode) {
      setAddressError("Address line 1, town/city and postcode are required.");
      return;
    }
    setAddressError(null);
    setAddressNotice(null);
    const payload = {
      id: editingAddressId,
      label: addressDraft.label,
      address1: addressDraft.line1,
      address2: addressDraft.line2,
      city: addressDraft.city,
      postcode: addressDraft.postcode,
      country: addressDraft.country,
    };
    const response = await fetch("/api/account/addresses", {
      method: editingAddressId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setAddressError(data.error || "Could not save address.");
      return;
    }
    setAddingAddress(false);
    setEditingAddressId(null);
    setAddressDraft(EMPTY_ADDRESS);
    setAddressNotice(editingAddressId ? "Address updated." : "Address added.");
    await loadAddresses();
  }

  async function deleteAddress(id: string) {
    if (!confirm("Delete this address?")) return;
    setAddressError(null);
    const response = await fetch(`/api/account/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setAddressError(data.error || "Could not delete address.");
      return;
    }
    setAddressNotice("Address deleted.");
    await loadAddresses();
  }

  async function setPrimaryAddress(id: string) {
    setAddressError(null);
    const response = await fetch("/api/account/addresses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, setPrimaryOnly: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setAddressError(data.error || "Could not set primary address.");
      return;
    }
    setAddressNotice("Primary address updated.");
    await loadAddresses();
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
            {section === "orders" && <OrdersPanel orders={portalOrders} returns={portalReturns} loading={ordersLoading} onReturn={setReturnOrder} onSupport={openSupportForOrder} />}
            {section === "returns" && <ReturnsPanel orders={portalOrders} returns={portalReturns} onReturn={setReturnOrder} />}
            {section === "tracking" && <TrackingPanel orders={portalOrders} loading={ordersLoading} />}
            {section === "support" && <SupportPanel orders={portalOrders} orderId={supportOrder} onOrderChange={setSupportOrder} />}
            {section === "account" && (
              <AccountPanel
                accountType={accountType}
                onAccountTypeChange={setAccountType}
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
                onDelete={deleteAddress}
                onSetDefault={setPrimaryAddress}
                loading={addressesLoading}
                notice={addressNotice}
                error={addressError}
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

function OrdersPanel({ orders, returns, loading, onReturn, onSupport }: { orders: PortalOrder[]; returns: PortalReturnRow[]; loading: boolean; onReturn: (order: PortalOrder) => void; onSupport: (orderId: string) => void }) {
  return (
    <section>
      <SectionHeader title="Your Orders" subtitle="Track purchases, request support, and check return eligibility." />
      <div className="space-y-3">
        {loading && <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">Loading orders…</div>}
        {!loading && orders.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">No orders found yet.</div>}
        {!loading && orders.map((order) => {
          const returnRecord = returns.find((item) => item.orderId === order.id);
          const pendingReturn = returnRecord && ["AWAITING_APPROVAL", "REQUESTED"].includes(returnRecord.status);
          const approvedReturn = returnRecord && !["AWAITING_APPROVAL", "REQUESTED", "REJECTED"].includes(returnRecord.status);
          const rejectedReturn = returnRecord && returnRecord.status === "REJECTED";
          const eligible = canReturn(order) && !pendingReturn && !approvedReturn;
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
                {order.tracking ? (
                  <a href={trackingUrl(order)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-accent hover:text-accent-dark transition-colors">
                    {order.tracking} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className="text-gray-400 font-display font-600">Tracking not uploaded yet</span>
                )}
                {pendingReturn ? (
                  <span className="text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 font-display font-600">Return awaiting approval</span>
                ) : approvedReturn ? (
                  <span className="text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1 font-display font-600">Return: {returnRecord?.statusLabel || returnRecord?.status?.replace(/_/g, " ")}</span>
                ) : rejectedReturn ? (
                  <span className="text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1 font-display font-600">Return rejected</span>
                ) : eligible ? (
                  <button onClick={() => onReturn(order)} className="text-accent hover:text-accent-dark font-display font-600 transition-colors">Request return approval</button>
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

function ReturnsPanel({ orders, returns, onReturn }: { orders: PortalOrder[]; returns: PortalReturnRow[]; onReturn: (order: PortalOrder) => void }) {
  const ordersWithReturnRecords = new Set(returns.map((item) => item.orderId));
  const eligibleOrders = orders.filter((order) => canReturn(order) && !ordersWithReturnRecords.has(order.id));
  const awaiting = returns.filter((item) => ["AWAITING_APPROVAL", "REQUESTED"].includes(item.status));
  const active = returns.filter((item) => !["AWAITING_APPROVAL", "REQUESTED", "REJECTED"].includes(item.status));
  const rejected = returns.filter((item) => item.status === "REJECTED");

  function stageIndex(status: string) {
    const map: Record<string, string> = { APPROVED: "REQUEST_SUBMITTED", COLLECTION_BOOKED: "COLLECTION_BOOKED", IN_TRANSIT: "IN_TRANSIT", INSPECTING: "INSPECTING", REFUND_APPROVED: "REFUND_APPROVED", RECEIVED: "INSPECTING", REFUNDED: "REFUND_APPROVED" };
    return RETURN_STAGES.findIndex((stage) => stage.id === map[status]);
  }

  return (
    <section>
      <SectionHeader title="Returns" subtitle="Returns are available within 30 days of confirmed delivery. Submitted requests must be approved by admin before the return status flow begins." />

      {awaiting.length > 0 && (
        <div className="mb-5">
          <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Awaiting approval</h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {awaiting.map((pending) => (
              <div key={pending.id} className="bg-white border border-amber-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-display font-700 text-sm text-navy-950">{pending.item}</p>
                    <p className="text-gray-400 text-xs mt-1">Order #{pending.orderId} · Requested {formatDate(pending.createdAt)}</p>
                  </div>
                  <span className="badge text-amber-700 bg-amber-50 border-amber-200">Awaiting approval</span>
                </div>
                <p className="text-sm text-gray-600">Your return request is awaiting admin review.</p>
                <p className="text-[11px] text-gray-400 mt-3">Once admin approves this return, the return status flow will start.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="mb-5">
          <h3 className="font-display font-700 text-sm text-navy-950 mb-2">Rejected returns</h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {rejected.map((item) => (
              <div key={item.id} className="bg-white border border-red-200 rounded-xl p-5">
                <p className="font-display font-700 text-sm text-navy-950">{item.item}</p>
                <p className="text-gray-400 text-xs mt-1">Order #{item.orderId} · {item.reference}</p>
                <span className="badge text-red-700 bg-red-50 border-red-200 mt-3">Rejected</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        {eligibleOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">No additional orders are currently eligible for a new return request.</div>
        ) : (
          eligibleOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="font-display font-700 text-sm text-navy-950">{order.item}</p>
              <p className="text-gray-400 text-xs mt-1">Order #{order.id} · {daysUntilReturnDeadline(order)} days left</p>
              <button onClick={() => onReturn(order)} className="btn-secondary text-xs py-1.5 px-3 mt-4">Request return approval</button>
            </div>
          ))
        )}
      </div>

      {active.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">No approved/in-progress returns yet.</div>
      ) : active.map((item) => {
        const idx = stageIndex(item.status);
        return (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <p className="font-display font-700 text-sm text-navy-950 mb-1">Return {item.reference}</p>
            <p className="text-gray-500 text-sm mb-1">Order #{item.orderId} · {item.item}</p>
            <p className="text-gray-400 text-xs mb-4">Current status: {item.statusLabel || item.status.replace(/_/g, " ")}</p>
            <div className="grid sm:grid-cols-5 gap-2">
              {RETURN_STAGES.map((stage, index) => (
                <div key={stage.id} className={`rounded-lg border p-3 ${index <= idx ? "border-accent bg-accent/10" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-800 mb-2 ${index <= idx ? "bg-accent text-navy-950" : "bg-gray-200 text-gray-400"}`}>{index + 1}</div>
                  <p className="text-xs font-display font-700 text-navy-950">{stage.label}</p>
                  <ReturnStageAction item={item} stageId={stage.id} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}


function ReturnStageAction({ item, stageId }: { item: PortalReturnRow; stageId: string }) {
  if (stageId === "COLLECTION_BOOKED" && item.returnLabelUrl) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
        <a href={item.returnLabelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent font-display font-700 hover:text-accent-dark">
          Download return label <ExternalLink size={10} />
        </a>
        {item.returnLabelName && <span className="block text-gray-400 mt-0.5">{item.returnLabelName}</span>}
      </p>
    );
  }

  if (stageId === "IN_TRANSIT" && (item.returnTrackingNumber || item.returnTrackingUrl)) {
    const trackingHref = item.returnTrackingUrl || (item.returnTrackingNumber ? `https://www.google.com/search?q=${encodeURIComponent(`${item.returnCourier || "courier"} ${item.returnTrackingNumber}`)}` : "");
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
        {trackingHref ? (
          <a href={trackingHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent font-display font-700 hover:text-accent-dark">
            Track: {item.returnTrackingNumber || "shipment"} <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-gray-500">Tracking pending</span>
        )}
        {item.returnCourier && <span className="block text-gray-400 mt-0.5">Courier: {item.returnCourier}</span>}
      </p>
    );
  }

  if (stageId === "REFUND_APPROVED" && item.refundProofUrl) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
        <a href={item.refundProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent font-display font-700 hover:text-accent-dark">
          View payment confirmation <ExternalLink size={10} />
        </a>
        {item.refundProofName && <span className="block text-gray-400 mt-0.5">{item.refundProofName}</span>}
      </p>
    );
  }

  return null;
}

function TrackingPanel({ orders, loading }: { orders: PortalOrder[]; loading: boolean }) {
  const trackedOrders = orders.filter((order) => order.tracking);
  return (
    <section>
      <SectionHeader title="Tracking" subtitle="Tracking details appear here once admin adds a courier and tracking number to the order." />
      <div className="space-y-3">
        {loading && <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">Loading tracking details…</div>}
        {!loading && trackedOrders.length === 0 && <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500 text-sm">No tracking has been uploaded yet.</div>}
        {!loading && trackedOrders.map((order) => (
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

function SupportPanel({ orders, orderId, onOrderChange }: { orders: PortalOrder[]; orderId: string; onOrderChange: (value: string) => void }) {
  const { data: session } = useSession();
  const [sent, setSent] = useState<SubmitState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState<PortalSupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  function loadTickets() {
    const email = session?.user?.email || "";
    if (!email) return;
    setTicketsLoading(true);
    fetch(`/api/support?portal=1&email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setTickets(Array.isArray(data.tickets) ? data.tickets : Array.isArray(data.data) ? data.data : []))
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false));
  }

  useEffect(() => { loadTickets(); }, [session?.user?.email]);

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

    setSent({ reference: result.reference, message: result.email?.customer?.sent ? "Support ticket logged. A confirmation email has been sent." : "Support ticket logged." });
    loadTickets();
  }

  return (
    <section>
      <SectionHeader title="Support" subtitle="Send a message linked to an order, return or repair request and view ticket updates." />
      {sent ? (
        <div className="mb-5">
          <SuccessBox title="Ticket submitted" reference={sent.reference} message={sent.message} />
          <button type="button" onClick={() => setSent(null)} className="btn-secondary text-sm mt-3">Open another ticket</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-6">
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
                {orders.map((order) => <option key={order.id} value={order.id}>#{order.id} — {order.sku}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Name"><input name="name" required className="input" placeholder="Your full name" defaultValue={session?.user?.name || ""} /></Field>
            <Field label="Email"><input name="email" required type="email" className="input" placeholder="you@company.com" defaultValue={session?.user?.email || ""} /></Field>
            <Field label="Country"><select name="country" required className="input">{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select></Field>
          </div>
          <Field label="Message"><textarea name="message" required className="input min-h-[120px]" placeholder="Describe your issue in detail..." /></Field>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button disabled={loading} type="submit" className="btn-primary">{loading ? "Submitting..." : "Submit ticket →"}</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-800 text-lg text-navy-950">Your support tickets</h3>
            <p className="text-sm text-gray-500">Customer-visible replies from Combay appear here.</p>
          </div>
          <button type="button" onClick={loadTickets} className="btn-secondary text-sm py-2">Refresh</button>
        </div>
        {ticketsLoading ? <p className="text-sm text-gray-500">Loading tickets…</p> : tickets.length === 0 ? <p className="text-sm text-gray-500">No support tickets found.</p> : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-display font-800 text-sm text-navy-950">{ticket.subject}</p>
                    <p className="text-xs text-gray-400">{ticket.id}{ticket.orderId ? ` · Order ${ticket.orderId}` : ""}</p>
                  </div>
                  <span className="badge bg-gray-50 text-gray-700 border-gray-200">{ticket.status.replace(/_/g, " ")}</span>
                </div>
                <div className="space-y-2">
                  {(ticket.messages || []).filter((item) => item.isCustomerVisible !== false).map((item) => (
                    <div key={item.id} className={`rounded-lg border px-3 py-2 ${item.authorType === "ADMIN" ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="text-[11px] font-display font-800 text-navy-950">{item.authorType === "ADMIN" ? "Combay" : item.authorName || "You"}</span>
                        <span className="text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString("en-GB")}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AccountPanel({
  accountType,
  onAccountTypeChange,
  notice,
  onSave,
  userEmail,
  userName,
}: {
  accountType: "individual" | "company";
  onAccountTypeChange: (type: "individual" | "company") => void;
  notice: string;
  onSave: (message: string) => void;
  userEmail: string;
  userName: string;
}) {
  const [form, setForm] = useState({
    name: userName,
    email: userEmail,
    phoneCode: "+44",
    phone: "",
    company: "",
    companyEmail: "",
    designation: "",
    companyNumber: "",
    vatNumber: "",
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
    twoStepEnabled: false,
    twoStepMethod: "email" as "email" | "phone",
  });
  const [baseline, setBaseline] = useState(form);
  const [editable, setEditable] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const next = { ...form, name: userName, email: userEmail };
    setForm(next);
    setBaseline(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, userName]);

  function enable(field: string) {
    setEditable((current) => ({ ...current, [field]: true }));
  }

  function cancelField(field: string) {
    setEditable((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setForm((current) => ({
      ...current,
      ...(field === "phone" ? { phone: baseline.phone, phoneCode: baseline.phoneCode } : {}),
      ...(field === "password" ? { newPassword: "", confirmPassword: "" } : {}),
      ...(field === "twoStep" ? { twoStepEnabled: baseline.twoStepEnabled, twoStepMethod: baseline.twoStepMethod } : {}),
      ...((field in baseline && field !== "password" && field !== "phone" && field !== "twoStep") ? { [field]: (baseline as any)[field] } : {}),
    }));
    setError("");
    setPasswordError(false);
  }

  function cancelAllChanges() {
    setForm({ ...baseline, currentPassword: "", newPassword: "", confirmPassword: "" });
    setEditable({});
    setError("");
    setPasswordError(false);
  }

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value as never }));
    setError("");
    setPasswordError(false);
  }

  const changedFields = useMemo(() => {
    const fields: string[] = [];
    (["name", "email", "phoneCode", "phone", "company", "companyEmail", "designation", "companyNumber", "vatNumber", "newPassword", "twoStepEnabled", "twoStepMethod"] as const).forEach((field) => {
      if (String(form[field] ?? "") !== String(baseline[field] ?? "")) fields.push(field);
    });
    return fields;
  }, [form, baseline]);

  const editedFields = Object.keys(editable).filter((key) => editable[key]);
  const fieldsToSave = Array.from(new Set([...changedFields, ...editedFields]));
  const hasChanges = fieldsToSave.length > 0;

  async function submitAccountSettings() {
    setError("");
    setPasswordError(false);

    if (!form.name.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim()) { setError("Email address is required."); return; }
    if (!form.phone.trim()) { setError("Phone number is required."); return; }
    if (accountType === "company" && !form.company.trim()) { setError("Company name is required for company accounts."); return; }
    if (accountType === "company" && !form.companyEmail.trim()) { setError("Company email is required for company accounts."); return; }
    if (form.newPassword && form.newPassword !== form.confirmPassword) { setError("New password and confirmation password do not match."); return; }
    if (hasChanges && !form.currentPassword) { setPasswordError(true); setError("Enter your current password to save account changes."); return; }

    setSaving(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          name: form.name,
          email: form.email,
          phoneCode: form.phoneCode,
          phone: form.phone,
          company: accountType === "company" ? form.company : "",
          companyEmail: accountType === "company" ? form.companyEmail : "",
          designation: accountType === "company" ? form.designation : "",
          companyNumber: accountType === "company" ? form.companyNumber : "",
          vatNumber: accountType === "company" ? form.vatNumber : "",
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          twoStepEnabled: form.twoStepEnabled,
          twoStepMethod: form.twoStepMethod,
          changedFields: fieldsToSave,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Account settings could not be saved.");
      onSave(data.message || "Account settings saved.");
      const next = { ...form, currentPassword: "", newPassword: "", confirmPassword: "" };
      setForm(next);
      setBaseline(next);
      setEditable({});
    } catch (err) {
      setPasswordError(true);
      setError(err instanceof Error ? err.message : "Account settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <SectionHeader title="Account Settings" subtitle="Details are locked by default. Click the edit icon beside any field you want to change." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="label">Account type</label>
          <div className="flex gap-2">
            <button onClick={() => { onAccountTypeChange("individual"); enable("accountType"); }} className={`font-display font-600 text-sm px-4 py-2 rounded-md border capitalize transition-colors ${accountType === "individual" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>Individual</button>
            <button onClick={() => { onAccountTypeChange("company"); enable("accountType"); }} className={`font-display font-600 text-sm px-4 py-2 rounded-md border capitalize transition-colors ${accountType === "company" ? "bg-navy-950 text-white border-navy-950" : "border-gray-200 text-gray-600 hover:border-navy-950"}`}>Company</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <EditableInput label="Full name" required value={form.name} editable={!!editable.name} onEdit={() => enable("name")} onCancel={() => cancelField("name")} onChange={(value) => updateField("name", value)} />
          <EditableInput label="Email address" required type="email" value={form.email} editable={!!editable.email} onEdit={() => enable("email")} onCancel={() => cancelField("email")} onChange={(value) => updateField("email", value)} />
          <div>
            <label className="label">Phone number *</label>
            <div className="flex">
              <select disabled={!editable.phone} className={`input rounded-r-none w-56 flex-shrink-0 border-r-0 ${!editable.phone ? "bg-gray-100 text-gray-500" : "bg-white"}`} value={form.phoneCode} onChange={(event) => updateField("phoneCode", event.target.value)}>
                {PHONE_CODES.map((item) => <option key={`${item.country}-${item.code}`} value={item.code}>{item.label}</option>)}
              </select>
              <div className="relative flex-1">
                <input disabled={!editable.phone} required className={`input rounded-l-none pr-10 ${!editable.phone ? "bg-gray-100 text-gray-500" : "bg-white"}`} type="tel" placeholder="7xxx xxxxxx" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                <button type="button" onClick={() => editable.phone ? cancelField("phone") : enable("phone")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-950">{editable.phone ? <X size={14} /> : <Edit3 size={14} />}</button>
              </div>
            </div>
          </div>
          {accountType === "company" && <EditableInput label="Company name" required value={form.company} editable={!!editable.company} onEdit={() => enable("company")} onCancel={() => cancelField("company")} onChange={(value) => updateField("company", value)} />}
          {accountType === "company" && <EditableInput label="Company email" required type="email" value={form.companyEmail} editable={!!editable.companyEmail} onEdit={() => enable("companyEmail")} onCancel={() => cancelField("companyEmail")} onChange={(value) => updateField("companyEmail", value)} />}
          {accountType === "company" && <EditableInput label="Designation" value={form.designation} editable={!!editable.designation} onEdit={() => enable("designation")} onCancel={() => cancelField("designation")} onChange={(value) => updateField("designation", value)} />}
          {accountType === "company" && <EditableInput label="Company number" value={form.companyNumber} editable={!!editable.companyNumber} onEdit={() => enable("companyNumber")} onCancel={() => cancelField("companyNumber")} onChange={(value) => updateField("companyNumber", value)} />}
          {accountType === "company" && <EditableInput label="VAT number" value={form.vatNumber} editable={!!editable.vatNumber} onEdit={() => enable("vatNumber")} onCancel={() => cancelField("vatNumber")} onChange={(value) => updateField("vatNumber", value)} />}
        </div>

        {accountType === "company" && (
          <div>
            <label className="label">Business documents</label>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all block">
              <FileUp size={22} className="mx-auto text-gray-400 mb-2" />
              <p className="font-display font-600 text-sm text-gray-600">Upload incorporation certificate or verification document</p>
              <p className="text-gray-400 text-xs mt-1">PDF/JPG/PNG — document review workflow will be connected in the compliance phase</p>
              <input type="file" className="hidden" />
            </label>
          </div>
        )}

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div>
            <p className="font-display font-700 text-sm text-navy-950">Password</p>
            <p className="text-xs text-gray-500 mt-1">Password is hidden. Click edit to set a new password.</p>
          </div>
          {!editable.password ? (
            <div className="relative max-w-md"><input disabled className="input bg-gray-100 text-gray-500 pr-10" type="password" value="********" readOnly /><button type="button" onClick={() => enable("password")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-950"><Edit3 size={14} /></button></div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="New password"><input className="input" type="password" minLength={8} value={form.newPassword} onChange={(event) => updateField("newPassword", event.target.value)} placeholder="Enter new password" autoComplete="new-password" /></Field>
                <Field label="Confirm new password"><input className="input" type="password" minLength={8} value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Repeat new password" autoComplete="new-password" /></Field>
              </div>
              <button type="button" onClick={() => cancelField("password")} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"><X size={13} /> Cancel password change</button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-700 text-sm text-navy-950">Two-step verification</p>
              <p className="text-xs text-gray-500 mt-1">Add an extra verification step by email or phone. This stores your preference; enforcement will be enabled in the real-auth security phase.</p>
            </div>
            <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm font-display font-600 text-gray-600"><input type="checkbox" checked={form.twoStepEnabled} onChange={(event) => { enable("twoStep"); updateField("twoStepEnabled", event.target.checked); }} className="w-4 h-4 accent-accent" /> Enable</label>{editable.twoStep && <button type="button" onClick={() => cancelField("twoStep")} className="text-gray-400 hover:text-red-600"><X size={14} /></button>}</div>
          </div>
          {form.twoStepEnabled && (
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
              <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"><input type="radio" name="twoStepMethod" checked={form.twoStepMethod === "email"} onChange={() => { enable("twoStep"); updateField("twoStepMethod", "email"); }} /> Email code</label>
              <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"><input type="radio" name="twoStepMethod" checked={form.twoStepMethod === "phone"} onChange={() => { enable("twoStep"); updateField("twoStepMethod", "phone"); }} /> Phone/SMS code</label>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="border-t border-gray-100 pt-5">
            <Field label="Enter current password to save changes">
              <input className={`input max-w-md ${passwordError ? "border-red-500 ring-1 ring-red-200" : ""}`} type="password" value={form.currentPassword} onChange={(event) => updateField("currentPassword", event.target.value)} autoComplete="current-password" />
            </Field>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{notice}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={saving || !hasChanges} onClick={submitAccountSettings} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save account settings →"}</button>
          {hasChanges && <button type="button" onClick={cancelAllChanges} className="btn-secondary inline-flex items-center gap-1"><X size={14} /> Cancel changes</button>}
        </div>
      </div>
    </section>
  );
}

function EditableInput({ label, value, editable, onEdit, onCancel, onChange, type = "text", required = false }: { label: string; value: string; editable: boolean; onEdit: () => void; onCancel?: () => void; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}{required ? " *" : ""}</label>
      <div className="relative">
        <input disabled={!editable} required={required} type={type} className={`input pr-10 ${!editable ? "bg-gray-100 text-gray-500" : "bg-white"}`} value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" onClick={editable && onCancel ? onCancel : onEdit} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-950">{editable && onCancel ? <X size={14} /> : <Edit3 size={14} />}</button>
      </div>
    </div>
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
  loading,
  notice,
  error,
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
  loading?: boolean;
  notice?: string | null;
  error?: string | null;
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
                  {address.isDefault && <span className="text-[10px] bg-accent text-navy-950 font-display font-700 px-2 py-0.5 rounded-full">PRIMARY</span>}
                </div>
                <p className="text-gray-600 text-sm">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                <p className="text-gray-600 text-sm">{address.city}, {address.postcode}</p>
                <p className="text-gray-400 text-xs">{address.country}</p>
              </div>
              <div className="flex gap-2 items-center">
                {!address.isDefault && <button onClick={() => onSetDefault(address.id)} className="text-xs text-accent hover:text-accent-dark font-display font-600">Set primary</button>}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [methods, setMethods] = useState<Array<{ id: string; brand: string; last4: string; expMonth?: number; expYear?: number }>>([]);

  function loadMethods() {
    fetch("/api/payment-methods", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setMethods(Array.isArray(data.methods) ? data.methods : []))
      .catch(() => setMethods([]));
  }

  useEffect(() => { loadMethods(); }, []);

  async function addPaymentMethod() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payment-methods/setup", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "Unable to start Stripe card setup.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Stripe card setup.");
      setLoading(false);
    }
  }

  return (
    <section>
      <SectionHeader title="Payment Methods" subtitle="Add saved cards securely through Stripe. Combay never stores raw card numbers." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Cards are stored tokenised by Stripe and can be used for faster future checkouts once saved-card charging is enabled.
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {methods.length > 0 ? (
          <div className="space-y-3">
            {methods.map((method) => (
              <div key={method.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-accent" />
                  <div>
                    <p className="font-display font-700 text-sm text-navy-950 capitalize">{method.brand} ending {method.last4}</p>
                    <p className="text-xs text-gray-400">Expires {method.expMonth}/{method.expYear}</p>
                  </div>
                </div>
                <span className="badge bg-green-50 text-green-700 border-green-200">Stripe</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No saved cards yet.</p>
        )}
        <button onClick={addPaymentMethod} disabled={loading} className="btn-primary">{loading ? "Opening Stripe..." : "Add card securely with Stripe →"}</button>
      </div>
    </section>
  );
}

function MarketingPanel() {
  const [prefs, setPrefs] = useState({
    newStockEmails: true,
    promotionEmails: true,
    monthlyEmails: true,
    seasonalEmails: true,
    orderFollowupEmails: true,
    allMarketingEmails: true,
    categories: [] as string[],
  });
  const [categories, setCategories] = useState<string[]>(["Lab & Scientific", "Automation & Control", "Test & Detection", "IT & Networking", "Display & AV", "Oil & Gas", "Audio & Broadcast", "Manufacturing"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/account/marketing-preferences", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Could not load marketing preferences.");
        if (data.prefs) setPrefs((current) => ({ ...current, ...data.prefs, categories: Array.isArray(data.prefs.categories) ? data.prefs.categories : [] }));
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load marketing preferences."))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof typeof prefs, value: boolean | string[]) {
    setPrefs((current) => ({ ...current, [key]: value }));
    setNotice("");
    setError("");
  }

  function toggleCategory(category: string) {
    const next = prefs.categories.includes(category) ? prefs.categories.filter((item) => item !== category) : [...prefs.categories, category];
    update("categories", next);
  }

  async function savePreferences() {
    setSaving(true);
    setNotice("");
    setError("");
    const response = await fetch("/api/account/marketing-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !data.ok) { setError(data.error || "Marketing preferences could not be saved."); return; }
    if (data.prefs) setPrefs((current) => ({ ...current, ...data.prefs, categories: Array.isArray(data.prefs.categories) ? data.prefs.categories : current.categories }));
    setNotice(data.message || "Marketing preferences saved.");
  }

  return (
    <section>
      <SectionHeader title="Marketing Preferences" subtitle="Control product alerts, campaign emails and category interest emails." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {loading ? <p className="text-sm text-gray-500">Loading preferences...</p> : null}
        <label className="flex items-start gap-3 cursor-pointer border border-gray-200 rounded-xl p-4 bg-gray-50">
          <input type="checkbox" checked={prefs.allMarketingEmails} onChange={(event) => update("allMarketingEmails", event.target.checked)} className="mt-0.5 w-4 h-4 accent-accent" />
          <div><p className="font-display font-700 text-sm text-navy-950">Allow marketing emails</p><p className="text-gray-500 text-xs">Turn this off to stop all promotional, seasonal, monthly and stock-interest marketing emails.</p></div>
        </label>
        <div className={!prefs.allMarketingEmails ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
          {[
            ["newStockEmails", "New stock notifications", "Email alerts when matching inventory is added."],
            ["promotionEmails", "Promotions and discounts", "Discount codes and selected offer messages."],
            ["monthlyEmails", "Monthly updates", "First-Tuesday monthly stock and sourcing updates."],
            ["seasonalEmails", "Seasonal campaigns", "New Year, summer, Easter, Christmas and Boxing Day emails."],
            ["orderFollowupEmails", "Order follow-up emails", "Useful post-order follow-ups separate from mandatory order confirmations."],
          ].map(([key, title, detail]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={Boolean((prefs as any)[key])} onChange={(event) => update(key as keyof typeof prefs, event.target.checked)} className="mt-0.5 w-4 h-4 accent-accent" />
              <div><p className="font-display font-600 text-sm text-navy-950">{title}</p><p className="text-gray-400 text-xs">{detail}</p></div>
            </label>
          ))}
          <div>
            <p className="font-display font-700 text-sm text-navy-950 mb-3">Categories of interest</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer"><input checked={prefs.categories.includes(cat)} onChange={() => toggleCategory(cat)} type="checkbox" className="w-4 h-4 accent-accent" /><span className="text-sm text-gray-600 font-display font-600">{cat}</span></label>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{notice}</p>}
        <button disabled={saving || loading} onClick={savePreferences} className="btn-primary">{saving ? "Saving..." : "Save preferences →"}</button>
        <p className="text-xs text-gray-400">Transactional emails about orders, quotes, returns, support, account security and verification may still be sent even if marketing is disabled.</p>
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
