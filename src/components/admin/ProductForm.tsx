"use client";

import { useMemo, useState, type FormEvent } from "react";
// `marge` et `pricingUtils` sont des modules purs — vérifié : aucun import,
// donc rien de serveur n'entre dans le paquet du navigateur. Ce composant est
// un composant client, et le lot précédent a cassé la construction en tirant
// Prisma dans le navigateur par un import qui semblait anodin.
import { coutSaisiValide, margeUnitaire, tauxMarge } from "@/lib/kk/marge";
import { formatPrice, toCents } from "@/server/pricingUtils";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { GalleryUploadField } from "@/components/admin/GalleryUploadField";
import {
  MerchantFieldsFieldset,
  type MerchantFieldsValues,
} from "@/components/admin/MerchantFieldsFieldset";
import { PreviewPanel } from "@/components/admin/PreviewPanel";
import { ProductPreview, type ProductPreviewView } from "@/components/admin/ProductPreview";
import { slugify } from "@/lib/slugify";
import { PRODUCT_BADGES } from "@/lib/kk/badges";
import type { CategoryRecord, ProductRecord } from "@/server/types";

/** Marque existante proposée dans la liste déroulante. */
export interface BrandOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  mode: "new" | "edit";
  categories: CategoryRecord[];
  /** Marques déjà créées, pour la liste déroulante — vide si non fournie. */
  brands?: BrandOption[];
  initialData?: ProductRecord;
  /**
   * Fournie, cette fonction remplace la redirection vers la liste des produits.
   * C'est ce qui permet de créer un produit sans quitter l'assistant de
   * campagne : le formulaire enregistre, rend la fiche créée, et l'appelant
   * décide de la suite.
   */
  onSaved?: (product: ProductRecord) => void;
  /** L'aperçu boutique n'a pas sa place dans un panneau latéral étroit. */
  showPreview?: boolean;
}

const SHORT_DESCRIPTION_MAX = 200;

