"use client";

import { ChevronRight, ShieldCheck, Star, Truck } from "lucide-react";
import { PreviewImage } from "@/components/admin/PreviewImage";
import { formatRating } from "@/lib/formatRating";

export type ProductPreviewView = "detail" | "card";

interface ProductPreviewProps {
  view: ProductPreviewView;
  groupLabel: string;
  categoryLabel: string;
  /** Image de la catégorie : elle prend le relais quand le produit n'en a pas, comme sur la boutique. */
  categoryImage: string;
  brand: string;
  name: string;
  shortDescription: string;
  description: string;
  bullets: string[];
  image: string;
  images: string[];
  oldPrice: string;
  price: string;
  badge: string;
  /** Note telle que saisie, donc encore sous forme de chaîne éventuellement vide ou invalide. */
  rating: string;
  stock: number | null;
  lowStockThreshold: number | null;
}

/** Marque le contenu manquant sans laisser de trou dans la mise en page. */
function Placeholder({ children }: { children: string }) {
  return <span className="text-muted-foreground/60 italic">{children}</span>;
}

/** La note n'est affichée que si elle est exploitable, comme sur la fiche publique. */
function parseRating(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) return null;
  return parsed;
}

/**
 * Reproduction de la fiche produit et de la carte de liste telles que les voit le
 * client. Comme pour l'aperçu catégorie, les composants de la boutique ne sont pas
 * réutilisés : ils dépendent de next-intl, du panier et de la liste d'envies. Les
 * libellés figés viennent de src/messages/fr.json.
 */
