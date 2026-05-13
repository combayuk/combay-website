import CatalogueQualityClient from "@/components/admin/CatalogueQualityClient";
import { loadCatalogueQualityReport } from "@/lib/catalogueQuality";

export const dynamic = "force-dynamic";

export default async function CatalogueQualityPage() {
  const result = await loadCatalogueQualityReport({ status: "PUBLISHED", issue: "all", page: 1, pageSize: 40 });
  return <CatalogueQualityClient initialData={result.ok ? result.data : null} />;
}
