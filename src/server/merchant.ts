import { prisma } from "@/server/prisma";
import {
  getActivePromotionForProduct,
  getActivePromotions,
  type ProductPromotion,
} from "@/server/promotions";
import {
  APPAREL_CATEGORY_IDS,
  EU_ENERGY_LABEL_SLUGS,
  GOOGLE_CATEGORY_BY_SLUG,
} from "@/lib/googleTaxonomy";
import { isValidGtin } from "@/lib/gtin";

export { GOOGLE_CATEGORY_BY_SLUG, googleCategoryPath } from "@/lib/googleTaxonomy";
export type { GoogleCategory } from "@/lib/googleTaxonomy";

// Couche de préparation des données pour Google Merchant Center.
//
// Un seul endroit produit l'enregistrement normalisé d'un produit : le flux XML,
// le flux TSV et le balisage JSON-LD de la page produit consomment tous
// `buildMerchantRecord()`. C'est la garantie que le prix, la disponibilité et les
// identifiants annoncés à Google sont rigoureusement identiques à ceux de la page,
// première cause de refus ("mismatch prix/disponibilité entre le flux et la page").
//
// Référence : Product data specification — support.google.com/merchants/answer/7052112

// ---- Paramètres de la boutique ----

/** Pays ciblé par le flux (ISO 3166-1 alpha-2). */
export const MERCHANT_COUNTRY = "FR";
/** Devise du flux (ISO 4217). Les prix stockés incluent déjà la TVA. */
export const MERCHANT_CURRENCY = "EUR";
/** Langue du contenu du flux. */
export const MERCHANT_LANGUAGE = "fr";
/**
 * Taux de TVA — déjà compris dans priceCents.
 * Le bois de chauffage vendu à un particulier relève du taux réduit de 10 %
 * (art. 278 bis du CGI). Une vente à un professionnel assujetti reste à 20 % :
 * si la boutique ouvre un canal B2B, ce taux ne pourra plus être une constante.
 */
export const MERCHANT_VAT_RATE = 0.1;

// Doivent rester alignés sur COMPANY (src/content/legal/fr.ts), qui fait
// autorité pour les mentions légales et la facture PDF.
export const SHOP_NAME = "MLC Bois";
export const SHOP_PHONE = "+33 6 35 01 35 57";

/**
 * URL publique de la boutique. Toutes les URL du flux doivent être absolues et
 * pointer vers le domaine vérifié dans Merchant Center.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mlc-bois.fr";
  return raw.replace(/\/+$/, "");
}

/** Transforme un chemin interne ("/images/x.jpg") en URL absolue. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Conditions de livraison annoncées sur la boutique (« Livraison standard
 * offerte, 3 à 5 jours ouvrés »). Ces valeurs DOIVENT rester
 * alignées sur ce qui est écrit sur le site : Google compare le flux et la page.
 *
 * Le mode express (60 €, 24–48 h) n'est volontairement pas déclaré ici : le flux
 * ne porte qu'une offre de livraison par produit, et c'est le mode par défaut —
 * donc le standard — qui doit y figurer. L'express reste proposé au panier.
 */
export const MERCHANT_SHIPPING = {
  country: MERCHANT_COUNTRY,
  service: "Livraison standard",
  /**
   * Au-dessus de ce montant, le port est offert. À zéro depuis que la boutique
   * annonce le standard gratuit sans montant minimum d'achat.
   */
  freeFromCents: 0,
  /** Préparation en un jour ouvré, acheminement en deux à quatre : 3 à 5 jours. */
  minHandlingDays: 1,
  maxHandlingDays: 1,
  minTransitDays: 2,
  maxTransitDays: 4,
} as const;

/**
 * Politique de retour annoncée (14 jours de rétractation, art. L221-18 du Code
 * de la consommation).
 * Quatorze jours correspondent au délai légal de rétractation : la boutique
 * n'accorde pas de délai contractuel au-delà.
 * `returnFees` n'est volontairement pas renseigné : le site ne précise pas qui
 * supporte les frais de retour, et Google refuse les informations inexactes.
 */
export const MERCHANT_RETURN_POLICY = {
  country: MERCHANT_COUNTRY,
  days: 14,
  /** Valeur schema.org attendue par Google. */
  category: "https://schema.org/MerchantReturnFiniteReturnWindow",
  method: "https://schema.org/ReturnByMail",
} as const;

