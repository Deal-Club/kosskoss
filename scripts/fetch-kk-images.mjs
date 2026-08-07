// Associe chaque produit (data/client/assort_marque.csv) à son image du dossier
// Drive client (data/client/drive_images.json), télécharge l'image et l'enregistre
// dans public/images/products/<SKU>.jpg, puis écrit data/client/image-paths.json
// (SKU -> chemin public) consommé par le build du catalogue.
//
// Téléchargement via l'endpoint « thumbnail » de Drive : il renvoie toujours une
// image (JPEG) pour un fichier public, sans page d'avertissement antivirus.
// Node 18+ (fetch global). Lancement : node scripts/fetch-kk-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "images", "products");
mkdirSync(OUT_DIR, { recursive: true });

// ---- CSV + normalisation (identiques au build) ----
function parseCsv(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") {}
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function readCsv(rel) {
  const rows = parseCsv(readFileSync(path.join(ROOT, rel), "utf-8"));
  const h = rows[0].map((x) => x.trim());
  return rows.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? "").trim()])));
}
const stripA = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
function norm(s) {
  return stripA(s).toLowerCase().replace(/\.(png|jpe?g|webp)$/i, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
// Tokens de longueur >= 2 : on GARDE les nombres de contenance (« 50 », « 30 »),
// indispensables pour distinguer deux formats d'un même produit.
function tokens(s) { return new Set(norm(s).split(" ").filter((w) => w.length >= 2)); }
function overlap(a, b) {
  const wa = tokens(a), wb = tokens(b);
  if (!wa.size || !wb.size) return 0;
  let inter = 0; for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}
// Contenance (« 210 ml », « 450 g »…) pour lever toute ambiguïté de format.
function sizeOf(s) {
  const m = norm(s).match(/\b(\d+)\s*(ml|g)\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

// ---- Données ----
const products = readCsv("data/client/assort_marque.csv");
const files = JSON.parse(readFileSync(path.join(ROOT, "data", "client", "drive_images.json"), "utf-8"))
  .filter((f) => !/family/i.test(f.n) && !/^\s*[A-Za-zÀ-ÿ.+ ]+\s+\d+\s*$/.test(f.n.replace(/\d+\s*ml|\d+\s*g|\d+\s*h/gi, ""))); // exclut "Family" et "Clinique 2/3"

// Appariement GLOUUTON GLOBAL (anti-cascade) : on note toutes les paires
// (produit, fichier) sur la « Référence complète », on filtre par concordance
// de contenance, puis on assigne des meilleures paires vers les moins bonnes.
// Un produit sans image plausible (score trop bas) reste sans image plutôt que
// de voler celle d'un autre.
const MIN_SCORE = 0.7;
const pairs = [];
products.forEach((p, pi) => {
  const ref = p["Référence complète"] || p["Référence Courte"];
  const ps = sizeOf(p["Référence complète"]) || sizeOf(p["Référence Courte"]);
  files.forEach((f, fi) => {
    const fs = sizeOf(f.n);
    if (ps && fs && ps !== fs) return; // contenances différentes -> jamais la même image
    const s = overlap(ref, f.n);
    if (s >= MIN_SCORE) pairs.push({ pi, fi, s, sizeBonus: ps && fs && ps === fs ? 1 : 0 });
  });
});
pairs.sort((a, b) => b.s + b.sizeBonus - (a.s + a.sizeBonus));
const fileByProduct = new Array(products.length).fill(null);
const usedFile = new Set();
for (const pr of pairs) {
  if (fileByProduct[pr.pi] || usedFile.has(pr.fi)) continue;
  fileByProduct[pr.pi] = files[pr.fi];
  usedFile.add(pr.fi);
}

// Télécharge (Drive thumbnail, haute résolution) puis normalise en JPEG web
// léger (côté max 1200 px, qualité 82, fond blanc) via sharp.
async function download(id) {
  const url = `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  if (raw.length < 3000) throw new Error(`trop petit (${raw.length} o)`);
  return sharp(raw)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

const imagePaths = {};
const matched = [], unmatched = [], failed = [];
for (let pi = 0; pi < products.length; pi++) {
  const p = products[pi];
  const sku = p["SKU"].trim();
  const f = fileByProduct[pi];
  if (!f) { unmatched.push(`${sku} — ${p["Référence Courte"]}`); continue; }
  try {
    const buf = await download(f.id);
    const file = `${sku}.jpg`;
    writeFileSync(path.join(OUT_DIR, file), buf);
    imagePaths[sku] = `/images/products/${file}`;
    matched.push(`${sku} ← "${f.n}" (${Math.round(buf.length / 1024)} Ko)`);
  } catch (e) {
    failed.push(`${sku} (${f.n}) : ${e.message}`);
  }
}

writeFileSync(path.join(ROOT, "data", "client", "image-paths.json"), JSON.stringify(imagePaths, null, 2) + "\n");

console.log(`Associés + téléchargés : ${matched.length}/${products.length}`);
if (unmatched.length) console.log(`\nSans image (${unmatched.length}) :\n  ` + unmatched.join("\n  "));
if (failed.length) console.log(`\nÉchecs téléchargement (${failed.length}) :\n  ` + failed.join("\n  "));
console.log(`\nDétail :\n  ` + matched.join("\n  "));
