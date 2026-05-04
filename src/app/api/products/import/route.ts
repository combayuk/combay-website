import { saveProductToRepository } from "@/lib/productRepository";

function csvSplitLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }
    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function boolish(value: string | undefined) {
  return ["true", "yes", "y", "1", "poa"].includes(String(value ?? "").trim().toLowerCase());
}

function normaliseCondition(value: string | undefined) {
  const cleaned = String(value ?? "USED").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["NEW", "NEW_OPEN_BOX", "USED", "FOR_PARTS"].includes(cleaned)) return cleaned;
  if (cleaned.includes("OPEN")) return "NEW_OPEN_BOX";
  if (cleaned.includes("PART") || cleaned.includes("REPAIR")) return "FOR_PARTS";
  return "USED";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { csv?: string } | null;
  const csv = body?.csv ?? "";
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (lines.length < 2) {
    return Response.json({ ok: false, imported: 0, updated: 0, errors: ["CSV must include a header row and at least one product row."] }, { status: 400 });
  }

  const headers = csvSplitLine(lines[0]).map((header) => header.trim().toLowerCase());
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = csvSplitLine(lines[lineIndex]);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    if (!row.title?.trim()) {
      errors.push(`Row ${lineIndex + 1}: missing title.`);
      continue;
    }

    const payload = {
      sku: row.sku || undefined,
      title: row.title,
      brand: row.brand || "",
      manufacturer: row.manufacturer || row.brand || "",
      model: row.model || "",
      mpn: row.mpn || "",
      category: row.category || "Automation & Control",
      condition: normaliseCondition(row.condition),
      price: boolish(row.price_on_request) ? null : row.price ? Number(row.price) : null,
      priceOnRequest: boolish(row.price_on_request),
      stockQty: Number(row.stock_qty || row.quantity || 0),
      leadTime: row.lead_time || undefined,
      warranty: row.warranty || undefined,
      description: row.description || undefined,
      productOverview: row.product_overview || row.description || undefined,
      image: row.item_pic_url || row.image_url || row.image || null,
      source: "csv",
      status: "PUBLISHED" as const,
    };

    const result = await saveProductToRepository(payload as any);
    if (!result.ok) {
      errors.push(`Row ${lineIndex + 1}: ${result.reason}`);
    } else if (row.sku) {
      updated += 1;
    } else {
      imported += 1;
    }
  }

  return Response.json({ ok: errors.length === 0, imported, updated, errors });
}
