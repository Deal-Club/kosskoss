import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { parseProductInput, toCreateInput, type ProductInput } from "@/server/productInput";
import { createProduct, listCategories } from "@/server/store";

// Massenimport aus CSV oder JSON. Derselbe Endpunkt liefert die Vorschau
// (dryRun) et exécute l'import — la même
// même logique : l'aperçu ne peut donc pas différer du résultat.

// Seul POST est exporté — Next.js n'autorise pas d'exports libres dans route.ts.
const CSV_COLUMNS = [
  "categoryId",
  "brand",
  "name",
  "price",
  "oldPrice",
  "badge",
  "bullets",
  "shortDescription",
  "stock",
] as const;

type ImportFormat = "csv" | "json";

interface ImportRowResult {
  line: number;
  ok: boolean;
  errors: string[];
  values: ProductInput;
  created: boolean;
  id?: string;
}

interface ImportReport {
  format: ImportFormat;
  dryRun: boolean;
  total: number;
  valid: number;
  invalid: number;
  created: number;
  rows: ImportRowResult[];
}

/** Découpe une ligne CSV en tenant compte des champs entre guillemets. */
function splitCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

function normalizeHeader(value: string): string | undefined {
  const cleaned = value.trim().toLowerCase();
  return CSV_COLUMNS.find((column) => column.toLowerCase() === cleaned);
}

interface ParsedRow {
  line: number;
  record: Record<string, unknown>;
}

function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { rows: [], errors: ["Aucune ligne trouvée."] };

  // Trennzeichen aus der ersten Zeile ableiten: Semikolon bevorzugt (deutsches Excel)
  const separator = lines[0].includes(";") ? ";" : ",";
  const firstFields = splitCsvLine(lines[0], separator);
  const hasHeader = firstFields.some((field) => normalizeHeader(field) !== undefined);

  const columns: (string | undefined)[] = hasHeader
    ? firstFields.map(normalizeHeader)
    : [...CSV_COLUMNS];

  const rows: ParsedRow[] = [];
  const start = hasHeader ? 1 : 0;

  for (let index = start; index < lines.length; index += 1) {
    const fields = splitCsvLine(lines[index], separator);
    const record: Record<string, unknown> = {};
    fields.forEach((value, position) => {
      const key = columns[position];
      // Les cellules vides sont ignorées pour laisser jouer les valeurs par défaut
      if (key && value !== "") record[key] = value;
    });
    rows.push({ line: index + 1, record });
  }

  return { rows, errors: [] };
}

function parseJson(text: string): { rows: ParsedRow[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], errors: ["Le JSON n'a pas pu être lu."] };
  }

  const list =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown }).products)
        ? ((parsed as { products: unknown[] }).products)
        : null;

  if (!list) return { rows: [], errors: ["Erwartet wird ein Array von Produkten."] };

  const rows: ParsedRow[] = list.map((entry, index) => ({
    line: index + 1,
    record: entry && typeof entry === "object" && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {},
  }));

  return { rows, errors: [] };
}

function detectFormat(text: string): ImportFormat {
  const trimmed = text.trim();
  return trimmed.startsWith("[") || trimmed.startsWith("{") ? "json" : "csv";
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Aucune donnée transmise." }, { status: 400 });
  }

  const requested = body?.format;
  const format: ImportFormat =
    requested === "csv" || requested === "json" ? requested : detectFormat(text);
  const dryRun = body?.dryRun !== false;

  const parsed = format === "csv" ? parseCsv(text) : parseJson(text);
  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: parsed.errors[0] }, { status: 400 });
  }
  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne de données trouvée." }, { status: 400 });
  }
  if (parsed.rows.length > 500) {
    return NextResponse.json(
      { error: "500 lignes maximum par import." },
      { status: 400 },
    );
  }

  const categories = await listCategories();
  const knownCategoryIds = new Set(categories.map((category) => category.id));

  const results: ImportRowResult[] = parsed.rows.map(({ line, record }) => {
    const { values, errors } = parseProductInput(record, "create");
    if (values.categoryId && !knownCategoryIds.has(values.categoryId)) {
      errors.push(`Unbekannte Kategorie: ${values.categoryId}`);
    }
    return { line, ok: errors.length === 0, errors, values, created: false };
  });

  let created = 0;
  if (!dryRun) {
    for (const result of results) {
      if (!result.ok) continue;
      const input = toCreateInput(result.values);
      if (!input) {
        result.ok = false;
        result.errors.push("Pflichtfelder fehlen.");
        continue;
      }
      try {
        const product = await createProduct(input);
        result.created = true;
        result.id = product.id;
        created += 1;
      } catch (error) {
        result.ok = false;
        result.errors.push(error instanceof Error ? error.message : "Échec de la création.");
      }
    }
    if (created > 0) revalidatePath("/", "layout");
  }

  const report: ImportReport = {
    format,
    dryRun,
    total: results.length,
    valid: results.filter((row) => row.ok).length,
    invalid: results.filter((row) => !row.ok).length,
    created,
    rows: results,
  };

  return NextResponse.json(report);
}
