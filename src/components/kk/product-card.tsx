import Image from "next/image";
import { formatFcfa } from "@/lib/kk/format";
import { BADGE_LABEL } from "@/lib/kk/badges";
import type { KKProductView } from "@/types/kk";
import { BottleMotif } from "./motifs";
import { FavoriteHeart, QuickAddButton } from "./product-actions";

// Libellés partagés avec la fiche produit et le back-office : voir
// `lib/kk/badges`. Ils étaient recopiés dans chaque composant, et « Bestseller »
// d'un côté cohabitait avec « Meilleure vente » de l'autre.

export function ProductCard({ product }: { product: KKProductView }) {
  const href = product.href ?? "#";
  const hasImage = typeof product.image === "string" && product.image.length > 0;

  return (
    <article className="group flex flex-col">
      {/* Le cadre se soulève au survol ; la photo, elle, zoome légèrement dans
          son cadre (voir `group-hover:scale-105` plus bas). Deux mouvements de
          faible amplitude qui se répondent, plutôt qu'un seul geste ample : sur
          une grille de vingt vignettes, l'ampleur fait vibrer la page. */}
      <div className="kk-lift relative overflow-hidden rounded-2xl border border-border/70 bg-card">
        {/* Fond crème uni, comme sur la maquette.
            Les quatre dégradés colorés qui tournaient ici (sable, rose, bleu,
            argile) étaient attribués selon la POSITION dans la grille et non
            selon le produit : la même crème changeait de couleur d'une page à
            l'autre. Décoratif et arbitraire — et surtout en concurrence avec
            les teintes de routine, qui, elles, veulent dire quelque chose. */}
        <a
          href={href}
          /* Fond BLANC et non crème : les packshots ne sont pas détourés, ce
             sont des JPEG carrés shootés sur fond blanc. Posés sur le crème,
             ils dessinaient un rectangle clair au milieu de la vignette. Le
             cadre étant en 4/5 pour une source carrée, l'image ne peut pas le
             remplir (`cover` rognerait bouchons et bas d'étiquette, voir plus
             bas) : aligner le fond sur celui des visuels est donc la seule
             sortie. Elle n'est pas parfaite — le blanc des fichiers varie de
             245 à 254 selon les prises de vue — mais l'écart devient invisible
             là où il sautait aux yeux. */
          className="relative flex aspect-[4/5] items-center justify-center bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-inset"
          aria-label={product.name}
        >
          {hasImage ? (
            <Image
              src={product.image as string}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 45vw, 22vw"
              // `contain` et non `cover` : les visuels détourés sont carrés, le
              // cadre est en 4/5. En `cover`, le flacon était rogné d'un
              // cinquième — bouchons et bas d'étiquette coupés sur toute la
              // grille.
              className="object-contain p-2 transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <BottleMotif className="h-3/5 w-auto text-deep transition-transform duration-700 ease-out group-hover:scale-105" />
          )}

          {/* LA PASTILLE.
              « Nouveauté » était en `bg-cream` sur un cadre `bg-card` — deux
              blancs à quelques points d'écart : le badge existait dans le DOM
              et ne se voyait sur aucun écran. Il passe au laiton plein, la
              couleur d'accent de la marque, avec le vert profond pour texte.
              « Meilleure vente » garde l'aplat vert : la distinction la plus
              forte prend la valeur la plus sombre, et les deux ne peuvent pas
              se confondre d'un coup d'œil.

              Aucune ombre, aucun contour : posée sur un packshot détouré à fond
              blanc, une pastille pleine se détache déjà seule. */}
          {product.badge && (
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${
                product.badge === "bestseller"
                  ? "bg-deep text-primary-foreground"
                  : "bg-gold text-deep"
              }`}
            >
              {BADGE_LABEL[product.badge]}
            </span>
          )}
        </a>

        {/* Les deux pastilles sont posées hors du lien : cliquer sur le cœur ou
            sur le « + » ne doit pas ouvrir la fiche produit. */}
        <FavoriteHeart product={product} className="absolute right-3 top-3" />
        <QuickAddButton product={product} />
      </div>

      <a href={href} className="mt-4 flex flex-1 flex-col focus-visible:outline-none">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="mt-1 font-sans text-[0.95rem] font-medium leading-snug text-foreground group-hover:text-deep">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="figure text-[0.95rem] font-semibold text-deep">
            {formatFcfa(product.priceFcfa)}
          </span>
          {product.oldPriceFcfa && (
            <span className="figure text-xs text-muted-foreground line-through">
              {formatFcfa(product.oldPriceFcfa)}
            </span>
          )}
        </div>
      </a>
    </article>
  );
}
