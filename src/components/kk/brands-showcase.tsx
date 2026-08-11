import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LocalizedLink as Link } from "./localized-link";
import { BottleMotif } from "./motifs";
import type { BrandShowcaseItem } from "@/server/kk/brands";

/**
 * Vitrine des maisons distribuées.
 *
 * ── Pourquoi cette section existe ─────────────────────────────────────────
 * La boutique regroupe les produits de douze maisons, dont des marques que la
 * cliente connaît déjà — Clinique, Clarins, Biotherm, Drunk Elephant. C'est un
 * argument de confiance de premier ordre sur un marché où la contrefaçon est le
 * premier frein d'achat, et l'accueil ne le disait nulle part : les marques n'y
 * apparaissaient qu'en petites capitales au-dessus du nom de chaque produit.
 *
 * ── Pourquoi des packshots et non des logos ───────────────────────────────
 * Le projet ne possède aucun logo de ces maisons. Plutôt que d'attendre douze
 * fichiers, chaque carte montre une référence réelle de la maison — celle que
 * la rédaction a le mieux notée. On y gagne d'ailleurs quelque chose qu'un mur
 * de logos ne donne pas : on voit ce qu'on vend.
 *
 * ── Ce que la carte promet ────────────────────────────────────────────────
 * Le nombre de références est un compte réel, pas un chiffre d'affichage : qui
 * clique sur « 18 références » en trouve dix-huit. C'est la raison pour
 * laquelle les maisons sont classées par volume — une carte qui mène à un rayon
 * d'un seul article déçoit deux fois.
 */
export function BrandsShowcase({ brands }: { brands: BrandShowcaseItem[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="section mx-auto max-w-7xl px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Nos maisons</p>
          {/* Pas de compte dans le titre : le catalogue s'étoffe, et un titre
              qui annonce un nombre vieillit à chaque maison ajoutée — ou pire,
              se contredit tout seul si la grille en montre douze quand le
              catalogue en compte vingt. Ce que le titre doit dire tient dans
              « un seul panier » : c'est la promesse du multimarque, et elle
              reste vraie quel que soit le nombre. */}
          <h2 className="mt-2 text-deep">Toutes vos marques, un seul panier</h2>
          <p className="lead mt-2 max-w-xl">
            Des maisons que vous connaissez et d&rsquo;autres à découvrir, réunies au même
            endroit — et toutes achetées par un circuit identifié.
          </p>
        </div>
        <Link
          href="/marques"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep kk-underline"
        >
          Toutes nos marques
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Deux colonnes sur mobile, six sur grand écran : douze maisons tiennent
          alors en deux rangées pleines, sans case orpheline. */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map((brand) => (
          <li key={brand.name}>
            <Link
              href={brand.href}
              className="kk-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              {/* Le packshot occupe TOUT le cadre, sans marge intérieure.
                  Les visuels ne sont pas détourés : ce sont des JPEG carrés
                  déjà photographiés sur fond blanc, et ce blanc n'est même pas
                  constant d'un fichier à l'autre — mesuré entre 245 et 254 sur
                  le catalogue. Posé sur un aplat, quel qu'il soit, un tel visuel
                  dessine un carré clair au milieu de la carte ; aucune couleur
                  de fond ne peut le rattraper puisqu'elle ne peut pas coller à
                  trois blancs différents. En remplissant le cadre, le fond de
                  carte ne s'aperçoit plus du tout dans la zone image.
                  `cover` ne rogne rien : la source est carrée, le cadre aussi.
                  Le `overflow-hidden` de la carte arrondit le haut du visuel. */}
              <span className="relative flex aspect-square items-center justify-center bg-card">
                {brand.image ? (
                  <Image
                    src={brand.image}
                    alt={brand.imageAlt}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 15vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <BottleMotif className="h-3/5 w-auto text-deep/25" />
                )}
              </span>

              <span className="flex flex-1 flex-col items-center gap-1 px-3 py-4 text-center">
                <span className="text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-deep">
                  {brand.name}
                </span>
                <span className="figure text-xs text-muted-foreground">
                  {brand.productCount} référence{brand.productCount > 1 ? "s" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
