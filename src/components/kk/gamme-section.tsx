import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight } from "lucide-react";
import type { BrandFocusView } from "@/server/kk/brand-focus";

/**
 * FOCUS MARQUE — la maison mise en avant sur l'accueil, bloc 3 de la structure
 * fournie par le client (« mise en avant Nubiance · storytelling + bénéfices »).
 *
 * ── Ce qu'elle était ──────────────────────────────────────────────────────
 * Une section « Une gamme pour chaque problème » : sur-titre « Notre gamme »,
 * titre « Un problème, une réponse qui existe. », un paragraphe sur les gênes
 * de peau, puis quatre pastilles de préoccupations ouvrant chacune son rayon
 * filtré. Le focus marque n'y était qu'un encadré, en cinquième position.
 * Tout cela a été retiré : quatre niveaux de discours passaient avant le seul
 * sujet du bloc, et la photo de fond montre des flacons Nubiance depuis le
 * début.
 *
 * ── Ce qu'elle est ────────────────────────────────────────────────────────
 * Une seule prise de parole : la maison, son accroche, son argumentaire, le
 * nombre de références disponibles, et deux portes — le diagnostic, les
 * routines.
 *
 * Le nom, l'accroche et le texte viennent de `getBrandFocus`, pas d'ici, et le
 * nombre de références est COMPTÉ EN BASE. Deux conséquences : le chiffre
 * annoncé est toujours celui du catalogue servable, et le bloc disparaît de
 * lui-même le jour où la maison n'est plus distribuée, au lieu de vanter une
 * marque qu'on ne vend pas. Les deux boutons, eux, tiennent sans elle.
 *
 * ── Et l'entrée par préoccupation ? ───────────────────────────────────────
 * Elle n'est pas perdue : le diagnostic pose les questions et mène au même
 * rayon filtré, et le méga-menu de l'en-tête ouvre le catalogue par besoin.
 * `PREOCCUPATIONS` (`src/lib/kk/besoins.ts`) reste la source de ces filtres.
 */
