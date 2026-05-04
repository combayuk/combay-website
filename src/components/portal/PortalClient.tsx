"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Package, RotateCcw, MapPin, MessageSquare, User, Bell, LogOut, ExternalLink, Plus, Trash2 } from "lucide-react";

type Section = "orders"|"returns"|"tracking"|"support"|"account"|"addresses"|"marketing";

const NAV: {id:Section;label:string;icon:React.ReactNode}[] = [
  {id:"orders",    label:"Orders",                icon:<Package size={15}/>},
  {id:"returns",   label:"Returns",               icon:<RotateCcw size={15}/>},
  {id:"tracking",  label:"Tracking",              icon:<MapPin size={15}/>},
  {id:"support",   label:"Support",               icon:<MessageSquare size={15}/>},
  {id:"account",   label:"Account Settings",      icon:<User size={15}/>},
  {id:"addresses", label:"Addresses",             icon:<MapPin size={15}/>},
  {id:"marketing", label:"Marketing Preferences", icon:<Bell size={15}/>},
];

// Days since a date
const daysSince = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);

const RETURN_STATUSES = ["Request Submitted","Collection Booked","In Transit","Inspecting","Refund Approved"];
const COURIER_LINKS: Record<string,string> = {
  "Royal Mail":"https://www.royalmail.com/track-your-item#/tracking-results/",
  "DPD":"https://track.dpd.co.uk/tracking/",
  "DHL":"https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=",
  "FedEx":"https://www.fedex.com/apps/fedextrack/?tracknumbers=",
};

const ORDERS = [
  {id:"CB1ACB2F", date:"2025-04-28", items:"Siemens S7-400 CPU 412-2", total:"£1,240.00", status:"DISPATCHED", courier:"Royal Mail", tracking:"RM123456789GB"},
  {id:"CB0D9E1A", date:"2025-03-01", items:"ABB ACS550 Drive 75kW",    total:"£890.00",   status:"DELIVERED",  courier:"DPD",        tracking:"DPD987654321"},
];

const S_COLOR: Record<string,string> = {
  PENDING_PAYMENT:"text-yellow-700 bg-yellow-50",
  PROCESSING:     "text-blue-700 bg-blue-50",
  DISPATCHED:     "text-purple-700 bg-purple-50",
  DELIVERED:      "text-green-700 bg-green-50",
};

type Address = {id:string;label:string;line1:string;line2:string;city:string;postcode:string;country:string;isDefault:boolean};

