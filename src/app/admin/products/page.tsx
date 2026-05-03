"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";

const DEMO_PRODUCTS = [
  { id:"1", sku:"CB10001", title:"Siemens S7-400 CPU 412-2", category:"Automation & Control", condition:"USED",   price:1240, stock:2, status:"PUBLISHED" },
  { id:"2", sku:"CB10002", title:"Thermo Scientific FT-IR IS5", category:"Lab & Scientific",  condition:"USED",   price:2450, stock:1, status:"PUBLISHED" },
  { id:"3", sku:"CB10003", title:"ABB ACS550 Drive 75kW",    category:"Automation & Control", condition:"USED",   price:890,  stock:3, status:"DRAFT" },
  { id:"4", sku:"CB10004", title:"Tektronix MDO3054",        category:"Test & Detection",      condition:"NEW_OPEN_BOX",price:875,stock:1, status:"PUBLISHED" },
];

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const filtered = DEMO_PRODUCTS.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-800 text-navy-900 text-2xl">Products</h1>
        <Link href="/admin/products/new" className="btn-primary"><Plus size={14}/> Add Product</Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..." className="input pl-9 py-2 text-xs"/>
          </div>
        </div>
        <table className="w-full admin-table">
          <thead>
            <tr><th>SKU</th><th>Title</th><th>Category</th><th>Condition</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-xs text-gray-500">{p.sku}</td>
                <td className="font-display font-600 text-navy-900 max-w-xs truncate">{p.title}</td>
                <td className="text-xs text-gray-500">{p.category}</td>
                <td><span className="badge text-xs bg-gray-50 border-gray-200 text-gray-600">{p.condition}</span></td>
                <td className="font-display font-600">£{p.price.toLocaleString()}</td>
                <td className={`font-600 text-sm ${p.stock === 0 ? "text-red-500" : p.stock <= 2 ? "text-yellow-600" : "text-green-600"}`}>{p.stock}</td>
                <td>
                  <span className={`badge text-xs border ${p.status==="PUBLISHED" ? "text-green-700 bg-green-50 border-green-200" : "text-yellow-700 bg-yellow-50 border-yellow-200"}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/shop/${p.id}`} className="text-gray-400 hover:text-navy-900 transition-colors"><Eye size={14}/></Link>
                    <Link href={`/admin/products/${p.id}`} className="text-gray-400 hover:text-accent transition-colors"><Edit size={14}/></Link>
                    <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
