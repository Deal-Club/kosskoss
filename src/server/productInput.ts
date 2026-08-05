import { toCents } from "@/server/pricingUtils";
import type { VariantInput } from "@/lib/variantPricing";
import type { ProductRecord } from "@/server/types";
import { isValidGtin } from "@/lib/gtin";

// Validation commune des champs produit, partagée par les routes unitaires et
// l'import en masse. Les messages sont en français : ils s'affichent dans le back-office.

export const SHORT_DESCRIPTION_MAX = 200;

/** Garde-fou : au-delà, la galerie devient une charge de chargement inutile. */
export const GALLERY_IMAGES_MAX = 8;

/** Chemin interne (« /uploads/… ») ou URL absolue, les deux seules formes que next/image accepte ici. */
function isValidImagePath(value: string): boolean {
  return value.startsWith("/") || /^https?:\/\//.test(value);
}

export type ProductInput = Partial<Omit<ProductRecord, "id">>;

export interface ProductInputResult {
  values: ProductInput;
  errors: string[];
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asInteger(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isInteger(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Contrôle un objet brut (corps JSON ou ligne de CSV) et ne renvoie que les
 * champs réellement transmis : en mode « update », le reste n'est pas touché.
 */
export function parseProductInput(raw: unknown, mode: "create" | "update"): ProductInputResult {
  const errors: string[] = [];
  const values: ProductInput = {};

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { values, errors: ["Données invalides."] };
  }
  const body = raw as Record<string, unknown>;
  const has = (key: string) => body[key] !== undefined;

  // ---- Champs obligatoires ----
  const categoryId = asTrimmedString(body.categoryId);
  if (mode === "create" || has("categoryId")) {
    if (!categoryId) errors.push("Catégorie (categoryId) manquante.");
    else if (!categoryId.includes("/")) errors.push('La catégorie doit être de la forme « univers/slug ».');
    else values.categoryId = categoryId;
  }

  const brand = asTrimmedString(body.brand);
  if (mode === "create" || has("brand")) {
    if (!brand) errors.push("Marque (brand) manquante.");
    else values.brand = brand;
  }

  const name = asTrimmedString(body.name);
  if (mode === "create" || has("name")) {
    if (!name) errors.push("Nom manquant.");
    else values.name = name;
  }

  const price = asTrimmedString(body.price);
  if (mode === "create" || has("price")) {
    if (!price) errors.push("Prix manquant.");
    else if (toCents(price) <= 0) errors.push('Prix invalide (exemple : « 349,00 € »).');
    else values.price = price;
  }

  // ---- Champs facultatifs ----
  if (has("oldPrice")) {
    const oldPrice = asTrimmedString(body.oldPrice) ?? "";
    if (oldPrice && toCents(oldPrice) <= 0) {
      errors.push('Ancien prix invalide (exemple : « 449,00 € »).');
    } else {
      values.oldPrice = oldPrice;
    }
  }

  if (has("badge")) {
    values.badge = asTrimmedString(body.badge) ?? "";
  }

  if (has("image")) {
    const image = asTrimmedString(body.image) ?? "";
    if (image && !isValidImagePath(image)) {
      errors.push('Le chemin de l\'image doit commencer par « / » ou « http ».');
    } else {
      values.image = image;
    }
  }

  if (has("images")) {
    const rawImages = body.images;
    if (rawImages === null || rawImages === "") {
      values.images = [];
    } else if (Array.isArray(rawImages)) {
      const cleaned = rawImages.map((item) => String(item).trim()).filter(Boolean);
      const invalid = cleaned.filter((entry) => !isValidImagePath(entry));

      if (invalid.length > 0) {
        errors.push('Chaque image de la galerie doit commencer par « / » ou « http ».');
      } else if (cleaned.length > GALLERY_IMAGES_MAX) {
        errors.push(`La galerie accepte au maximum ${GALLERY_IMAGES_MAX} images.`);
      } else {
        // Un même visuel deux fois ferait deux miniatures identiques
        values.images = [...new Set(cleaned)];
      }
    } else if (typeof rawImages === "string") {
      // L'import CSV fournit la galerie sous la forme « /a.jpg|/b.jpg »
      const cleaned = rawImages
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
      const invalid = cleaned.filter((entry) => !isValidImagePath(entry));

      if (invalid.length > 0) {
        errors.push('Chaque image de la galerie doit commencer par « / » ou « http ».');
      } else if (cleaned.length > GALLERY_IMAGES_MAX) {
        errors.push(`La galerie accepte au maximum ${GALLERY_IMAGES_MAX} images.`);
      } else {
        values.images = [...new Set(cleaned)];
      }
    } else {
      errors.push("Les images de la galerie doivent être une liste.");
    }
  }

  if (has("bullets")) {
    const rawBullets = body.bullets;
    if (Array.isArray(rawBullets)) {
      values.bullets = rawBullets.map((item) => String(item).trim()).filter(Boolean);
    } else if (typeof rawBullets === "string") {
      // Le CSV fournit les caractéristiques sous la forme « A|B|C »
      values.bullets = rawBullets
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      errors.push("Les caractéristiques (bullets) doivent être une liste.");
    }
  }

  if (has("shortDescription")) {
    const shortDescription = asTrimmedString(body.shortDescription) ?? "";
    if (shortDescription.length > SHORT_DESCRIPTION_MAX) {
      errors.push(`La description courte ne doit pas dépasser ${SHORT_DESCRIPTION_MAX} caractères.`);
    } else {
      values.shortDescription = shortDescription;
    }
  }

  if (has("description")) {
    values.description = typeof body.description === "string" ? body.description : "";
  }

  if (has("rating")) {
    if (body.rating === null || body.rating === "") {
      values.rating = undefined;
    } else {
      const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        errors.push("La note doit être comprise entre 0 et 5.");
      } else {
        values.rating = rating;
      }
    }
  }

  if (has("stock")) {
    const stock = asInteger(body.stock);
    if (stock === undefined || stock < 0) {
      errors.push("Le stock doit être un nombre entier supérieur ou égal à 0.");
    } else {
      values.stock = stock;
    }
  }

  if (has("lowStockThreshold")) {
    const threshold = asInteger(body.lowStockThreshold);
    if (threshold === undefined || threshold < 0) {
      errors.push("Le seuil d'alerte doit être un nombre entier supérieur ou égal à 0.");
    } else {
      values.lowStockThreshold = threshold;
    }
  }

  if (has("inStock") && typeof body.inStock === "boolean") {
    values.inStock = body.inStock;
  }

  // Attributs Google Merchant Center. Le GTIN n'est jamais deviné : on refuse
  // une valeur mal formée plutôt que de l'enregistrer, car un code-barres faux
  // fait suspendre le compte marchand.
  if (has("gtin")) {
    const gtin = (asTrimmedString(body.gtin) ?? "").replace(/[\s-]/g, "");
    // La longueur seule ne suffit pas : un GTIN de la bonne longueur mais à la
    // clé de contrôle fausse (transposition de chiffre, faute de frappe) passerait
    // sans être détecté et partirait tel quel dans le flux Merchant.
    if (gtin && !isValidGtin(gtin)) {
      errors.push(
        "Le GTIN doit comporter 8, 12, 13 ou 14 chiffres et sa clé de contrôle doit être valide.",
      );
    } else {
      values.gtin = gtin;
    }
  }

  if (has("mpn")) {
    values.mpn = asTrimmedString(body.mpn) ?? "";
  }

  if (has("condition")) {
    const condition = asTrimmedString(body.condition) ?? "new";
    if (!["new", "refurbished", "used"].includes(condition)) {
      errors.push("L'état doit être new, refurbished ou used.");
    } else {
      values.condition = condition;
    }
  }

  if (has("googleProductCategory")) {
    values.googleProductCategory = asTrimmedString(body.googleProductCategory) ?? "";
  }

  if (has("shippingWeightGrams")) {
    const weight = asInteger(body.shippingWeightGrams);
    if (body.shippingWeightGrams === null || body.shippingWeightGrams === "") {
      values.shippingWeightGrams = undefined;
    } else if (weight === undefined || weight < 0) {
      errors.push("Le poids d'expédition doit être un nombre entier supérieur ou égal à 0.");
    } else {
      values.shippingWeightGrams = weight;
    }
  }

  if (has("energyEfficiencyClass")) {
    values.energyEfficiencyClass = asTrimmedString(body.energyEfficiencyClass) ?? "";
  }

  if (has("variants")) {
    const rawVariants = body.variants;
    if (!Array.isArray(rawVariants)) {
      errors.push("Les variations doivent être une liste.");
    } else {
      const parsed: VariantInput[] = [];
      rawVariants.forEach((entry, index) => {
        const v = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const label = asTrimmedString(v.label) ?? "";
        const price = asTrimmedString(v.price) ?? "";
        const oldPrice = asTrimmedString(v.oldPrice) ?? "";
        if (!label) {
          errors.push(`Variation ${index + 1} : libellé manquant.`);
          return;
        }
        if (!price || toCents(price) <= 0) {
          errors.push(`Variation ${index + 1} : prix invalide.`);
          return;
        }
        parsed.push({
          id: asTrimmedString(v.id) || undefined,
          label,
          labelEn: asTrimmedString(v.labelEn) ?? "",
          priceCents: toCents(price),
          oldPriceCents: oldPrice ? toCents(oldPrice) : undefined,
          position: asInteger(v.position) ?? index,
          active: v.active === undefined ? true : v.active !== false,
        });
      });
      if (parsed.length === rawVariants.length || rawVariants.length === 0) {
        values.variants = parsed;
      }
    }
  }

  return { values, errors };
}

/** Assemble les valeurs validées en un enregistrement complet pour createProduct(). */
export function toCreateInput(values: ProductInput): Omit<ProductRecord, "id"> | undefined {
  if (!values.categoryId || !values.brand || !values.name || !values.price) return undefined;
  return {
    ...values,
    categoryId: values.categoryId,
    brand: values.brand,
    name: values.name,
    price: values.price,
    bullets: values.bullets ?? [],
  };
}
