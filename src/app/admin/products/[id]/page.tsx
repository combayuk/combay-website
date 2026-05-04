"use client";

import Link from "next/link";
import ProductEditor from "@/components/admin/ProductEditor";
import { getAdminProductById } from "@/lib/adminCatalog";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const product = getAdminProductById(params.id);

  if (!product) {
    return (
      <div className="max-w-2xl bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="font-display font-800 text-2xl text-navy-950 mb-2">Product not found</h1>
        <p className="text-gray-500 text-sm mb-5">This product does not exist in the preview catalogue or admin-managed products.</p>
        <Link href="/admin/products" className="btn-primary">Back to products</Link>
      </div>
    );
  }

  return <ProductEditor mode="edit" initialProduct={product} />;
}