// ---- Forme des données lues en base ----

export interface MerchantProduct {
  id: string;
  brand: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  bullets: string;
  gtin: string | null;
  mpn: string | null;
  condition: string;
  googleProductCategory: string;
  shippingWeightGrams: number | null;
  energyEfficiencyClass: string | null;
  image: string | null;
  images: string;
  priceCents: number;
  oldPriceCents: number | null;
  stock: number;
  active: boolean;
  category: {
    slug: string;
    label: string;
    description: string;
    image: string;
    group: { slug: string; label: string };
  };
  /**
   * Promotion de campagne active, attachée au chargement.
   *
   * Elle n'est pas relue au moment de composer l'enregistrement : le flux XML,
   * le flux TSV et le balisage JSON-LD appellent tous `buildMerchantRecord()`
   * de façon synchrone, et un prix promotionnel doit sortir identique des trois.
   */
  promotion?: ProductPromotion;
}

const merchantSelect = {
  id: true,
  brand: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  description: true,
  bullets: true,
  gtin: true,
  mpn: true,
  condition: true,
  googleProductCategory: true,
  shippingWeightGrams: true,
  energyEfficiencyClass: true,
  image: true,
  images: true,
  priceCents: true,
  oldPriceCents: true,
  stock: true,
  active: true,
  category: {
    select: {
      slug: true,
      label: true,
      description: true,
      image: true,
      group: { select: { slug: true, label: true } },
    },
  },
} as const;

/**
 * Charge les produits destinés au flux. Par défaut, seuls les produits actifs.
 * Les promotions de campagne en cours sont jointes ici : Google compare le prix
 * du flux à celui de la page, et la page, elle, affiche déjà le prix remisé.
 */
export async function loadMerchantProducts(
  options: { includeInactive?: boolean } = {},
): Promise<MerchantProduct[]> {
  const [rows, promotions] = await Promise.all([
    prisma.product.findMany({
      where: options.includeInactive ? undefined : { active: true },
      select: merchantSelect,
      orderBy: [{ category: { position: "asc" } }, { createdAt: "asc" }],
    }),
    getActivePromotions(),
  ]);

  return rows.map((row) => {
    const promotion = promotions.get(row.id);
    return promotion ? { ...row, promotion } : row;
  });
}

/** Charge un produit unique — utilisé par le balisage JSON-LD de la page produit. */
export async function getMerchantProductBySlug(
  slug: string,
): Promise<MerchantProduct | undefined> {
  const row = await prisma.product.findUnique({ where: { slug }, select: merchantSelect });
  if (!row) return undefined;

  const promotion = await getActivePromotionForProduct(row.id);
  return promotion ? { ...row, promotion } : row;
}

// ---- Normalisation ----

export type MerchantAvailability = "in_stock" | "out_of_stock" | "preorder" | "backorder";
export type MerchantCondition = "new" | "refurbished" | "used";

/**
 * Disponibilité déduite du seul stock, comme sur la page produit.
 * Un produit sans stock est déclaré out_of_stock : ni preorder ni backorder ne
 * sont utilisés faute de date d'expédition annoncée (Google l'exige alors).
 */
export function availabilityFor(stock: number): MerchantAvailability {
  return stock > 0 ? "in_stock" : "out_of_stock";
}

/** Valeur de condition normalisée ; toute valeur inconnue retombe sur "new". */
export function conditionFor(value: string): MerchantCondition {
  return value === "refurbished" || value === "used" ? value : "new";
}