export default function PortalClient() {
  const { data: session } = useSession();
  const [section, setSection]   = useState<Section>("orders");
  const [returnModal, setReturnModal] = useState<string|null>(null);
  const [returnStep,  setReturnStep]  = useState(0);
  const [accountType, setAccountType] = useState<"individual"|"company">("individual");
  const [addresses, setAddresses] = useState<Address[]>([
    {id:"a1",label:"Home",line1:"123 High Street",line2:"",city:"London",postcode:"EC1A 1AA",country:"United Kingdom",isDefault:true},
  ]);
  const [addingAddr, setAddingAddr] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<Address,"id"|"isDefault">>({label:"",line1:"",line2:"",city:"",postcode:"",country:"United Kingdom"});

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <h2 className="font-display font-800 text-navy-950 text-2xl mb-2">Sign in to access your portal</h2>
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
          <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-1">Customer Portal</p>
          <h1 className="font-display font-800 text-navy-950 text-2xl">Welcome back, {session.user?.name ?? "there"}.</h1>
        </div>
        <button onClick={()=>signOut({callbackUrl:"/"})} className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm transition-colors font-display font-600">
          <LogOut size={14}/> Sign out
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setSection(n.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-display font-600 transition-all border-l-2 ${
                  section===n.id ? "bg-navy-950 text-white border-accent" : "text-gray-600 border-transparent hover:bg-surface hover:text-navy-950"}`}>
                <span className={section===n.id?"text-accent":""}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">

          {/* ── ORDERS ── */}
          {section==="orders" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-5">Your Orders</h2>
              {ORDERS.length===0
                ? <div className="bg-surface border border-gray-200 rounded-xl p-10 text-center text-gray-400"><Package size={32} className="mx-auto mb-3 opacity-25"/><p className="text-sm font-display font-600">No orders yet</p></div>
                : <div className="space-y-3">
                    {ORDERS.map(o=>{
                      const days       = daysSince(o.date);
                      const canReturn  = days <= 30 && o.status === "DELIVERED";
                      const trackUrl   = COURIER_LINKS[o.courier] ? `${COURIER_LINKS[o.courier]}${o.tracking}` : "#";
                      return (
                        <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="font-display font-700 text-navy-950 text-sm">Order #{o.id}</p>
                              <p className="text-gray-400 text-xs">{new Date(o.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>
                            </div>
                            <div className="text-right">
                              <span className={`badge ${S_COLOR[o.status]??""}`}>{o.status.replace(/_/g," ")}</span>
                              <p className="font-display font-700 text-navy-950 text-sm mt-1">{o.total}</p>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{o.items}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {o.tracking && (
                              <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 font-mono text-accent hover:text-accent-dark transition-colors">
                                {o.tracking} <ExternalLink size={10}/>
                              </a>
                            )}
                            {canReturn
                              ? <button onClick={()=>{setReturnModal(o.id);setReturnStep(0);}} className="text-accent hover:text-accent-dark font-display font-600 transition-colors">Request Return</button>
                              : o.status==="DELIVERED"
                                ? <span className="text-gray-400 font-display font-600">Return window has elapsed</span>
                                : null
                            }
                            <Link href={`/contact?type=support&order=${o.id}`} className="text-gray-500 hover:text-navy-950 font-display font-600 transition-colors">Report a Problem</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
          )}

          {/* ── RETURNS (status system) ── */}
          {section==="returns" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-2">Returns</h2>
              <p className="text-gray-500 text-sm mb-5">Returns must be requested within 30 days of delivery. Items must be in their original condition.</p>
              {ORDERS.filter(o=>daysSince(o.date)<=30&&o.status==="DELIVERED").length===0
                ? <div className="bg-surface border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">No eligible orders for return right now.</div>
                : ORDERS.filter(o=>daysSince(o.date)<=30&&o.status==="DELIVERED").map(o=>(
                    <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-display font-700 text-sm text-navy-950">{o.items}</p>
                          <p className="text-gray-400 text-xs">Order #{o.id} · {30-daysSince(o.date)} days left to return</p>
                        </div>
                        <button onClick={()=>{setReturnModal(o.id);setReturnStep(0);}} className="btn-secondary text-xs py-1.5 px-3">Request Return</button>
                      </div>
                      {/* Return status stepper (demo) */}
                      <div className="flex items-center gap-0 mt-3">
                        {RETURN_STATUSES.map((s,i)=>(
                          <div key={s} className="flex items-center flex-1 min-w-0">
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-700 ${i===0?"bg-accent text-navy-950":"bg-gray-200 text-gray-400"}`}>
                              {i===0?"✓":i+1}
                            </div>
                            <div className="flex-1 h-px bg-gray-200 mx-1"/>
                            <span className="text-[9px] text-gray-400 font-display font-600 hidden sm:inline whitespace-nowrap">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {/* ── TRACKING ── */}
          {section==="tracking" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-5">Shipment Tracking</h2>
              <div className="space-y-3">
                {ORDERS.filter(o=>o.tracking).map(o=>{
                  const url = COURIER_LINKS[o.courier]?`${COURIER_LINKS[o.courier]}${o.tracking}`:"#";
                  return (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-display font-700 text-sm text-navy-950">{o.items}</p>
                        <span className={`badge ${S_COLOR[o.status]??""}`}>{o.status.replace(/_/g," ")}</span>
                      </div>
                      <p className="text-gray-400 text-xs mb-3">Courier: {o.courier}</p>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent font-mono text-xs px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors font-600">
                        Track: {o.tracking} <ExternalLink size={11}/>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUPPORT ── */}
          {section==="support" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-5">Contact Support</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Subject</label>
                    <select className="select">
                      <option>Order query</option><option>Delivery issue</option>
                      <option>Return request</option><option>Technical question</option><option>Other</option>
                    </select></div>
                  <div><label className="label">Related Order</label>
                    <select className="select">
                      <option value="">— Optional —</option>
                      {ORDERS.map(o=><option key={o.id}>#{o.id}</option>)}
                    </select></div>
                </div>
                <div><label className="label">Message *</label><textarea className="textarea" rows={4} placeholder="Describe your issue in detail..."/></div>
                <div className="flex items-center justify-between">
                  <button className="btn-primary">Send Message →</button>
                  <div className="text-xs text-gray-400 space-y-0.5 text-right">
                    <p>Or contact us directly:</p>
                    <p><a href="mailto:info@combay.co.uk" className="text-accent">info@combay.co.uk</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACCOUNT SETTINGS ── */}
          {section==="account" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-5">Account Settings</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                {/* Account type toggle */}
                <div>
                  <label className="label">Account Type</label>
                  <div className="flex gap-2">
                    {(["individual","company"] as const).map(t=>(
                      <button key={t} onClick={()=>setAccountType(t)}
                        className={`font-display font-600 text-sm px-4 py-2 rounded-md border capitalize transition-colors ${accountType===t?"bg-navy-950 text-white border-navy-950":"border-gray-200 text-gray-600 hover:border-navy-950"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Full Name</label><input className="input" defaultValue={session.user?.name??""}/></div>
                  <div><label className="label">Email</label><input className="input" type="email" defaultValue={session.user?.email??""}/></div>
                  {/* Phone with country dropdown */}
                  <div>
                    <label className="label">Phone</label>
                    <div className="flex">
                      <select className="select rounded-r-none w-24 flex-shrink-0 border-r-0">
                        <option value="+44">🇬🇧 +44</option><option value="+1">🇺🇸 +1</option>
                        <option value="+49">🇩🇪 +49</option><option value="+33">🇫🇷 +33</option>
                        <option value="+971">🇦🇪 +971</option><option value="+91">🇮🇳 +91</option>
                      </select>
                      <input className="input rounded-l-none" type="tel" placeholder="7xxx xxxxxx"/>
                    </div>
                  </div>
                  {accountType==="company" && <>
                    <div><label className="label">Company Name</label><input className="input" placeholder="Company Ltd"/></div>
                    <div><label className="label">Company Registration No.</label><input className="input" placeholder="12345678"/></div>
                    <div><label className="label">VAT Number</label><input className="input" placeholder="GB123456789"/></div>
                  </>}
                </div>
                {accountType==="company" && (
                  <div>
                    <label className="label">Business Documents</label>
                    <p className="text-gray-400 text-xs mb-2">Upload incorporation certificate or other business verification (optional).</p>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all">
                      <p className="font-display font-600 text-sm text-gray-600">Click to upload document</p>
                      <p className="text-gray-400 text-xs mt-1">PDF, JPG — max 10MB</p>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-display font-700 text-sm text-navy-950 mb-3">Change Password</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="label">New Password</label><input className="input" type="password" minLength={8}/></div>
                    <div><label className="label">Confirm Password</label><input className="input" type="password"/></div>
                  </div>
                </div>
                <button className="btn-primary">Save Changes →</button>
              </div>
            </div>
          )}

          {/* ── ADDRESSES ── */}
          {section==="addresses" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-700 text-navy-950 text-lg">Saved Addresses</h2>
                {addresses.length < 5 && (
                  <button onClick={()=>setAddingAddr(true)} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                    <Plus size={14}/> Add Address
                  </button>
                )}
              </div>
              {addresses.length>=5 && <p className="text-sm text-gray-500 mb-3">Maximum 5 addresses reached.</p>}
              <div className="space-y-3">
                {addresses.map(addr=>(
                  <div key={addr.id} className={`bg-white border rounded-xl p-5 ${addr.isDefault?"border-accent":"border-gray-200"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-700 text-sm text-navy-950">{addr.label}</span>
                          {addr.isDefault && <span className="text-[10px] bg-accent text-navy-950 font-display font-700 px-2 py-0.5 rounded-full">DEFAULT</span>}
                        </div>
                        <p className="text-gray-600 text-sm">{addr.line1}{addr.line2?`, ${addr.line2}`:""}</p>
                        <p className="text-gray-600 text-sm">{addr.city}, {addr.postcode}</p>
                        <p className="text-gray-400 text-xs">{addr.country}</p>
                      </div>
                      <div className="flex gap-2">
                        {!addr.isDefault && (
                          <button onClick={()=>setAddresses(as=>as.map(a=>({...a,isDefault:a.id===addr.id})))}
                            className="text-xs text-accent hover:text-accent-dark font-display font-600 transition-colors">Set Default</button>
                        )}
                        <button onClick={()=>setAddresses(as=>as.filter(a=>a.id!==addr.id))}
                          className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {addingAddr && (
                <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 space-y-3 animate-fade-up">
                  <h3 className="font-display font-700 text-navy-950 mb-2">New Address</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className="label text-xs">Label (e.g. Home, Office)</label><input className="input text-sm" value={newAddr.label} onChange={e=>setNewAddr(a=>({...a,label:e.target.value}))} placeholder="Home"/></div>
                    <div><label className="label text-xs">Address Line 1</label><input className="input text-sm" value={newAddr.line1} onChange={e=>setNewAddr(a=>({...a,line1:e.target.value}))}/></div>
                    <div><label className="label text-xs">Address Line 2</label><input className="input text-sm" value={newAddr.line2} onChange={e=>setNewAddr(a=>({...a,line2:e.target.value}))}/></div>
                    <div><label className="label text-xs">City</label><input className="input text-sm" value={newAddr.city} onChange={e=>setNewAddr(a=>({...a,city:e.target.value}))}/></div>
                    <div><label className="label text-xs">Postcode</label><input className="input text-sm" value={newAddr.postcode} onChange={e=>setNewAddr(a=>({...a,postcode:e.target.value}))}/></div>
                    <div><label className="label text-xs">Country</label>
                      <select className="select text-sm" value={newAddr.country} onChange={e=>setNewAddr(a=>({...a,country:e.target.value}))}>
                        <option>United Kingdom</option><option>United States</option><option>Germany</option><option>France</option><option>UAE</option><option>India</option><option>Other</option>
                      </select></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={()=>{
                      setAddresses(as=>[...as,{...newAddr,id:`a${Date.now()}`,isDefault:as.length===0}]);
                      setAddingAddr(false); setNewAddr({label:"",line1:"",line2:"",city:"",postcode:"",country:"United Kingdom"});
                    }} className="btn-primary text-sm">Add Address</button>
                    <button onClick={()=>setAddingAddr(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MARKETING PREFERENCES ── */}
          {section==="marketing" && (
            <div>
              <h2 className="font-display font-700 text-navy-950 text-lg mb-2">Marketing Preferences</h2>
              <p className="text-gray-500 text-sm mb-5">Control what emails Combay sends you.</p>
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 accent-accent"/>
                  <div>
                    <p className="font-display font-600 text-sm text-navy-950">New stock notifications</p>
                    <p className="text-gray-400 text-xs">Email alerts when new inventory matching your categories is added.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 accent-accent"/>
                  <div>
                    <p className="font-display font-600 text-sm text-navy-950">Promotions and discounts</p>
                    <p className="text-gray-400 text-xs">Seasonal offers and discount codes.</p>
                  </div>
                </label>
                <div>
                  <p className="font-display font-700 text-sm text-navy-950 mb-3">Categories of interest</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {["Lab & Scientific","Automation & Control","Test & Detection","IT & Networking","Display & AV","Oil & Gas","Audio & Broadcast","Manufacturing"].map(cat=>(
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-accent"/>
                        <span className="text-sm text-gray-600 font-display font-600">{cat}</span>
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

      {/* Return request modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-700 text-navy-950">Request Return — #{returnModal}</h3>
              <button onClick={()=>setReturnModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Reason *</label>
                <select className="select">
                  <option>Item not as described</option><option>Arrived damaged</option>
                  <option>Wrong item received</option><option>Changed mind</option><option>Other</option>
                </select></div>
              <div><label className="label">Additional details</label>
                <textarea className="textarea" rows={3} placeholder="Please describe the issue..."/></div>
              <div className="bg-surface border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
                ℹ️ Returns must be within 30 days of delivery. We&apos;ll send a prepaid return label within 24–48 hours.
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setReturnModal(null)} className="btn-primary flex-1">Submit Return →</button>
                <button onClick={()=>setReturnModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