export function ProductPreview({
  view,
  groupLabel,
  categoryLabel,
  categoryImage,
  brand,
  name,
  shortDescription,
  description,
  bullets,
  image,
  images,
  oldPrice,
  price,
  badge,
  rating,
  stock,
  lowStockThreshold,
}: ProductPreviewProps) {
  // Sans visuel propre, le produit hérite de l'image de sa catégorie.
  const mainImage = image.trim() || categoryImage;
  // L'image principale ouvre la galerie ; les doublons sont écartés.
  const views = [mainImage, ...images.filter((entry) => entry && entry !== mainImage)].filter(
    Boolean,
  );
  const ratingValue = parseRating(rating);
  const inStock = stock === null || stock > 0;
  const lowStock =
    inStock && stock !== null && lowStockThreshold !== null && stock <= lowStockThreshold;
  const filledBullets = bullets.filter((bullet) => bullet.trim());

  if (view === "card") {
    return (
      <div className="bg-muted p-4">
        {/* Largeur bornée pour rester proche de la taille réelle d'une carte en grille */}
        <div className="mx-auto max-w-[220px]">
          <div className="flex h-full flex-col rounded-sm border border-border bg-white p-3 shadow-sm">
            <div className="relative mb-2 min-h-5">
              {badge.trim() && (
                <span className="absolute top-0 left-0 rounded-sm bg-badge px-2 py-0.5 text-[11px] font-bold text-badge-foreground">
                  {badge}
                </span>
              )}
            </div>
            <PreviewImage
              src={mainImage}
              alt={name}
              wrapperClassName="mb-3 aspect-square w-full rounded-sm bg-muted"
              sizes="220px"
            />
            <p className="truncate text-xs font-bold text-muted-foreground uppercase">
              {brand.trim() || "Marque"}
            </p>
            <p className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
              {name.trim() || <Placeholder>Nom du produit</Placeholder>}
            </p>
            {ratingValue !== null && (
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-foreground">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                {formatRating(ratingValue, "fr")}
              </p>
            )}
            <ul className="mb-3 space-y-0.5 text-xs text-muted-foreground">
              {filledBullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="flex items-end gap-2">
                {oldPrice.trim() && (
                  <span className="text-xs text-muted-foreground line-through">{oldPrice}</span>
                )}
                <span className="text-lg font-black text-primary">
                  {price.trim() || <Placeholder>Prix</Placeholder>}
                </span>
              </div>
              {!inStock && (
                <span className="text-[11px] font-semibold text-muted-foreground">Sur demande</span>
              )}
            </div>
          </div>
        </div>

        <StockNote stock={stock} lowStockThreshold={lowStockThreshold} lowStock={lowStock} />
      </div>
    );
  }

  return (
    <div className="bg-white text-[13px]">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span>Accueil</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate">{groupLabel || "Univers"}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate">{categoryLabel || "Catégorie"}</span>
      </div>

      <div className="px-3 py-4">
        <PreviewImage
          src={mainImage}
          alt={name}
          wrapperClassName="aspect-square w-full rounded-sm border border-border bg-white"
          imageClassName="object-contain p-4"
          sizes="360px"
        />

        {views.length > 1 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {views.map((entry, index) => (
              <li key={entry}>
                <PreviewImage
                  src={entry}
                  alt=""
                  wrapperClassName={`h-12 w-12 rounded-sm border bg-white ${
                    index === 0 ? "border-primary" : "border-border"
                  }`}
                  imageClassName="object-contain p-1"
                  sizes="48px"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            {brand.trim() || "Marque"}
          </p>
          <h1 className="text-lg leading-tight font-black text-foreground">
            {name.trim() || <Placeholder>Nom du produit</Placeholder>}
          </h1>
          {ratingValue !== null && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-foreground">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {formatRating(ratingValue, "fr")} sur 5
            </p>
          )}
          {shortDescription.trim() && (
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">{shortDescription}</p>
          )}
        </div>

        {/* Bloc d'achat, reprise de ProductPurchaseBox */}
        <div className="mt-4 flex flex-col gap-3 rounded-sm border border-border p-3">
          <div>
            {oldPrice.trim() && (
              <p className="text-xs text-muted-foreground">
                Prix d&apos;origine <span className="line-through">{oldPrice}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-primary">
                {price.trim() || <Placeholder>Prix</Placeholder>}
              </p>
              {badge.trim() && (
                <span className="rounded-sm bg-badge px-2 py-0.5 text-[11px] font-bold text-badge-foreground">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              TVA incluse, hors frais de livraison
            </p>
          </div>

          <p
            className={`text-xs font-semibold ${
              inStock ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {inStock
              ? "✓ En stock – livraison sous 1 à 3 jours ouvrés"
              : "Sur demande – disponible sous 2 à 4 semaines"}
          </p>

          <span
            className={`rounded-sm px-3 py-2 text-center text-xs font-bold ${
              inStock
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            In den Warenkorb
          </span>

          <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-primary" /> Livraison rapide sous 1 à 3 jours ouvrés
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Garantie légale de conformité de 2 ans
            </p>
          </div>
        </div>

        {filledBullets.length > 0 && (
          <section className="mt-4 border-t border-border pt-4">
            <h2 className="mb-2 text-xs font-bold text-foreground">Ausstattung &amp; Merkmale</h2>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {filledBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-primary">✓</span> {bullet}
                </li>
              ))}
            </ul>
          </section>
        )}

        {description.trim() && (
          <section className="mt-4 border-t border-border pt-4">
            <h2 className="mb-2 text-xs font-bold text-foreground">Artikelbeschreibung</h2>
            {/* Même rendu que la fiche publique : les paragraphes saisis dans
                le back-office doivent rester lisibles dans l'aperçu. */}
            <p className="whitespace-pre-line text-xs text-muted-foreground">{description}</p>
          </section>
        )}
      </div>

      <StockNote stock={stock} lowStockThreshold={lowStockThreshold} lowStock={lowStock} />
    </div>
  );
}

/**
 * La boutique n'affiche jamais le stock chiffré. Le back-office, si : la valeur
 * exacte est rappelée en pied d'aperçu, clairement séparée du rendu client.
 */
function StockNote({
  stock,
  lowStockThreshold,
  lowStock,
}: {
  stock: number | null;
  lowStockThreshold: number | null;
  lowStock: boolean;
}) {
  return (
    <div className="border-t border-border bg-muted px-3 py-2 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">Stock : </span>
      {stock === null ? "non renseigné" : `${stock} pièce${stock > 1 ? "s" : ""}`}
      {lowStockThreshold !== null && ` — seuil d'alerte ${lowStockThreshold}`}
      {lowStock && (
        <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 font-bold text-accent-foreground">
          Stock faible
        </span>
      )}
      {stock !== null && stock <= 0 && (
        <span className="ml-2 rounded-sm bg-destructive px-1.5 py-0.5 font-bold text-white">
          En rupture
        </span>
      )}
    </div>
  );
}