/** Prix au format attendu par Google : point décimal puis code ISO 4217. */
export function formatFeedPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} ${MERCHANT_CURRENCY}`;
}

/**
 * Promotion qui fait réellement baisser le prix de l'article. Une campagne
 * « livraison offerte » n'en est pas une : elle ne touche pas au montant de la
 * ligne, et la page produit garde alors son prix barré éditorial.
 */
function priceCuttingPromotion(product: MerchantProduct): ProductPromotion | undefined {
  const promotion = product.promotion;
  return promotion && promotion.savingCents > 0 ? promotion : undefined;
}

/**
 * Prix effectivement affiché dans le bloc d'achat, et donc facturé.
 * Une campagne en cours prime sur le prix catalogue.
 */
export function merchantEffectivePriceCents(product: MerchantProduct): number {
  return priceCuttingPromotion(product)?.priceCents ?? product.priceCents;
}

/**
 * Prix de référence, celui qui s'affiche barré. Pendant une campagne c'est le
 * prix figé à l'entrée du produit dans la campagne — celui annoncé dans le
 * message —, sinon l'ancien prix éditorial de la fiche. À défaut des deux, le
 * prix courant : il n'y a alors pas de promotion à déclarer.
 */
export function merchantReferencePriceCents(product: MerchantProduct): number {
  const promotion = priceCuttingPromotion(product);
  if (promotion) return promotion.basePriceCents;
  return product.oldPriceCents ?? product.priceCents;
}

/** Poids d'expédition au format « 12.50 kg » (ou en grammes sous le kilo). */
export function formatShippingWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`;
}

