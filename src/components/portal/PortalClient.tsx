"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Package, RotateCcw, MapPin, MessageSquare, User, Bell, LogOut } from "lucide-react";

type Section = "orders" | "returns" | "tracking" | "support" | "account" | "marketing";

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id:"orders",    label:"Orders",               icon:<Package size={16}/> },
  { id:"returns",   label:"Returns",              icon:<RotateCcw size={16}/> },
  { id:"tracking",  label:"Tracking",             icon:<MapPin size={16}/> },
  { id:"support",   label:"Support",              icon:<MessageSquare size={16}/> },
  { id:"account",   label:"Account Settings",     icon:<User size={16}/> },
  { id:"marketing", label:"Marketing Preferences",icon:<Bell size={16}/> },
];

// Demo orders
const ORDERS = [
  { id:"CB1ACB2F", date:"28 Apr 2025", items:"Siemens S7-400 CPU 412-2", total:"£1,240.00", status:"DISPATCHED", tracking:"RM123456789GB" },
  { id:"CB0D9E1A", date:"14 Apr 2025", items:"ABB ACS550 Drive 75kW",    total:"£890.00",   status:"DELIVERED",  tracking:"DPD987654321" },
];

const STATUS_COLOR: Record<string,string> = {
  PENDING_PAYMENT:"text-yellow-700 bg-yellow-50",
  PAYMENT_RECEIVED:"text-blue-700 bg-blue-50",
  PROCESSING:"text-blue-700 bg-blue-50",
  DISPATCHED:"text-purple-700 bg-purple-50",
  DELIVERED:"text-green-700 bg-green-50",
  CANCELLED:"text-red-700 bg-red-50",
};