export function GammeSection({ focus }: { focus?: BrandFocusView | null }) {
  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      {/* La photo couvre TOUTE la section, bord à bord.
          Elle était bornée au deux tiers droits, ce qui laissait un aplat de
          fond nu à gauche et une couture visible là où l'image commençait.
          Sa composition s'y prête : les flacons sont cadrés à droite et le vert
          sombre s'étend sur toute la moitié gauche — c'est ce vert-là qui porte
          le texte, et non un aplat rapporté. */}
      <div className="absolute inset-0">
        <Image
          src="/images/editorial/gamme-nubiance.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover object-right"
        />
        {/* Voile noir, comme sur le hero : il assombrit sans déplacer les
            teintes de la photo. Dense à gauche sous le texte, léger à droite
            où les produits doivent rester nets.

            RENFORCÉ. Chaque arrêt a été remonté, et la fin de course ne tombe
            plus à zéro :

              gauche  0,82 → 0,88     55 %  0,45 → 0,62
              30 %    0,72 → 0,82     78 %  0,15 → 0,34
                                     droite 0    → 0,12

            Deux raisons. D'abord la photo elle-même : ses zones claires — les
            reflets sur les flacons, le fond dégradé — remontaient sous le
            texte, et un voile à 45 % au milieu de la course n'y suffisait pas
            pour du blanc.

            Ensuite et surtout le MOBILE. Le bloc de texte est borné à 36 rem,
            mais sous 576 px il occupe toute la largeur : la fin de chaque
            ligne tombait alors dans la zone où le voile s'éteignait, c'est-à-
            dire sur la photo nue. D'où le plancher de 0,12 au bord droit — il
            ne coûte presque rien à la lisibilité des produits sur grand écran,
            et il évite qu'un mot se perde sur un reflet au téléphone. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgb(0 0 0 / 0.88) 0%, rgb(0 0 0 / 0.82) 30%, rgb(0 0 0 / 0.62) 55%, rgb(0 0 0 / 0.34) 78%, rgb(0 0 0 / 0.12) 100%)",
          }}
        />
      </div>

      <div className="section-wide relative mx-auto max-w-7xl px-6">
        <div className="max-w-xl">
          {/* ─────────────────── LA MAISON MISE EN AVANT ───────────────────
              Elle n'est plus un encadré au milieu de la section : ELLE EST LA
              SECTION, cadre compris. Le sur-titre « Notre gamme », le titre
              « Un problème, une réponse qui existe. », le paragraphe sur les
              gênes et les quatre pastilles de préoccupations ont été retirés —
              quatre niveaux de discours avant d'arriver au seul sujet du bloc.

              Les préoccupations restent joignables : le diagnostic, juste en
              dessous, mène au même rayon filtré en posant les bonnes questions,
              et le méga-menu de l'en-tête ouvre le catalogue par besoin. */}
          {focus && (
            /* SANS CADRE. Le bloc était posé dans un panneau — filet blanc,
               fond noir à 25 %, flou d'arrière-plan, 28 px de padding. Sur une
               photo déjà voilée, ce cadre ajoutait un second voile par-dessus
               le premier et découpait un rectangle au milieu d'une image qui
               court d'un bord à l'autre. Le texte se pose directement sur le
               voile, comme celui du hero : c'est le dégradé de la section qui
               porte la lisibilité, pas une boîte rapportée. */
            <div>
              {/* « La maison que nous mettons en avant » : sept mots pour dire
                  ce que trois disent mieux, et une formule qui parlait de nous
                  au moment de présenter quelqu'un d'autre. */}
              <p className="eyebrow eyebrow-on-dark">Marque à l&rsquo;honneur</p>

              {/* Le nom porte le titre de la section — c'est lui qu'on doit
                  retenir. En Cinzel, la serif des logotypes de la maison : un
                  nom de marque n'est pas une phrase, il se pose. */}
              <h2 className="wordmark mt-2.5 text-3xl leading-none text-white sm:text-4xl">
                {focus.brand}
              </h2>

              <p className="mt-3 font-display text-lg leading-snug text-white/90">{focus.claim}</p>

              <p className="mt-3.5 text-sm leading-relaxed text-white/80">{focus.description}</p>
            </div>
          )}

          {/* LES DEUX ACTIONS SUR UNE SEULE LIGNE.
              Le bouton de la marque vivait dans le bloc de texte et le lien des
              routines huit pixels plus bas, dans sa propre rangée : deux
              alignements pour deux liens voisins. Ils partagent maintenant la
              même rangée — le plein d'abord, le lien ensuite —, et
              `flex-wrap` les empile proprement quand la largeur manque.

              « FAIRE MON DIAGNOSTIC » A ÉTÉ RETIRÉ de cette rangée : il portait
              le laiton plein à côté du bouton blanc, et deux actions pleines
              côte à côte se disputent le clic au lieu de le diriger. Le
              diagnostic garde ses entrées dans le hero, la section avant/après
              et la navigation de l'en-tête. */}
          {/* LES ROUTINES PASSENT EN PREMIER, ET PRENNENT LE PLEIN.
              L'ordre s'inverse : le lien des routines ouvre la rangée, le
              catalogue de la maison le suit. Les deux rôles suivent la position
              — un lien souligné placé devant un bouton plein resterait second
              pour l'œil quoi qu'en dise l'ordre du DOM, et la rangée se lirait
              de droite à gauche. C'est la même hiérarchie que dans le hero, où
              « Trouvez votre routine » porte l'aplat et le reste suit. */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            {/* « AVEC Nubiance », et non « routines Nubiance ».
                Les routines ne sont pas composées par marque : `seed-routines`
                les monte geste par geste, en piochant dans tout le catalogue
                selon la catégorie et les tags. La Routine Acné, par exemple,
                mêle deux références Nubiance et deux d'une autre maison.
                « Nos routines Nubiance » annoncerait donc une composition qui
                n'existe pas — la formule retenue nomme la maison sans
                revendiquer l'exclusivité. Le jour où des routines réellement
                mono-marque sont créées, le libellé peut devenir littéral. */}
            <Link
              href="/routines"
              className="group inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-white"
            >
              Nos routines avec {focus?.brand ?? "cette maison"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Le libellé annonçait « Voir les 9 références Nubiance ».
                Le compte venait de la base et restait donc juste, mais un petit
                nombre affiché sur un bouton se lit comme un catalogue maigre —
                il dessert la maison qu'on met en avant.
                `focus.productCount` sert toujours, en amont : `getBrandFocus`
                renvoie `null` quand il tombe à zéro, et la section entière
                disparaît plutôt que de vanter une marque sans stock.

                Le lien passe par la recherche faute de page de marque — c'est
                le chemin qu'emprunte déjà la page /marques. */}
            {focus && (
              <Link
                href={`/recherche?q=${encodeURIComponent(focus.brand)}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                Voir les produits {focus.brand}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