function parseBullets(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Retire tout balisage et normalise les espaces : le flux n'accepte que du texte. */
function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Identifiant de l'offre : unique, stable, 50 caractères au maximum. */
export function merchantOfferId(product: MerchantProduct): string {
  // Le SKU interne n'est pas unique (troncature à 10 caractères) : on part du
  // slug, qui l'est par construction, et on borne la longueur à 50 caractères.
  if (product.slug.length <= 50) return product.slug;
  return `${product.slug.slice(0, 41)}-${product.id.slice(-8)}`;
}

/** URL publique de la fiche produit (le français vit à la racine du site). */
export function merchantProductUrl(product: MerchantProduct): string {
  return `${siteUrl()}/${product.category.group.slug}/${product.category.slug}/${product.slug}`;
}

/** Image principale : celle du produit, à défaut celle de la catégorie. */
export function merchantImageUrl(product: MerchantProduct): string {
  const source = product.image?.trim() || product.category.image.trim();
  return source ? absoluteUrl(source) : "";
}

/** Google accepte jusqu'à 10 vues complémentaires ; l'image principale en est exclue. */
const ADDITIONAL_IMAGE_LIMIT = 10;

export function merchantAdditionalImageUrls(product: MerchantProduct): string[] {
  const main = merchantImageUrl(product);

  try {
    const parsed = JSON.parse(product.images) as unknown;
    if (!Array.isArray(parsed)) return [];

    const urls = parsed
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .map((entry) => absoluteUrl(entry))
      .filter((url) => url && url !== main);

    return [...new Set(urls)].slice(0, ADDITIONAL_IMAGE_LIMIT);
  } catch {
    return [];
  }
}

/** Titre du flux — doit correspondre au titre affiché sur la page produit. */
export function merchantTitle(product: MerchantProduct): string {
  return plainText(`${product.brand} ${product.name}`).slice(0, 150);
}

/**
 * Description du flux. La description saisie prime toujours ; sinon on compose un
 * texte factuel à partir des données réelles de la fiche. Aucune mention
 * promotionnelle (« gratuit », « meilleur prix ») : Google les refuse.
 */
export function merchantDescription(product: MerchantProduct): string {
  const own = plainText(product.description) || plainText(product.shortDescription);
  if (own.length >= 80) return own.slice(0, 5000);

  const bullets = parseBullets(product.bullets);
  const parts = [
    `${product.brand} ${product.name} — ${product.category.label} par ${product.brand}.`,
    plainText(product.category.description),
    bullets.length > 0 ? `Caractéristiques : ${bullets.join(", ")}.` : "",
    conditionFor(product.condition) === "new" ? "État : neuf, jamais utilisé." : "",
    own,
  ];

  return plainText(parts.filter(Boolean).join(" ")).slice(0, 5000);
}

/** Fil d'Ariane interne, repris dans product_type. */
export function merchantProductType(product: MerchantProduct): string {
  return `${product.category.group.label} > ${product.category.label}`.slice(0, 750);
}

/** Catégorie Google : celle saisie sur la fiche, à défaut celle de la catégorie. */
export function merchantGoogleCategory(product: MerchantProduct): string {
  const own = product.googleProductCategory.trim();
  if (own) return own;
  return GOOGLE_CATEGORY_BY_SLUG[product.category.slug]?.id ?? "";
}

export interface MerchantShippingEntry {
  country: string;
  service: string;
  price: string;
  minHandlingTime: number;
  maxHandlingTime: number;
  minTransitTime: number;
  maxTransitTime: number;
}

/**
 * Frais de port du produit. Au-dessus du seuil annoncé sur la boutique, le port
 * est offert et déclaré à 0,00 €. En dessous, aucun bloc n'est émis : ce sont les
 * règles de livraison du compte Merchant Center qui s'appliquent, plutôt qu'un
 * montant inventé.
 *
 * Le seuil se mesure sur le prix réellement demandé : une remise qui fait passer
 * l'article sous les 50 € lui fait aussi perdre le franco de port, comme dans le
 * panier. Une campagne « livraison offerte » l'accorde en revanche sans condition.
 */
export function merchantShipping(product: MerchantProduct): MerchantShippingEntry | undefined {
  const granted = product.promotion?.freeShipping === true;
  if (!granted && merchantEffectivePriceCents(product) < MERCHANT_SHIPPING.freeFromCents) {
    return undefined;
  }
  return {
    country: MERCHANT_SHIPPING.country,
    service: MERCHANT_SHIPPING.service,
    price: formatFeedPrice(0),
    minHandlingTime: MERCHANT_SHIPPING.minHandlingDays,
    maxHandlingTime: MERCHANT_SHIPPING.maxHandlingDays,
    minTransitTime: MERCHANT_SHIPPING.minTransitDays,
    maxTransitTime: MERCHANT_SHIPPING.maxTransitDays,
  };
}

// ---- Enregistrement complet ----

export interface MerchantRecord {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  /** Vues complémentaires — attribut additional_image_link, 10 au maximum chez Google. */
  additionalImageLinks: string[];
  availability: MerchantAvailability;
  /** Prix de référence ; en promotion, c'est l'ancien prix barré de la page. */
  price: string;
  /** Prix remisé, présent uniquement lorsqu'un ancien prix plus élevé existe. */
  salePrice?: string;
  /**
   * Période de validité du prix remisé, au format « début/fin » exigé par
   * Google. Sans elle, un `sale_price` est réputé sans terme : la remise
   * resterait annoncée dans les résultats jusqu'à la prochaine lecture du flux,
   * alors que la boutique est déjà revenue au prix plein. Renseignée seulement
   * quand la remise vient d'une campagne, qui seule connaît ses dates.
   */
  salePriceEffectiveDate?: string;
  brand: string;
  gtin?: string;
  mpn?: string;
  /** "no" seulement lorsque ni GTIN ni MPN ne sont disponibles. */
  identifierExists?: "no";
  condition: MerchantCondition;
  adult: "no";
  isBundle: "no";
  googleProductCategory?: string;
  productType: string;
  productHighlights: string[];
  shipping?: MerchantShippingEntry;
  shippingWeight?: string;
  shipsFromCountry: string;
  /** Ne vaut plus que pour CH/NO/UK ; dans l'UE, Google attend certification/EPREL. */
  energyEfficiencyClass?: string;
  ageGroup?: string;
  gender?: string;
  customLabel0: string;
  customLabel1?: string;
  /** Prix valable jusqu'à cette date (ISO 8601), utile au balisage JSON-LD. */
  priceValidUntil: string;
}

/**
 * Date de validité du prix : un an, renouvelée à chaque génération du flux.
 * Une campagne la ramène à sa date de fin — au-delà, le prix annoncé n'est plus
 * celui de la boutique, et un `priceValidUntil` trop lointain sur un prix promo
 * est exactement le genre d'incohérence qui fait refuser une fiche.
 */
/**
 * Fenêtre du prix promotionnel, au format d'intervalle ISO 8601 attendu par
 * Google : « début/fin ». Absente quand la remise ne vient pas d'une campagne
 * — un ancien prix saisi à la main dans la fiche produit n'a pas de terme
 * connu, et inventer une date de fin serait pire que de n'en donner aucune.
 */
function salePriceWindow(promotion?: ProductPromotion): string | undefined {
  if (!promotion) return undefined;
  return `${promotion.startsAt.toISOString()}/${promotion.endsAt.toISOString()}`;
}

function priceValidUntil(promotion?: ProductPromotion): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const horizon = promotion && promotion.endsAt < date ? promotion.endsAt : date;
  return horizon.toISOString().slice(0, 10);
}