export function ProductForm({
  mode,
  categories,
  brands = [],
  initialData,
  onSaved,
  showPreview = true,
}: ProductFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? categories[0]?.id ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  // Rempli en choisissant une marque dans la liste ; vidé dès que la saisie
  // libre change, pour ne jamais rattacher un produit à la marque qu'on vient
  // de quitter en tapant.
  const [brandId, setBrandId] = useState<string | null>(initialData?.brandId ?? null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [bulletsText, setBulletsText] = useState((initialData?.bullets ?? []).join("\n"));
  const [image, setImage] = useState(initialData?.image ?? "");
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [oldPrice, setOldPrice] = useState(initialData?.oldPrice ?? "");
  const [price, setPrice] = useState(initialData?.price ?? "");
  const [cost, setCost] = useState(initialData?.cost ?? "");

  const [badge, setBadge] = useState(initialData?.badge ?? "");
  const [rating, setRating] = useState(initialData?.rating?.toString() ?? "");
  const [stock, setStock] = useState((initialData?.stock ?? 10).toString());
  const [lowStockThreshold, setLowStockThreshold] = useState(
    (initialData?.lowStockThreshold ?? 5).toString(),
  );
  const [merchant, setMerchant] = useState<MerchantFieldsValues>({
    gtin: initialData?.gtin ?? "",
    mpn: initialData?.mpn ?? "",
    condition: initialData?.condition ?? "new",
    googleProductCategory: initialData?.googleProductCategory ?? "",
    shippingWeightGrams: initialData?.shippingWeightGrams?.toString() ?? "",
    energyEfficiencyClass: initialData?.energyEfficiencyClass ?? "",
  });
  interface VariantRow { id?: string; label: string; price: string; oldPrice: string }
  const [variants, setVariants] = useState<VariantRow[]>(
    (initialData?.variants ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      price: v.priceCents.toLocaleString("fr-FR"),
      oldPrice: v.oldPriceCents ? v.oldPriceCents.toLocaleString("fr-FR") : "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Vue affichée dans l'aperçu : la fiche produit ou la carte telle qu'elle
  // apparaît dans les grilles de la boutique.
  const [previewView, setPreviewView] = useState<ProductPreviewView>("detail");

  /**
   * Marge affichée sous le champ, recalculée à la frappe.
   *
   * Rendue `null` — donc remplacée par l'invite — tant que l'un des deux
   * montants manque : une marge affichée sur un coût vide serait fausse, et
   * c'est précisément l'erreur que le champ nullable existe pour éviter.
   */
  const apercuMarge = useMemo(() => {
    // Une saisie sans chiffre — « abc », « — » — n'est pas un coût de zéro :
    // sans ce test, l'aperçu annonçait 100 % de marge avant que le serveur ne
    // refuse la même chaîne.
    if (!coutSaisiValide(cost)) return null;

    const prixCents = toCents(price);
    const coutCents = cost.trim() ? toCents(cost) : null;
    if (!prixCents || coutCents === null) return null;

    const marge = margeUnitaire(prixCents, coutCents);
    const taux = tauxMarge(prixCents, coutCents);
    if (marge === null || taux === null) return null;

    // Une vente à perte se dit, elle ne se déduit pas d'un signe moins.
    const mention = marge < 0 ? " — vendu à perte" : "";
    return `Marge : ${formatPrice(marge)} (${taux.toString().replace(".", ",")} %)${mention}`;
  }, [price, cost]);

  /**
   * Ce qui s'affiche à la place de la marge, quand il n'y en a pas encore.
   *
   * Trois raisons distinctes empêchent le calcul, et les confondre envoyait
   * l'administrateur corriger le mauvais champ : un coût illisible n'est pas
   * un prix manquant.
   */
  const messageMarge = !cost.trim()
    ? "Laissez vide tant que le coût n’est pas connu : un coût absent n’est pas un coût nul."
    : !coutSaisiValide(cost)
      ? "Coût illisible : saisissez un montant, par exemple « 12 000 »."
      : "Renseignez aussi le prix pour voir la marge.";

  const stockNumber = Number.parseInt(stock, 10);
  const thresholdNumber = Number.parseInt(lowStockThreshold, 10);
  const hasStock = Number.isFinite(stockNumber);
  const inStock = hasStock && stockNumber > 0;
  const lowStock = inStock && Number.isFinite(thresholdNumber) && stockNumber <= thresholdNumber;

  // « En stock » est déduit du stock : décocher le met à 0, cocher rétablit un
  // stock de départ. Ainsi il ne reste qu'une seule source de vérité.
  function handleInStockChange(checked: boolean) {
    if (checked) {
      setStock(inStock ? stock : "10");
    } else {
      setStock("0");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const payload: Record<string, unknown> = {
      categoryId,
      brand,
      brandId,
      name,
      shortDescription,
      description,
      bullets: bulletsText.split("\n").map((line) => line.trim()).filter(Boolean),
      image,
      images,
      oldPrice,
      price,
      cost,
      badge,
      rating: rating ? Number.parseFloat(rating) : null,
    };
    // Ne pas envoyer les champs numériques vides pour conserver la valeur du serveur
    if (hasStock) payload.stock = stockNumber;
    if (Number.isFinite(thresholdNumber)) payload.lowStockThreshold = thresholdNumber;

    // Variations de volume : envoi uniquement si le champ label ET prix sont renseignés
    payload.variants = variants
      .filter((v) => v.label.trim() && v.price.trim())
      .map((v, index) => ({
        id: v.id,
        label: v.label.trim(),
        price: v.price.trim(),
        oldPrice: v.oldPrice.trim(),
        position: index,
        active: true,
      }));

    // Champs Google Merchant : le poids part en nombre, vide = effacement
    payload.gtin = merchant.gtin;
    payload.mpn = merchant.mpn;
    payload.condition = merchant.condition;
    payload.googleProductCategory = merchant.googleProductCategory;
    payload.shippingWeightGrams = merchant.shippingWeightGrams
      ? Number.parseInt(merchant.shippingWeightGrams, 10)
      : null;
    payload.energyEfficiencyClass = merchant.energyEfficiencyClass;

    const url = mode === "new" ? "/api/admin/products" : `/api/admin/products/${initialData?.id}`;
    const method = mode === "new" ? "POST" : "PUT";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Échec de l'enregistrement.");
      return;
    }

    if (onSaved) {
      // La fiche enregistrée est rendue à l'appelant : c'est le serveur qui a
      // attribué l'identifiant, personne d'autre ne peut le connaître.
      const saved = (await response.json().catch(() => null)) as ProductRecord | null;
      if (saved) onSaved(saved);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  const selectedCategory = categories.find((entry) => entry.id === categoryId);
  // L'adresse publique du produit reprend la règle du serveur : slug de la marque
  // et du nom accolés.
  const productSlug = slugify(`${brand}-${name}`) || "produit";

  return (
    <div
      className={
        showPreview
          ? "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
          : "grid grid-cols-1 gap-6"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="min-w-0 max-w-2xl rounded-sm border border-border bg-white p-6 lg:max-w-none"
      >
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">Catégorie</span>
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Marque</span>
            <input
              required
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value);
                // Une saisie libre ne désigne plus forcément la marque choisie
                // dans la liste : le rattachement se refera au prochain import.
                setBrandId(null);
              }}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
            {brands.length > 0 ? (
              <select
                value={brandId ?? ""}
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) {
                    setBrandId(null);
                    return;
                  }
                  const marque = brands.find((option) => option.id === id);
                  if (marque) {
                    setBrand(marque.name);
                    setBrandId(marque.id);
                  }
                }}
                className="mt-1.5 w-full rounded-sm border border-border px-3 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="">— Marque existante (ou saisie libre ci-dessus) —</option>
                {brands.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Nom</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground">
              Description courte (sous le titre du produit)
            </span>
            <span
              className={
                shortDescription.length >= SHORT_DESCRIPTION_MAX
                  ? "text-xs font-bold text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {shortDescription.length}/{SHORT_DESCRIPTION_MAX}
            </span>
          </span>
          <textarea
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value.slice(0, SHORT_DESCRIPTION_MAX))}
            maxLength={SHORT_DESCRIPTION_MAX}
            rows={2}
            placeholder="Une à deux phrases qui résument le produit."
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Description (texte détaillé sur la fiche produit)
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={7}
            placeholder="Équipement, usage, contenu de la livraison …"
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Caractéristiques (une ligne par point)
          </span>
          <textarea
            value={bulletsText}
            onChange={(event) => setBulletsText(event.target.value)}
            rows={4}
            className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <ImageUploadField
          value={image}
          onChange={setImage}
          label="Image principale"
          hint="Sert de vignette dans les listes, le panier et le flux Google. Laisser vide pour utiliser l'image de la catégorie."
        />

        <GalleryUploadField value={images} onChange={setImages} />

        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Ancien prix</span>
            <input
              value={oldPrice}
              onChange={(event) => setOldPrice(event.target.value)}
              placeholder="ex. 22 000"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Prix</span>
            <input
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="ex. 18 500"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">
              Coût d&rsquo;achat <span className="font-normal text-muted-foreground">(facultatif)</span>
            </span>
            <input
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="ex. 12 000"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
            {/* La marge s'affiche sous le champ, au moment de la saisie.
                Sans cela, il faudrait enregistrer puis aller la lire au tableau
                de bord pour découvrir qu'on vend à perte. */}
            <span className="mt-1 block text-xs text-muted-foreground">
              {apercuMarge ?? messageMarge}
            </span>
          </label>
        </div>

        {/* ── Badge ─────────────────────────────────────────────────────────
            TROIS CHOIX, PLUS UN CHAMP LIBRE.

            C'était un `input` texte, « ex. -20%, Nouveau ». La boutique
            n'affiche que deux valeurs exactes — `bestseller` et `nouveau` —,
            donc tout le reste, y compris le « Nouveau » suggéré par l'exemple
            lui-même, était enregistré puis ignoré à l'affichage. On pouvait
            croire avoir badgé un produit pendant des mois.

            Les trois boutons écrivent la clé attendue, et rien d'autre ne peut
            entrer par ce formulaire. Le serveur normalise malgré tout (voir
            `productInput.ts`) : l'import CSV, lui, reste une porte ouverte.

            Un seul badge à la fois : une vignette qui porterait « Meilleure
            vente » ET « Nouveauté » n'aurait plus de hiérarchie, et les deux
            pastilles se disputeraient le même coin de l'image. */}
        <fieldset className="mb-4">
          <legend className="mb-1 block text-sm font-semibold text-foreground">Badge</legend>
          <p className="mb-2 text-xs text-muted-foreground">
            Pastille affichée sur la vignette et sur la fiche produit.
          </p>
          <div className="flex flex-wrap gap-2">
            {[{ key: "", label: "Aucun", hint: "Le produit s'affiche sans pastille." }, ...PRODUCT_BADGES].map(
              (option) => {
                const actif = badge === option.key;
                return (
                  <button
                    key={option.key || "aucun"}
                    type="button"
                    onClick={() => setBadge(option.key)}
                    aria-pressed={actif}
                    title={option.hint}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      actif
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
          {/* La valeur enregistrée n'est pas celle qu'on lit sur le bouton :
              on montre donc laquelle part en base, pour que l'export CSV et
              l'import ne soient pas des boîtes noires. */}
          {badge && (
            <p className="mt-2 text-xs text-muted-foreground">
              Enregistré en base sous « {badge} ».
            </p>
          )}
        </fieldset>

        {/* ── Variations de volume ─────────────────────────────────────────── */}
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-semibold text-foreground">
            Variations de volume
          </legend>
          {variants.length > 0 && (
            <div className="mb-2 space-y-2" role="list" aria-label="Lignes de variation">
              {variants.map((row, index) => (
                <div
                  key={index}
                  role="listitem"
                  className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2"
                >
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-foreground">Volume</span>
                    <input
                      required
                      value={row.label}
                      onChange={(event) =>
                        setVariants((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, label: event.target.value } : r,
                          ),
                        )
                      }
                      placeholder="ex. 50 ml"
                      aria-label={`Volume de la variation ${index + 1}`}
                      className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-foreground">Prix</span>
                    <input
                      required
                      value={row.price}
                      onChange={(event) =>
                        setVariants((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, price: event.target.value } : r,
                          ),
                        )
                      }
                      placeholder="ex. 9 000"
                      aria-label={`Prix de la variation ${index + 1}`}
                      className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-foreground">
                      Ancien prix{" "}
                      <span className="font-normal text-muted-foreground">(facultatif)</span>
                    </span>
                    <input
                      value={row.oldPrice}
                      onChange={(event) =>
                        setVariants((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, oldPrice: event.target.value } : r,
                          ),
                        )
                      }
                      placeholder="ex. 12 000"
                      aria-label={`Ancien prix de la variation ${index + 1}`}
                      className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`Retirer la variation ${index + 1}`}
                    className="rounded-sm border border-border px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              setVariants((prev) => [...prev, { label: "", price: "", oldPrice: "" }])
            }
            className="rounded-sm border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            + Ajouter un volume
          </button>
        </fieldset>

        <div className="mb-4 grid grid-cols-3 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Note (0–5)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Stock</span>
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Seuil d&apos;alerte</span>
            <input
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(event) => handleInStockChange(event.target.checked)}
              className="h-4 w-4"
            />
            En stock
          </label>
          {!inStock && (
            <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
              En rupture
            </span>
          )}
          {lowStock && (
            <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
              Stock faible — seuil d&apos;alerte atteint
            </span>
          )}
        </div>

        <MerchantFieldsFieldset
          values={merchant}
          onChange={(patch) => setMerchant((current) => ({ ...current, ...patch }))}
          categorySlug={categoryId.split("/")[1]}
        />

        {error && <p className="mb-4 text-sm font-semibold text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {showPreview && (
        <PreviewPanel
          url={`kosskoss.select/${categoryId || "univers/categorie"}/${productSlug}`}
          actions={
            <div className="flex rounded-sm border border-border bg-white text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewView("detail")}
                className={`rounded-sm px-2 py-1 ${
                  previewView === "detail"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fiche
              </button>
              <button
                type="button"
                onClick={() => setPreviewView("card")}
                className={`rounded-sm px-2 py-1 ${
                  previewView === "card"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Carte
              </button>
            </div>
          }
        >
          <ProductPreview
            view={previewView}
            groupLabel={selectedCategory?.group ?? ""}
            categoryLabel={selectedCategory?.label ?? ""}
            categoryImage={selectedCategory?.image ?? ""}
            brand={brand}
            name={name}
            shortDescription={shortDescription}
            description={description}
            bullets={bulletsText.split("\n")}
            image={image}
            images={images}
            oldPrice={oldPrice}
            price={price}
            badge={badge}
            rating={rating}
            stock={hasStock ? stockNumber : null}
            lowStockThreshold={Number.isFinite(thresholdNumber) ? thresholdNumber : null}
          />
        </PreviewPanel>
      )}
    </div>
  );
}
