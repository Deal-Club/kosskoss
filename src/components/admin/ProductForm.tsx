"use client";

import { useState, type FormEvent } from "react";
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
import type { CategoryRecord, ProductRecord } from "@/server/types";

interface ProductFormProps {
  mode: "new" | "edit";
  categories: CategoryRecord[];
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
  initialData,
  onSaved,
  showPreview = true,
}: ProductFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? categories[0]?.id ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [bulletsText, setBulletsText] = useState((initialData?.bullets ?? []).join("\n"));
  const [image, setImage] = useState(initialData?.image ?? "");
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [oldPrice, setOldPrice] = useState(initialData?.oldPrice ?? "");
  const [price, setPrice] = useState(initialData?.price ?? "");
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
      price: (v.priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
      oldPrice: v.oldPriceCents
        ? (v.oldPriceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })
        : "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Vue affichée dans l'aperçu : la fiche produit ou la carte telle qu'elle
  // apparaît dans les grilles de la boutique.
  const [previewView, setPreviewView] = useState<ProductPreviewView>("detail");

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
      name,
      shortDescription,
      description,
      bullets: bulletsText.split("\n").map((line) => line.trim()).filter(Boolean),
      image,
      images,
      oldPrice,
      price,
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
  const productSlug = slugify(`${brand}-${name}`) || "produkt";

  return (
    <div
      className={
        showPreview
          ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
          : "grid grid-cols-1 gap-6"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="min-w-0 max-w-2xl rounded-sm border border-border bg-white p-6 xl:max-w-none"
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
              onChange={(event) => setBrand(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
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

        <div className="mb-4 grid grid-cols-3 gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Ancien prix</span>
            <input
              value={oldPrice}
              onChange={(event) => setOldPrice(event.target.value)}
              placeholder="ex. 449,00 €"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Prix</span>
            <input
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="ex. 349,00 €"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Badge</span>
            <input
              value={badge}
              onChange={(event) => setBadge(event.target.value)}
              placeholder="ex. -20%, Nouveau"
              className="w-full rounded-sm border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

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
                      placeholder="ex. 1 MAP"
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
                      placeholder="ex. 175,00 €"
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
                      placeholder="ex. 200,00 €"
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
          url={`mlc-bois.fr/${categoryId || "univers/categorie"}/${productSlug}`}
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