/** Transforme un produit en enregistrement conforme à la spécification Google. */
export function buildMerchantRecord(product: MerchantProduct): MerchantRecord {
  const gtin = product.gtin?.replace(/\D/g, "") || undefined;
  const mpn = product.mpn?.trim() || undefined;
  // Une campagne en cours l'emporte sur l'ancien prix éditorial : c'est elle que
  // la page produit affiche, et le flux doit dire la même chose.
  const currentPriceCents = merchantEffectivePriceCents(product);
  const referencePriceCents = merchantReferencePriceCents(product);
  const onSale = referencePriceCents > currentPriceCents;
  const googleCategory = merchantGoogleCategory(product);
  const isApparel = APPAREL_CATEGORY_IDS.has(googleCategory);

  return {
    id: merchantOfferId(product),
    title: merchantTitle(product),
    description: merchantDescription(product),
    link: merchantProductUrl(product),
    imageLink: merchantImageUrl(product),
    additionalImageLinks: merchantAdditionalImageUrls(product),
    availability: availabilityFor(product.stock),
    // En promotion, price porte le prix barré et sale_price le prix affiché :
    // c'est exactement ce que montre le bloc d'achat de la page produit.
    price: formatFeedPrice(onSale ? referencePriceCents : currentPriceCents),
    salePrice: onSale ? formatFeedPrice(currentPriceCents) : undefined,
    salePriceEffectiveDate: onSale
      ? salePriceWindow(priceCuttingPromotion(product))
      : undefined,
    brand: product.brand.slice(0, 70),
    gtin,
    mpn: mpn?.slice(0, 70),
    identifierExists: !gtin && !mpn ? "no" : undefined,
    condition: conditionFor(product.condition),
    adult: "no",
    isBundle: "no",
    googleProductCategory: googleCategory || undefined,
    productType: merchantProductType(product),
    // Google demande entre 2 et 100 valeurs, 150 caractères chacune.
    productHighlights: parseBullets(product.bullets)
      .map((bullet) => bullet.slice(0, 150))
      .slice(0, 10),
    shipping: merchantShipping(product),
    shippingWeight:
      product.shippingWeightGrams && product.shippingWeightGrams > 0
        ? formatShippingWeight(product.shippingWeightGrams)
        : undefined,
    shipsFromCountry: MERCHANT_COUNTRY,
    energyEfficiencyClass: product.energyEfficiencyClass?.trim() || undefined,
    ageGroup: isApparel ? "adult" : undefined,
    gender: isApparel ? "unisex" : undefined,
    customLabel0: product.category.group.label,
    customLabel1: onSale ? "Promotion" : undefined,
    priceValidUntil: priceValidUntil(priceCuttingPromotion(product)),
  };
}

// ---- Contrôle de conformité ----

export type MerchantIssueLevel = "error" | "warning";

export interface MerchantIssue {
  level: MerchantIssueLevel;
  /** Nom de l'attribut Google concerné. */
  attribute: string;
  /** Message affiché dans le back-office, en français. */
  message: string;
}

export interface MerchantAudit {
  productId: string;
  slug: string;
  title: string;
  brand: string;
  sku: string;
  categoryLabel: string;
  href: string;
  adminHref: string;
  active: boolean;
  issues: MerchantIssue[];
  /** Aucun blocage : le produit peut partir en campagne Shopping. */
  ready: boolean;
}

const MIN_DESCRIPTION_LENGTH = 160;
const MIN_TITLE_LENGTH = 15;

/**
 * Passe un produit au crible de la spécification Google et des causes de refus
 * les plus fréquentes. `error` = le produit sera refusé ou invisible.
 * `warning` = risque de refus ou de performance dégradée.
 */
