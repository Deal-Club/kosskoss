import { Star, ChevronDown, PenLine } from "lucide-react";
import { ReviewForm } from "./review-form";
import type { KKProductReviews, KKReviewView } from "@/server/kk/product-reviews";

/**
 * Avis clients sur la fiche produit.
 *
 * ── Compacte par défaut ───────────────────────────────────────────────────
 * Deux replis, tous deux fermés au chargement : le formulaire de dépôt, et les
 * avis au-delà des trois premiers. Déplié d'office, ce bloc occupait plus de
 * hauteur que la fiche produit elle-même, pour une action que la plupart des
 * visiteurs ne feront pas. Ce qui reste visible tient en trois lignes : la
 * note moyenne, le nombre d'avis, et de quoi ouvrir le formulaire.
 *
 * `<details>` natif, sans état React : le repli fonctionne avant l'hydratation,
 * il est accessible au clavier d'origine, et le formulaire — qui est un
 * composant client — reste monté à l'intérieur, donc rien n'est perdu en
 * l'ouvrant ou en le refermant.
 *
 * ── La section s'affiche toujours ─────────────────────────────────────────
 * Même sans un seul avis : une section qui n'apparaîtrait qu'une fois le
 * premier avis publié ne pourrait, par construction, jamais recevoir ce
 * premier avis.
 *
 * Rien n'est inventé pour meubler — ni note moyenne fictive, ni avis de
 * démonstration. Sur une clientèle dont le premier frein est la contrefaçon, un
 * faux témoignage repéré coûte plus cher que dix avis manquants.
 */

/** Rangée d'étoiles. Décorative : la note est toujours écrite à côté. */
function Etoiles({ note, taille = "h-4 w-4" }: { note: number; taille?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${taille} ${i <= note ? "fill-gold text-gold" : "text-border"}`} />
      ))}
    </span>
  );
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long" });
}

function CarteAvis({ avis }: { avis: KKReviewView }) {
  return (
    <li className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Etoiles note={avis.rating} />
        <span className="text-xs text-muted-foreground">{dateCourte(avis.createdAt)}</span>
      </div>

      {avis.title && <h3 className="mt-3 text-[1.05rem] leading-snug text-deep">{avis.title}</h3>}

      {/* Quatre lignes au plus dans la vue compacte : les avis n'ont pas tous
          la même longueur, et sans cette borne une seule tartine décale toute
          la rangée. Le texte entier reste dans le DOM, donc lisible aux
          lecteurs d'écran et indexable. */}
      <p className="mt-2 line-clamp-4 leading-relaxed text-foreground">{avis.body}</p>

      <p className="mt-3 text-sm">
        <span className="font-semibold text-deep">{avis.authorName}</span>
        {avis.city && <span className="text-muted-foreground"> · {avis.city}</span>}
      </p>
    </li>
  );
}

export function ProductReviews({
  productId,
  reviews,
}: {
  productId: string;
  reviews: KKProductReviews;
}) {
  const { items, count, average } = reviews;
  const enVue = items.slice(0, 3);
  const reste = items.slice(3);

  return (
    <section className="section mx-auto max-w-7xl px-6">
      {/* En-tête sur une seule ligne : le titre à gauche, la synthèse chiffrée
          au milieu, l'action à droite. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Avis clients</p>
          <h2 className="mt-2 text-deep">Ce qu&rsquo;en disent nos clientes</h2>
        </div>

        {count > 0 && (
          <div className="flex items-center gap-3">
            <span className="figure text-3xl font-semibold text-deep">
              {average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
            </span>
            <div>
              <Etoiles note={Math.round(average)} />
              <p className="mt-0.5 text-xs text-muted-foreground">
                {count} avis publié{count > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dépôt d'un avis — replié. `group` et `[&[open]]` font pivoter le
          chevron : sans repère visuel, un summary ne se lit pas comme un
          bouton. */}
      <details className="group mt-6 rounded-2xl border border-border/70 bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-deep">
            <PenLine className="h-4 w-4 text-gold-ink" />
            {count > 0 ? "Donner mon avis sur ce produit" : "Soyez la première à donner votre avis"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-deep transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/70 p-6 pt-5">
          <ReviewForm productId={productId} />
        </div>
      </details>

      {enVue.length > 0 ? (
        <>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enVue.map((avis) => (
              <CarteAvis key={avis.id} avis={avis} />
            ))}
          </ul>

          {reste.length > 0 && (
            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-deep transition hover:border-deep/50 [&::-webkit-details-marker]:hidden">
                Voir les {reste.length} autre{reste.length > 1 ? "s" : ""} avis
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reste.map((avis) => (
                  <CarteAvis key={avis.id} avis={avis} />
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucun avis publié pour le moment. Vous avez essayé ce produit&nbsp;? Votre retour aidera
          les prochaines personnes à décider.
        </p>
      )}
    </section>
  );
}
