import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { requireAdminApi } from "@/lib/adminApi";
import { listCategories, listProducts } from "@/server/store";
import { filterAndSortProducts, isSortValue } from "@/server/productListing";
import type { ProductRecord } from "@/server/types";

/**
 * Export de la liste des produits, au format tableur (CSV) ou imprimable (PDF).
 *
 * L'export reprend les filtres de l'écran — catégorie, recherche, tri — mais
 * jamais la pagination : on exporte toute la sélection, pas la page affichée.
 */

export const dynamic = "force-dynamic";

interface ExportRow {
  brand: string;
  name: string;
  category: string;
  price: string;
  oldPrice: string;
  stock: string;
  threshold: string;
  badge: string;
  rating: string;
  gtin: string;
  mpn: string;
  image: string;
}

const CSV_COLUMNS: { key: keyof ExportRow; label: string }[] = [
  { key: "brand", label: "Marque" },
  { key: "name", label: "Nom" },
  { key: "category", label: "Catégorie" },
  { key: "price", label: "Prix" },
  { key: "oldPrice", label: "Ancien prix" },
  { key: "stock", label: "Stock" },
  { key: "threshold", label: "Seuil d'alerte" },
  { key: "badge", label: "Badge" },
  { key: "rating", label: "Note" },
  { key: "gtin", label: "GTIN" },
  { key: "mpn", label: "MPN" },
  { key: "image", label: "Image" },
];

/** Colonnes du PDF, avec leur largeur en points. */
const PDF_COLUMNS: { key: keyof ExportRow; label: string; width: number }[] = [
  { key: "brand", label: "Marque", width: 95 },
  { key: "name", label: "Nom", width: 250 },
  { key: "category", label: "Catégorie", width: 130 },
  { key: "price", label: "Prix", width: 80 },
  { key: "stock", label: "Stock", width: 55 },
  { key: "badge", label: "Badge", width: 90 },
];

function toRow(product: ProductRecord, categoryLabel: string): ExportRow {
  return {
    brand: product.brand,
    name: product.name,
    category: categoryLabel,
    price: product.price,
    oldPrice: product.oldPrice ?? "",
    stock: (product.stock ?? 0).toString(),
    threshold: (product.lowStockThreshold ?? 0).toString(),
    badge: product.badge ?? "",
    rating: product.rating?.toString() ?? "",
    gtin: product.gtin ?? "",
    mpn: product.mpn ?? "",
    image: product.image ?? "",
  };
}

// ---- CSV ----

/**
 * Le point-virgule est le séparateur attendu par Excel dans les environnements
 * français ; la virgule y couperait les prix (« 349,00 € »).
 */
function csvCell(value: string): string {
  const clean = value.replace(/\r?\n/g, " ").trim();
  return /[";]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

function buildCsv(rows: ExportRow[]): string {
  const lines = [
    CSV_COLUMNS.map((column) => csvCell(column.label)).join(";"),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column.key])).join(";")),
  ];
  // Le BOM évite qu'Excel n'affiche « HausgerÃ¤te » à l'ouverture.
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ---- PDF ----

/**
 * Les polices standard d'un PDF n'acceptent que le jeu WinAnsi. Tout ce qui en
 * sort — guillemets typographiques, tirets longs, symboles — est ramené à un
 * équivalent, sans quoi pdf-lib refuse d'écrire la ligne.
 */
function sanitize(value: string): string {
  return value
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E¡-ÿ€]/g, "");
}

/** Tronque le texte pour qu'il tienne dans la largeur de colonne. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = sanitize(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;

  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

const PAGE_WIDTH = 841.89; // A4 paysage
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const ROW_HEIGHT = 18;
const FONT_SIZE = 9;

interface PdfContext {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  title: string;
  subtitle: string;
}

function startPage(context: PdfContext, pageNumber: number): { page: PDFPage; y: number } {
  const page = context.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(sanitize(context.title), {
    x: MARGIN,
    y: y - 12,
    size: 15,
    font: context.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  page.drawText(sanitize(context.subtitle), {
    x: MARGIN,
    y: y - 9,
    size: 9,
    font: context.font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 26;

  // En-tête du tableau
  page.drawRectangle({
    x: MARGIN,
    y: y - ROW_HEIGHT + 4,
    width: PAGE_WIDTH - MARGIN * 2,
    height: ROW_HEIGHT,
    color: rgb(0.94, 0.94, 0.94),
  });

  let x = MARGIN + 4;
  for (const column of PDF_COLUMNS) {
    page.drawText(sanitize(column.label), {
      x,
      y: y - ROW_HEIGHT + 10,
      size: FONT_SIZE,
      font: context.bold,
      color: rgb(0.2, 0.2, 0.2),
    });
    x += column.width;
  }
  y -= ROW_HEIGHT + 2;

  page.drawText(sanitize(`Page ${pageNumber}`), {
    x: PAGE_WIDTH - MARGIN - 40,
    y: MARGIN - 12,
    size: 8,
    font: context.font,
    color: rgb(0.55, 0.55, 0.55),
  });

  return { page, y };
}

async function buildPdf(rows: ExportRow[], subtitle: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const context: PdfContext = {
    doc,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    title: "MLC Bois — Catalogue produits",
    subtitle,
  };

  let pageNumber = 1;
  let { page, y } = startPage(context, pageNumber);

  for (const [index, row] of rows.entries()) {
    if (y < MARGIN + ROW_HEIGHT) {
      pageNumber += 1;
      ({ page, y } = startPage(context, pageNumber));
    }

    // Fond alterné : un tableau de 78 lignes se suit mal sans repère visuel.
    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_HEIGHT + 4,
        width: PAGE_WIDTH - MARGIN * 2,
        height: ROW_HEIGHT,
        color: rgb(0.975, 0.975, 0.975),
      });
    }

    let x = MARGIN + 4;
    for (const column of PDF_COLUMNS) {
      page.drawText(fit(row[column.key], context.font, FONT_SIZE, column.width - 8), {
        x,
        y: y - ROW_HEIGHT + 10,
        size: FONT_SIZE,
        font: context.font,
        color: rgb(0.15, 0.15, 0.15),
      });
      x += column.width;
    }
    y -= ROW_HEIGHT;
  }

  return doc.save();
}

// ---- Route ----

export async function GET(request: Request): Promise<Response> {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const query = url.searchParams.get("q") ?? "";
  const sortParam = url.searchParams.get("sort");
  const sort = isSortValue(sortParam) ? sortParam : "name";

  const [categories, allProducts] = await Promise.all([
    listCategories(),
    listProducts(categoryId ? { categoryId } : undefined),
  ]);
  const categoryLabelById = new Map(categories.map((category) => [category.id, category.label]));

  const products = filterAndSortProducts(allProducts, { query, sort });
  const rows = products.map((product) =>
    toRow(product, categoryLabelById.get(product.categoryId) ?? product.categoryId),
  );

  const today = new Date().toISOString().slice(0, 10);
  const filename = `produits-${today}.${format}`;

  if (format === "csv") {
    return new Response(buildCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Rappel des filtres dans le PDF : un export imprimé sans son contexte ne se
  // relit pas.
  const parts = [`${rows.length} produit${rows.length > 1 ? "s" : ""}`];
  if (categoryId) parts.push(`catégorie : ${categoryLabelById.get(categoryId) ?? categoryId}`);
  if (query.trim()) parts.push(`recherche : « ${query.trim()} »`);
  parts.push(`export du ${new Date().toLocaleDateString("fr-FR")}`);

  const pdf = await buildPdf(rows, parts.join(" — "));

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