export function auditMerchantProduct(
  product: MerchantProduct,
  context: { duplicateOfferId?: boolean } = {},
): MerchantAudit {
  const record = buildMerchantRecord(product);
  const issues: MerchantIssue[] = [];

  // -- Attributs obligatoires --
  if (!record.imageLink) {
    issues.push({
      level: "error",
      attribute: "image_link",
      message: "Aucune image produit ni image de catégorie enregistrée — Google refuse l'offre.",
    });
  } else if (!product.image?.trim()) {
    issues.push({
      level: "warning",
      attribute: "image_link",
      message:
        "Pas d'image propre au produit : l'image de la catégorie est utilisée. Google considère les images réutilisées comme des images de remplacement et peut refuser l'offre.",
    });
  }

  if (record.title.length < MIN_TITLE_LENGTH) {
    issues.push({
      level: "warning",
      attribute: "title",
      message: `Titre très court (${record.title.length} caractères) — ajouter l'essence, la longueur de bûche et le conditionnement.`,
    });
  }

  if (record.description.length < MIN_DESCRIPTION_LENGTH) {
    issues.push({
      level: "warning",
      attribute: "description",
      message: `Description trop courte (${record.description.length} caractères) — au moins ${MIN_DESCRIPTION_LENGTH} sont recommandés.`,
    });
  }

  if (product.priceCents <= 0) {
    issues.push({
      level: "error",
      attribute: "price",
      message: "Prix manquant ou égal à 0 — l'offre est refusée.",
    });
  }

  if (product.oldPriceCents !== null && product.oldPriceCents <= product.priceCents) {
    issues.push({
      level: "warning",
      attribute: "sale_price",
      message:
        "L'ancien prix n'est pas supérieur au prix actuel. Il n'est pas transmis comme prix barré et devrait être retiré de la fiche produit.",
    });
  }

  if (record.availability === "out_of_stock") {
    issues.push({
      level: "warning",
      attribute: "availability",
      message:
        "Stock à 0 : le produit est transmis en out_of_stock et n'apparaît pas dans les annonces Shopping.",
    });
  }

  if (!product.brand.trim()) {
    issues.push({
      level: "error",
      attribute: "brand",
      message: "Marque manquante — c'est un attribut obligatoire pour les articles neufs.",
    });
  }

  // -- Identifiants uniques --
  //
  // Google accepte explicitement `identifier_exists=no` dans trois cas : produit
  // de marque de distributeur ou fabriqué par le seul vendeur, produit
  // artisanal ou personnalisé, et **lot composé par le revendeur** — ce qu'est
  // une palette de 66 sacs assemblée en boutique. C'est le cas de tout ce
  // catalogue.
  // Voir support.google.com/merchants/answer/160161.
  //
  // L'absence d'identifiant n'est donc pas un motif de refus ici, seulement une
  // perte de portée : le niveau est « avertissement », et le message dit ce
  // qu'il y a réellement à faire selon que la marque est la nôtre ou celle d'un
  // fournisseur.
  if (!record.gtin && !record.mpn) {
    const marquePropre = product.brand.trim().toLowerCase() === SHOP_NAME.toLowerCase();
    issues.push({
      level: "warning",
      attribute: "gtin / mpn",
      message: marquePropre
        ? "Ni GTIN ni MPN. Le flux part en identifier_exists=no, ce que Google admet pour une marque propre — mais attribuer une référence fabricant (un code interne stable de votre choix) élargit nettement la diffusion."
        : "Ni GTIN ni MPN. Le flux part en identifier_exists=no, admis pour un lot composé en boutique. Demandez au fournisseur l'EAN de l'unité vendue — celui de la palette, pas celui du sac — pour gagner en portée. N'inventez jamais de code : un GTIN fabriqué fait suspendre le compte.",
    });
  } else if (!record.gtin) {
    issues.push({
      level: "warning",
      attribute: "gtin",
      message:
        "Pas de GTIN (EAN du code-barres). Marque + MPN remplissent l'exigence minimale, mais la portée est nettement supérieure avec un GTIN.",
    });
  }

  // Les MPN posés par le script d'enrichissement reprennent la désignation de
  // modèle contenue dans le nom : utilisable, mais à remplacer par la référence
  // exacte du fabricant.
  if (record.mpn && product.name.includes(record.mpn)) {
    issues.push({
      level: "warning",
      attribute: "mpn",
      message:
        "Le MPN a été déduit du nom du produit. Remplacez-le par la référence exacte du fabricant figurant sur la plaque signalétique.",
    });
  }

  if (product.gtin?.trim() && !isValidGtin(product.gtin.replace(/\D/g, ""))) {
    issues.push({
      level: "error",
      attribute: "gtin",
      message:
        "Le GTIN n'est pas valide (longueur 8, 12, 13 ou 14 chiffres et clé de contrôle correcte attendues). Un GTIN erroné entraîne le refus du compte.",
    });
  }

  if (context.duplicateOfferId) {
    issues.push({
      level: "error",
      attribute: "id",
      message: "L'identifiant d'offre est utilisé par un autre produit — les identifiants doivent être uniques.",
    });
  }

  // -- Classification --
  if (!record.googleProductCategory) {
    issues.push({
      level: "error",
      attribute: "google_product_category",
      message: "Aucune catégorie produit Google associée.",
    });
  }

  // -- Livraison --
  if (!record.shipping) {
    issues.push({
      level: "warning",
      attribute: "shipping",
      message:
        "Prix en dessous du seuil de livraison offerte : aucuns frais de port ne sont transmis dans le flux. Des règles de livraison pour la France doivent alors être définies dans le Merchant Center.",
    });
  }

  if (!record.shippingWeight) {
    issues.push({
      level: "warning",
      attribute: "shipping_weight",
      message: "Poids d'expédition manquant — sans poids, impossible d'utiliser des règles de livraison basées sur le poids.",
    });
  }

  // -- Étiquette énergie (UE) --
  if (EU_ENERGY_LABEL_SLUGS.has(product.category.slug)) {
    issues.push({
      level: "warning",
      attribute: "certification",
      message:
        "Appareil soumis à l'étiquetage énergétique : pour l'UE, Google attend le numéro d'enregistrement EPREL dans l'attribut certification (EC/EPREL/numéro). Sans GTIN, Google ne peut pas le compléter automatiquement.",
    });
  }

  // -- Champs obligatoires du textile (les montres connectées relèvent des bijoux dans la taxonomie) --
  if (record.ageGroup) {
    issues.push({
      level: "warning",
      attribute: "color / size",
      message:
        "La catégorie Google associée relève de « Vêtements et accessoires ». Pour la France, Google y exige en plus color et size.",
    });
  }

  if (!product.active) {
    issues.push({
      level: "warning",
      attribute: "—",
      message: "Le produit est désactivé et n'est pas repris dans le flux.",
    });
  }

  return {
    productId: product.id,
    slug: product.slug,
    title: record.title,
    brand: product.brand,
    sku: product.sku,
    categoryLabel: `${product.category.group.label} › ${product.category.label}`,
    href: record.link,
    adminHref: `/admin/products/${product.id}`,
    active: product.active,
    issues,
    ready: issues.every((issue) => issue.level !== "error"),
  };
}

