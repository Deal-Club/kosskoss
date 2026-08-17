import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { KKProductDetail } from "@/server/kk/product";
import { BADGE_LABEL } from "@/lib/kk/badges";
import type { KKProductView } from "@/types/kk";
import { BottleMotif, Petal } from "./motifs";
import { AddToCart } from "./add-to-cart";
import { ProductRail } from "./home";
import { ProductReviews } from "./product-reviews";
import { ProductZoom } from "./product-zoom";
import type { KKProductReviews } from "@/server/kk/product-reviews";

// Libellés partagés : voir `lib/kk/badges`.

function Breadcrumb({ product }: { product: KKProductDetail }) {
  const crumbs = [
    { label: "Accueil", href: "/" },
    { label: product.group.label, href: `/${product.group.slug}` },
    { label: product.category.label, href: `/${product.group.slug}/${product.category.slug}` },
    { label: product.name },
  ];
  return (
    <nav aria-label="Fil d'Ariane" className="mx-auto max-w-7xl px-6 py-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.href ? (
              <a href={c.href} className="transition hover:text-deep">
                {c.label}
              </a>
            ) : (
              <span className="text-deep">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Gallery({ product }: { product: KKProductDetail }) {
  const hasImage = typeof product.image === "string" && product.image.length > 0;
  // Les entrées vides sont écartées : une chaîne vide en base ferait un cadre
  // gris et casserait `next/image`, qui refuse un `src` vide.
  const vues = product.images.filter((s) => typeof s === "string" && s.trim().length > 0);
  return (
    <div className="grid gap-4">
      {/* Le zoom au survol vit dans son propre composant client (ProductZoom) :
          il suit le pointeur, ce que la fiche — rendue sur le serveur — ne peut
          pas faire. `data-visuel-produit` reste porté par ce cadre : c'est le
          point de départ du vol vers le panier (lib/kk/fly-to-cart).
          Sans image, on garde le motif et aucun zoom : il n'y a rien à
          approcher sur un flacon dessiné. */}
      {hasImage ? (
        <ProductZoom
          src={product.image as string}
          alt={product.name}
          /* Fond blanc, et non le dégradé beige qui habillait ce cadre : les
             packshots sont des JPEG shootés sur fond blanc, ils y dessinaient
             un rectangle clair au milieu du dégradé. Même correction que sur
             les cartes produit. Le filet remplace le dégradé pour délimiter le
             visuel, qui sans lui flotterait sur la page. */
          className="aspect-square rounded-[1.75rem] border border-border/70 bg-card"
        />
      ) : (
        <div
          data-visuel-produit
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.5),transparent_55%)]" />
          <BottleMotif className="h-3/5 w-auto text-deep/80" />
          <Petal className="absolute -right-4 -top-4 h-20 w-20 text-deep/15" />
        </div>
      )}
      {/* LES VUES COMPLÉMENTAIRES, ET RIEN SI LE PRODUIT N'EN A PAS.
          Deux carrés étaient posés ici EN DUR sur toutes les fiches : un aplat
          vert d'eau portant un flacon dessiné, un aplat rose portant le
          monogramme. Ce n'étaient pas des photos du produit — c'étaient des
          images inventées, identiques sur les soixante-onze fiches, et elles
          promettaient au visiteur des vues supplémentaires qui n'existaient
          pas. Sur une boutique dont le premier frein est la contrefaçon, un
          faux visuel de produit coûte exactement ce qu'on cherche à gagner.

          Le champ `images` existe pourtant en base depuis l'origine (voir
          prisma/schema.prisma) et le type le porte déjà : la galerie
          l'ignorait. Elle l'affiche maintenant, et disparaît quand il est
          vide. */}
      {vues.length > 0 && (
        <ul className="grid grid-cols-2 gap-4">
          {vues.map((src, i) => (
            <li
              key={src}
              className="relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <Image
                src={src}
                alt={`${product.name} — vue ${i + 2}`}
                fill
                sizes="(max-width: 1024px) 45vw, 22vw"
                className="object-contain p-2"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-border py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-deep">
        {title}
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export function ProductDetail({
  product,
  related,
  reviews,
}: {
  product: KKProductDetail;
  related: KKProductView[];
  reviews: KKProductReviews;
}) {
  return (
    <>
      <Breadcrumb product={product} />

      <section className="mx-auto max-w-7xl px-6 pb-8">
        {/* `items-start` sur la grille, `sticky` sur le bloc d'achat : la
            galerie est plus haute que lui, et le prix comme le bouton
            disparaissaient dès qu'on descendait voir les autres vues du
            produit. Ils suivent maintenant la lecture. */}
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <Gallery product={product} />

          <div className="lg:sticky lg:top-24 lg:pt-4">
            <div className="rounded-[1.75rem] border border-border/70 bg-card p-5 sm:p-7 lg:p-9">
              {/* Mêmes couleurs que sur la vignette — vert profond pour la
                  meilleure vente, laiton pour la nouveauté. Le badge était ici
                  en `bg-sand` quel que soit son sens : un client qui reconnaît
                  une pastille verte dans la grille ne devait pas la retrouver
                  beige sur la fiche. */}
              {product.badge && (
                <span
                  className={`mb-4 inline-block rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${
                    product.badge === "bestseller"
                      ? "bg-deep text-primary-foreground"
                      : "bg-gold text-deep"
                  }`}
                >
                  {BADGE_LABEL[product.badge]}
                </span>
              )}
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.brand}
              </p>
              {/* Le h1 global démarre à 2,5 rem (40 px) — une taille pensée
                  pour un titre de page court, pas pour un nom de produit.
                  « Crème solaire au riz et probiotiques » dans les 286 px
                  utiles d'un téléphone y tenait sur cinq lignes et occupait à
                  lui seul le tiers du premier écran, repoussant le prix et le
                  bouton d'achat hors de vue.
                  Il redescend à 1,6 rem sur mobile et retrouve progressivement
                  sa taille : le nom reste la tête de série de la fiche, il
                  cesse d'en être le contenu principal. */}
              <h1 className="mt-2 text-[1.6rem] leading-tight text-deep sm:text-[1.9rem] lg:text-[2.15rem]">
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="mt-3 text-muted-foreground">{product.shortDescription}</p>
              )}

              <div className="mt-6">
                <AddToCart product={product} />
              </div>

              <div className="mt-8">
                <Accordion title="Description" open>
                  {product.description || product.shortDescription}
                </Accordion>
                {product.bullets.length > 0 && (
                  <Accordion title="Ingrédients clés">
                    <ul className="space-y-2">
                      {product.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {b}
                        </li>
                      ))}
                    </ul>
                  </Accordion>
                )}
                <Accordion title="Conseils d'utilisation">
                  Appliquer sur peau propre et sèche, matin et/ou soir selon vos besoins. En cas de
                  doute, réalisez notre diagnostic beauté pour une routine adaptée.
                </Accordion>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                Réf. {product.sku} · {product.stock > 0 ? "En stock" : "Indisponible"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La bande « Notre parti pris » vivait ici : un discours général sur la
         sélection, identique sur les soixante-onze fiches, illustré par un
         aplat dégradé et le monogramme. Retirée à la demande du client. Elle
         séparait la fiche de ses produits associés par un écran de texte qui
         n'apprenait rien sur le produit qu'on est en train de regarder — le
         même propos est tenu à sa place sur l'accueil et sur /marques. */}

      {/* Les avis AVANT les produits associés : ils portent sur le produit
          qu'on regarde, alors que le rail propose d'aller voir ailleurs. */}
      <ProductReviews productId={product.id} reviews={reviews} />

      {related.length > 0 && (
        <ProductRail
          eyebrow="À associer"
          title="Vous aimerez aussi"
          action="Voir la catégorie"
          products={related}
        />
      )}
    </>
  );
}
