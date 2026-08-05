"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { PreviewImage } from "@/components/admin/PreviewImage";
import { ProductForm } from "@/components/admin/ProductForm";
import { formatCents } from "@/lib/cart";
import type { CampaignProductOption } from "@/server/campaignAdmin";
import type { CategoryRecord } from "@/server/types";

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface CampaignStepProductsProps {
  products: CampaignProductOption[];
  categories: CategoryRecord[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Recharge le catalogue après une création faite dans le panneau latéral. */
  onProductCreated: () => Promise<void>;
}

/**
 * Étape 2 : le choix des produits.
 *
 * Le panneau latéral est le cœur de l'affaire : « je lance une campagne pour un
 * produit que je n'ai pas encore saisi » est le cas d'usage le plus fréquent, et
 * il ne doit pas obliger à tout recommencer. Le formulaire produit est réutilisé
 * tel quel — un second formulaire finirait par diverger du premier.
 */
export function CampaignStepProducts({
  products,
  categories,
  selectedIds,
  onSelectionChange,
  onProductCreated,
}: CampaignStepProductsProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Les catégories du filtre sont celles qui portent réellement un produit :
  // proposer des rayons vides ne fait qu'allonger la liste déroulante.
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const product of products) seen.set(product.categoryId, product.categoryLabel);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (!needle) return true;
      return `${product.brand} ${product.name}`.toLowerCase().includes(needle);
    });
  }, [products, query, categoryId]);

  function toggle(id: string) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((entry) => entry !== id)
        : [...selectedIds, id],
    );
  }

  async function handleCreated(productId: string, label: string) {
    setPanelOpen(false);
    // Le produit est coché immédiatement, avant même le rechargement : c'est la
    // raison pour laquelle on est passé par le panneau.
    if (!selectedIds.includes(productId)) onSelectionChange([...selectedIds, productId]);
    await onProductCreated();
    setNotice(`« ${label} » a été créé et ajouté à la campagne.`);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Recherche</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Marque ou nom"
              className={`${inputClass} w-56`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Catégorie</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">Toutes les catégories</option>
              {categoryOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setPanelOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Créer un produit
        </button>
      </div>

      {notice && (
        <p className="rounded-sm border border-[#16a34a] bg-[#16a34a]/5 px-4 py-2 text-sm font-semibold text-[#16a34a]">
          {notice}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {selectedIds.length === 0
          ? "Aucun produit sélectionné."
          : `${selectedIds.length} produit${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}`}
        {" · "}
        {visible.length} produit{visible.length > 1 ? "s" : ""} affiché
        {visible.length > 1 ? "s" : ""}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-sm border border-border bg-white p-8 text-center">
          <p className="font-bold text-foreground">Aucun produit ne correspond.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Modifiez la recherche, ou créez le produit directement depuis cet écran.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((product) => {
            const selected = selectedIds.includes(product.id);
            const soldOut = product.stock <= 0;

            return (
              <li key={product.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(product.id)}
                  className={`flex h-full w-full gap-3 rounded-sm border p-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <PreviewImage
                    src={product.image}
                    alt={`${product.brand} ${product.name}`}
                    wrapperClassName="h-20 w-20 shrink-0 rounded-sm border border-border bg-white"
                    imageClassName="object-contain p-1"
                    sizes="80px"
                    compact
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                        {product.brand}
                      </span>
                      {selected && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Choisi
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                      {product.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {product.categoryLabel}
                    </span>

                    <span className="mt-1.5 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-black text-foreground">
                        {formatCents(product.priceCents)}
                      </span>
                      {soldOut ? (
                        <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-[11px] font-bold text-white">
                          En rupture
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {product.stock} en stock
                        </span>
                      )}
                    </span>

                    {product.conflict && (
                      <span className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight font-semibold text-[#b45309]">
                        <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
                        Déjà en campagne « {product.conflict.name} » jusqu&apos;au{" "}
                        {dateFormatter.format(new Date(product.conflict.endsAt))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fermer le panneau de création de produit"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-muted shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-foreground">Nouveau produit</h2>
                <p className="text-xs text-muted-foreground">
                  Le produit sera créé et automatiquement ajouté à la campagne.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Fermer le panneau"
                className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <ProductForm
                mode="new"
                categories={categories}
                showPreview={false}
                onSaved={(product) => {
                  void handleCreated(product.id, `${product.brand} ${product.name}`.trim());
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