export interface MerchantOverview {
  audits: MerchantAudit[];
  total: number;
  ready: number;
  blocked: number;
  withWarnings: number;
  /** Nombre de produits sans GTIN — à compléter par le commerçant. */
  missingGtin: number;
  missingMpn: number;
  missingOwnImage: number;
  feedCount: number;
}

/** Contrôle l'ensemble du catalogue, produits désactivés compris. */
export async function auditCatalog(): Promise<MerchantOverview> {
  const products = await loadMerchantProducts({ includeInactive: true });

  // Les identifiants d'offre en double font refuser le flux entier.
  const seen = new Map<string, number>();
  for (const product of products) {
    const offerId = merchantOfferId(product);
    seen.set(offerId, (seen.get(offerId) ?? 0) + 1);
  }

  const audits = products.map((product) =>
    auditMerchantProduct(product, {
      duplicateOfferId: (seen.get(merchantOfferId(product)) ?? 0) > 1,
    }),
  );

  return {
    audits,
    total: audits.length,
    ready: audits.filter((audit) => audit.ready).length,
    blocked: audits.filter((audit) => !audit.ready).length,
    withWarnings: audits.filter((audit) => audit.ready && audit.issues.length > 0).length,
    missingGtin: products.filter((product) => !product.gtin?.trim()).length,
    missingMpn: products.filter((product) => !product.mpn?.trim()).length,
    missingOwnImage: products.filter((product) => !product.image?.trim()).length,
    feedCount: products.filter((product) => product.active).length,
  };
}
