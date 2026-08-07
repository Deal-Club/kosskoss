// Construit le catalogue KossKoss réel à partir des 2 exports client :
//   data/client/assort_marque.csv       (SKU, prix, catégorie, action, type de peau)
//   data/client/description_produit.csv  (format, problème ciblé, bénéfices, usage)
// Sortie : prisma/data/kk-catalog.json (consommé par prisma/seed-kk.ts).
//
// Node pur (aucune dépendance). Lancement : node scripts/build-kk-catalog.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ---- Parsing CSV (RFC 4180 : guillemets, virgules et retours dans un champ) ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* ignore */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function readCsv(rel) {
  const rows = parseCsv(readFileSync(path.join(ROOT, rel), "utf-8"));
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ---- Normalisation ----
function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function norm(s) {
  return stripAccents((s || "").toLowerCase())
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function slugify(s) {
  return stripAccents((s || "").toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
function baseBrand(b) {
  return b.replace(/\s*\((men|homme)\)\s*/i, "").replace(/\s+(for men|homme|uomo|\(men\))\s*$/i, "").trim();
}
function priceToFcfa(s) {
  const digits = (s || "").replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

// ---- Mapping catégories -> slug + univers ----
const CATEGORY_MAP = {
  Nettoyant: { slug: "nettoyants", label: "Nettoyants", labelEn: "Cleansers", group: "soins-visage", base: "nettoyage" },
  Toner: { slug: "toniques", label: "Toniques", labelEn: "Toners", group: "soins-visage", base: "toner" },
  Traitement: { slug: "traitements", label: "Sérums & Traitements", labelEn: "Serums & Treatments", group: "soins-visage", base: "traitement" },
  Hydratant: { slug: "hydratants", label: "Hydratants", labelEn: "Moisturizers", group: "soins-visage", base: "hydratation" },
  Protection: { slug: "solaires", label: "Solaires", labelEn: "Sun care", group: "soins-visage", base: "solaire" },
  Corps: { slug: "corps", label: "Soins du corps", labelEn: "Body care", group: "corps-hygiene", base: "corps" },
  "Hygiène": { slug: "hygiene", label: "Hygiène", labelEn: "Hygiene", group: "corps-hygiene", base: "hygiene" },
  Homme: { slug: "homme", label: "Homme", labelEn: "Men", group: "homme", base: "homme" },
};

const GROUPS = [
  { slug: "soins-visage", label: "Soins du visage", labelEn: "Facial care" },
  { slug: "corps-hygiene", label: "Corps & Hygiène", labelEn: "Body & Hygiene" },
  { slug: "homme", label: "Homme", labelEn: "Men" },
];

// ---- Dérivation des tags du Diagnostic Beauté ----
// Vocabulaire aligné sur src/lib/kk/diagnostic.ts.
function skinTags(typeDePeau) {
  const t = norm(typeDePeau);
  const out = new Set();
  if (/\bsec\b|tres sec|seche/.test(t)) out.add("peau_seche");
  if (/gras|grasse/.test(t)) out.add("peau_grasse");
  if (/mixte/.test(t)) out.add("peau_mixte");
  if (/sensible/.test(t)) out.add("peau_sensible");
  if (/mature/.test(t)) out.add("anti_age");
  if (/acne/.test(t)) out.add("imperfections");
  if (/homme/.test(t)) out.add("homme");
  // « Tous types » : aucun tag de type de peau, pour que le produit reste
  // éligible quelle que soit la réponse au diagnostic (il matche alors sur les
  // tags de préoccupation/bénéfice), sans être biaisé vers un type précis.
  return [...out];
}
function benefitTags(text) {
  const t = norm(text);
  const out = new Set();
  if (/tache|pigment|eclat|glow|lumineu|illumin|unifi|clarte|teint/.test(t)) out.add("eclat");
  // « taches » distingue l'hyperpigmentation de l'éclat en général : un soin
  // qui ravive le teint n'est pas forcément un correcteur de taches. C'est la
  // première préoccupation des peaux riches en mélanine, et une question à
  // part entière du diagnostic — sans ce tag, elle n'aurait rien à cibler.
  if (/tache|hyperpigment|depigment|melasma|dark ?spot|anti-?pigment|unifiant/.test(t)) out.add("taches");
  if (/acne|imperfection|bouton|point noir|anti-?blemish|blemish/.test(t)) out.add("imperfections");
  if (/sebum|matifi|brillance|anti-?brillance/.test(t)) out.add("matifiant");
  if (/hydrat|repulp|hyaluron|hydro/.test(t)) out.add("hydratation");
  if (/anti-?age|rides|ridules|fermete|retinol|jeuness|peptide/.test(t)) out.add("anti_age");
  if (/apais|rougeur|sensib|calme|irritation|panthenol|centella|barriere/.test(t)) out.add("apaisant");
  if (/solaire|spf|uv|soleil/.test(t)) out.add("solaire");
  return [...out];
}

// ---- Chargement ----
const assort = readCsv("data/client/assort_marque.csv");
const descriptions = readCsv("data/client/description_produit.csv");

// Chemins d'images produits (SKU -> /images/products/<sku>.<ext>), générés par
// scripts/fetch-kk-images.mjs. Optionnel : absent = catalogue sans images.
let imagePaths = {};
try {
  imagePaths = JSON.parse(readFileSync(path.join(ROOT, "data", "client", "image-paths.json"), "utf-8"));
} catch { /* pas encore d'images */ }

// Index des descriptions par (marque de base normalisée + mots-clés du nom).
const descIndex = descriptions.map((d) => ({
  brand: norm(baseBrand(d["Marque"])),
  name: norm(d["Nom produit FR"]),
  format: d["Format"],
  zone: d["Type de peau / zone"],
  probleme: d["Problème ciblé"],
  benefices: [d["Bénéfice 1"], d["Bénéfice 2"], d["Bénéfice 3"]].map((x) => (x || "").trim()).filter(Boolean),
  usage: d["Comment l'utiliser"],
  used: false,
}));

// Score de recouvrement lexical entre deux noms normalisés.
function overlap(a, b) {
  const wa = new Set(a.split(" ").filter((w) => w.length > 2));
  const wb = new Set(b.split(" ").filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}

// Produits nommés en français côté assortiment mais en anglais côté
// description : recouvrement lexical nul, on les apparie explicitement par SKU.
const ALIAS_BY_SKU = {
  "CLI-EXF-SCR-100": "exfoliating scrub",
  "CLI-MEN-WAS-200": "oil control face wash",
  "CLI-MEN-MOI-100": "oil control moisturizer",
  "DE-BGO-DRO-30": "b goldi bright drops",
  "DE-BES-CLE-60": "beste n 9 jelly cleanser",
};

function matchDescription(sku, brand, name) {
  const nb = norm(baseBrand(brand));
  const nn = norm(name);
  let best = null;
  let bestScore = 0;
  for (const d of descIndex) {
    if (d.used) continue;
    if (d.brand !== nb) continue;
    const s = overlap(nn, d.name);
    if (s > bestScore) { bestScore = s; best = d; }
  }
  if (best && bestScore >= 0.34) { best.used = true; return best; }

  const alias = ALIAS_BY_SKU[sku];
  if (alias) {
    const hit = descIndex.find((d) => !d.used && d.brand === nb && d.name === alias);
    if (hit) { hit.used = true; return hit; }
  }
  return null;
}

// ---- Construction des produits ----
const usedSlugs = new Set();
function uniqueSlug(base) {
  let s = base || "produit";
  let i = 2;
  while (usedSlugs.has(s)) s = `${base}-${i++}`;
  usedSlugs.add(s);
  return s;
}

const products = [];
const unmatched = [];
for (const r of assort) {
  const rawCat = r["Catégorie"];
  const cat = CATEGORY_MAP[rawCat];
  if (!cat) { unmatched.push({ sku: r["SKU"], reason: `catégorie inconnue: ${rawCat}` }); continue; }
  const brand = baseBrand(r["Marque"]);
  const name = r["Référence Courte"] || r["Référence complète"];
  const price = priceToFcfa(r["PVP (FCFA)"]);
  const action = r["Action Principale"];
  const typePeau = r["Type de Peau"];
  const desc = matchDescription(r["SKU"].trim(), r["Marque"], name);

  // Tags : base catégorie + peau + bénéfices (action + problème + nom).
  const tagSet = new Set([cat.base]);
  skinTags(typePeau).forEach((t) => tagSet.add(t));
  if (/\(men\)|homme|uomo|for men/i.test(r["Marque"])) tagSet.add("homme");
  benefitTags([action, name, desc?.probleme, ...(desc?.benefices ?? [])].join(" ")).forEach((t) => tagSet.add(t));
  if (price >= 40000) tagSet.add("premium");
  if (price > 0 && price <= 10000) tagSet.add("budget_eco");

  const format = (desc?.format || "").trim();
  const bullets = [];
  if (desc?.benefices?.length) bullets.push(...desc.benefices);
  else if (action) bullets.push(action);
  if (format && format.toLowerCase() !== "set") bullets.push(`Contenance : ${format}`);
  if (typePeau) bullets.push(`Idéal pour : ${typePeau}`);

  let longDesc;
  if (desc) {
    const parts = [];
    if (desc.zone) parts.push(desc.zone.replace(/\s*[-–]\s*/g, " — ").replace(/\.+$/, "") + ".");
    if (desc.probleme) parts.push(`Cible : ${desc.probleme}.`);
    if (desc.benefices.length) parts.push(desc.benefices.join(". ") + ".");
    if (desc.usage) parts.push(`Conseil d'utilisation : ${desc.usage}.`);
    longDesc = parts.join(" ").replace(/\.\./g, ".").trim();
  } else {
    longDesc = [action ? `${action}.` : "", typePeau ? `Idéal pour : ${typePeau}.` : ""].join(" ").trim();
  }

  products.push({
    slug: uniqueSlug(slugify(`${brand}-${name}`)),
    sku: r["SKU"].trim(),
    category: cat.slug,
    brand,
    name: name.trim(),
    priceFcfa: price,
    short: (action || desc?.probleme || "").trim(),
    desc: longDesc,
    bullets: [...new Set(bullets.map((b) => b.trim()).filter(Boolean))],
    tags: [...tagSet],
    image: imagePaths[r["SKU"].trim()] || "",
    matchedDescription: Boolean(desc),
  });
}

// Catégories réellement présentes, dans l'ordre des univers.
const presentCatSlugs = new Set(products.map((p) => p.category));
const CATEGORIES = Object.values(CATEGORY_MAP)
  .filter((c) => presentCatSlugs.has(c.slug))
  .filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i)
  .map((c) => ({ slug: c.slug, group: c.group, label: c.label, labelEn: c.labelEn }));

const presentGroups = new Set(CATEGORIES.map((c) => c.group));
const groupsOut = GROUPS.filter((g) => presentGroups.has(g.slug));

const out = { groups: groupsOut, categories: CATEGORIES, products };
mkdirSync(path.join(ROOT, "prisma", "data"), { recursive: true });
writeFileSync(path.join(ROOT, "prisma", "data", "kk-catalog.json"), JSON.stringify(out, null, 2) + "\n", "utf-8");

// ---- Rapport ----
const withImage = products.filter((p) => p.image).length;
console.log(`Images associées : ${withImage}/${products.length}`);
const matched = products.filter((p) => p.matchedDescription).length;
const unusedDesc = descIndex.filter((d) => !d.used);
console.log(`Produits : ${products.length}`);
console.log(`Descriptions riches associées : ${matched}/${products.length}`);
console.log(`Catégories : ${CATEGORIES.map((c) => c.slug).join(", ")}`);
console.log(`Univers : ${groupsOut.map((g) => g.slug).join(", ")}`);
if (unmatched.length) console.log("SKU sans catégorie :", unmatched);
if (unusedDesc.length) console.log(`Descriptions non appariées (${unusedDesc.length}) :`, unusedDesc.map((d) => `${d.brand} / ${d.name}`));
const noDesc = products.filter((p) => !p.matchedDescription).map((p) => `${p.brand} / ${p.name}`);
if (noDesc.length) console.log(`Produits sans description riche (${noDesc.length}) :`, noDesc);