export default function PortalClient() {
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>("orders");
  const [returnOpen, setReturnOpen] = useState<string|null>(null);

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-display font-800 text-navy-900 text-2xl mb-2">Sign in to access your portal</h2>
        <p className="text-gray-500 mb-6 text-sm">View orders, track shipments, manage returns and more.</p>
        <div className="flex gap-3">
          <Link href="/auth/login"    className="btn-primary">Sign In →</Link>
          <Link href="/auth/register" className="btn-secondary">Create Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">Customer Portal</p>
          <h1 className="font-display font-800 text-navy-900 text-2xl">Welcome back, {session.user?.name ?? "there"}.</h1>
        </div>
        <button onClick={() => signOut({ callbackUrl:"/" })} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm transition-colors">
          <LogOut size={14}/> Sign out
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-display font-600 transition-colors border-l-2 ${
                  section===n.id
                    ? "bg-navy-900 text-white border-accent"
                    : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-navy-900"}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Orders */}
          {section==="orders" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-5">Your Orders</h2>
              {ORDERS.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="font-display font-600 text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ORDERS.map(o => (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-display font-700 text-navy-900 text-sm">Order #{o.id}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{o.date}</p>
                        </div>
                        <div className="text-right">
                          <span className={`badge ${STATUS_COLOR[o.status] ?? "text-gray-700 bg-gray-50"}`}>{o.status.replace("_"," ")}</span>
                          <p className="font-display font-700 text-navy-900 text-sm mt-1">{o.total}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{o.items}</p>
                      <div className="flex flex-wrap gap-2">
                        {o.tracking && (
                          <span className="text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1 font-mono text-gray-500">
                            Tracking: {o.tracking}
                          </span>
                        )}
                        <button onClick={() => setReturnOpen(o.id)} className="text-xs text-accent hover:text-accent-dark font-600 transition-colors">
                          Request Return
                        </button>
                        <Link href="/contact?type=support" className="text-xs text-gray-500 hover:text-navy-900 font-600 transition-colors">
                          Report a Problem
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Returns */}
          {section==="returns" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-2">Returns</h2>
              <p className="text-gray-500 text-sm mb-5">Returns can be requested within 30 days of delivery. Items must be in original condition.</p>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="font-display font-600 text-navy-900 mb-4 text-sm">Select an order to start a return:</p>
                <div className="space-y-2">
                  {ORDERS.map(o => (
                    <div key={o.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-display font-600 text-sm text-navy-900">Order #{o.id} — {o.items}</p>
                        <p className="text-gray-400 text-xs">{o.date}</p>
                      </div>
                      <button className="btn-secondary text-xs py-1.5 px-3">Request Return</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tracking */}
          {section==="tracking" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-5">Shipment Tracking</h2>
              <div className="space-y-3">
                {ORDERS.filter(o => o.tracking).map(o => (
                  <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display font-700 text-sm text-navy-900">{o.items}</p>
                      <span className={`badge ${STATUS_COLOR[o.status]}`}>{o.status.replace("_"," ")}</span>
                    </div>
                    <p className="font-mono text-xs text-gray-500 mb-3">Tracking: {o.tracking}</p>
                    <p className="text-gray-400 text-xs">Live tracking updates are provided by the carrier. Contact us if your shipment has not moved in 5+ days.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support */}
          {section==="support" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-5">Contact Support</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Subject</label>
                    <select className="select">
                      <option>Order query</option>
                      <option>Delivery issue</option>
                      <option>Return request</option>
                      <option>Technical question</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div><label className="label">Related Order (optional)</label>
                    <select className="select">
                      <option>— Select order —</option>
                      {ORDERS.map(o => <option key={o.id}>Order #{o.id}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Message *</label><textarea className="textarea" rows={4} placeholder="Describe your issue..."/></div>
                <button className="btn-primary">Send to Support →</button>
                <p className="text-xs text-gray-400">Or contact us directly: <a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a> · <a href="https://wa.me/447340383334" className="text-[#25D366]">WhatsApp</a></p>
              </div>
            </div>
          )}

          {/* Account */}
          {section==="account" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-5">Account Settings</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Full Name</label><input className="input" defaultValue={session.user?.name ?? ""}/></div>
                  <div><label className="label">Email</label><input className="input" type="email" defaultValue={session.user?.email ?? ""}/></div>
                  <div><label className="label">Phone</label><input className="input" type="tel" placeholder="+44..."/></div>
                  <div><label className="label">Company</label><input className="input" placeholder="Your company"/></div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-display font-700 text-sm text-navy-900 mb-3">Change Password</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="label">New Password</label><input className="input" type="password" minLength={8}/></div>
                    <div><label className="label">Confirm Password</label><input className="input" type="password"/></div>
                  </div>
                </div>
                <button className="btn-primary">Save Changes →</button>
              </div>
            </div>
          )}

          {/* Marketing prefs */}
          {section==="marketing" && (
            <div>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-2">Marketing Preferences</h2>
              <p className="text-gray-500 text-sm mb-5">Control what emails you receive from Combay.</p>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-accent"/>
                  <div>
                    <p className="font-display font-600 text-sm text-navy-900">New stock notifications</p>
                    <p className="text-gray-400 text-xs">Email alerts when new inventory is added matching your categories.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-accent"/>
                  <div>
                    <p className="font-display font-600 text-sm text-navy-900">Promotions and discounts</p>
                    <p className="text-gray-400 text-xs">Notifications about promotions, seasonal discounts, and special offers.</p>
                  </div>
                </label>
                <div>
                  <p className="font-display font-700 text-sm text-navy-900 mb-2">Categories of interest</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Lab & Scientific","Automation & Control","Test & Detection","IT & Networking","Display & AV","Oil & Gas","Audio & Broadcast","Manufacturing"].map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-accent"/>
                        <span className="text-xs text-gray-600 font-display font-600">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn-primary">Save Preferences →</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Return modal */}
      {returnOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-700 text-navy-900">Request Return — #{returnOpen}</h3>
              <button onClick={() => setReturnOpen(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Reason for return *</label>
                <select className="select">
                  <option>Item not as described</option>
                  <option>Arrived damaged</option>
                  <option>Wrong item received</option>
                  <option>Changed mind</option>
                  <option>Other</option>
                </select>
              </div>
              <div><label className="label">Additional details</label><textarea className="textarea" rows={3}/></div>
              <p className="text-xs text-gray-400">Returns must be within 30 days of delivery. We&apos;ll send a return label within 24–48 hours.</p>
              <div className="flex gap-3">
                <button className="btn-primary flex-1 justify-center" onClick={() => setReturnOpen(null)}>Submit Return →</button>
                <button className="btn-secondary" onClick={() => setReturnOpen(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
