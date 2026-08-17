import { Star, ArrowRight } from "lucide-react";
import { LocalizedLink as Link } from "./localized-link";
import type { KKReviewsSummary, KKTestimonialView } from "@/types/kk";

/**
 * Section « Avis clients ».
 *
 * ── Ce qu'elle remplace ───────────────────────────────────────────────────
 * Les avis vivaient en TROISIÈME COLONNE du panneau « Bon à savoir », à côté
 * des conseils et de l'avant/après, et un seul témoignage y était montré sur
 * les trois lus en base. La preuve sociale — le seul contenu de la page écrit
 * par quelqu'un d'autre que la marque — occupait donc un tiers de cadre
 * partagé, sans note moyenne ni volume. Elle prend ici une section entière.
 *
 * ── La règle qui commande tout le reste ───────────────────────────────────
 * AUCUN AVIS N'EST INVENTÉ, ET AUCUNE NOTE N'EST INVENTÉE. Les témoignages
 * viennent de `getHomeTestimonials` (avis modérés, note ≥ 4, corps d'au moins
 * 40 caractères) et l'agrégat de `getReviewsSummary`, calculé sur TOUTES les
 * notes publiées, mauvaises comprises. Sans avis publié, la section ne rend
 * rien du tout — pas de témoignage de remplissage, pas de « 0/5 », pas de
 * moyenne de repli. Publier de faux avis ou une note moyenne fabriquée est
 * une pratique commerciale trompeuse (article L121-2 du Code de la
 * consommation) ; c'est aussi ce qui ruinerait le bénéfice recherché sur un
 * marché dont le premier frein est la défiance.
 *
 * ── Fond blanc, et pas de motif ───────────────────────────────────────────
 * La section était montée sur le vert profond avec le tissage de marque en
 * fond. Elle passe en blanc à la demande du client — et le motif part avec,
 * pour une raison qui lui préexiste : la règle de `PatternBackdrop` le
 * proscrit sous du texte courant, et c'est ici la seule section de l'accueil
 * qui porte de vrais paragraphes de lecture. Les cartes se détachent du blanc
 * par un filet et une ombre, non par un aplat.
 *
 * ── La composition ────────────────────────────────────────────────────────
 * Deux temps. À gauche, LE CHIFFRE : la moyenne en grand, les étoiles, le
 * volume, et la répartition des notes — c'est ce qu'on regarde avant de lire
 * quoi que ce soit. À droite, LES VOIX : trois avis in extenso, chacun rendu
 * à son auteur et rattaché à la fiche du produit concerné, pour qu'un avis
 * mène à un achat plutôt qu'à un cul-de-sac.
 *
 * UNE SEULE RANGÉE. Les cartes passent en grille de trois à partir de `xl`
 * seulement : en dessous, la colonne de gauche laisse trop peu de place pour
 * trois cartes lisibles, et elles restent en rail à défilement — qui est lui
 * aussi une seule ligne, mais qui glisse. Passer en grille dès `lg` donnerait
 * des cartes de 170 px.
 */

/** Rangée d'étoiles. Une seule étiquette pour le lecteur d'écran, pas cinq. */
function Etoiles({ note, taille = "h-4 w-4" }: { note: number; taille?: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Note de ${note.toString().replace(".", ",")} sur 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`${taille} ${i < Math.round(note) ? "fill-gold text-gold" : "text-border"}`}
        />
      ))}
    </span>
  );
}

/**
 * Pastille d'initiales.
 *
 * Pas de photo : nous n'en avons pas, et en tirer une d'une banque d'images
 * pour illustrer un vrai avis reviendrait à fabriquer un visage de cliente.
 * Les initiales suffisent à rendre l'avis à quelqu'un. La teinte est tirée du
 * nom — donc stable d'un rendu à l'autre — parmi les cinq teintes de routine
 * de la charte, ce qui évite trois pastilles identiques côte à côte.
 */
const TEINTES = ["bg-tint-acne", "bg-tint-taches", "bg-tint-eclat", "bg-tint-age", "bg-tint-hydratation"];

function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

function teinte(nom: string): string {
  let somme = 0;
  for (let i = 0; i < nom.length; i += 1) somme += nom.charCodeAt(i);
  return TEINTES[somme % TEINTES.length];
}

/** « août 2026 » — le jour n'apporte rien et vieillit l'avis pour rien. */
function moisAnnee(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
}

function CarteAvis({ avis }: { avis: KKTestimonialView }) {
  const date = moisAnnee(avis.publishedAt);

  return (
    /* Carte blanche sur fond blanc : c'est le filet et l'ombre qui la
       détachent, pas un aplat. `--card` et `--background` valent la même
       valeur (#ffffff), un fond de carte ne servirait donc à rien. */
    <article className="kk-lift relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <Etoiles note={avis.rating} taille="h-4 w-4" />

      {avis.title && (
        <h3 className="relative mt-3 font-display text-base leading-snug text-deep">{avis.title}</h3>
      )}

      {/* `line-clamp-3` : les avis vont de deux lignes à un paragraphe entier.
          Sans plafond, une carte bavarde étirait toute la rangée et laissait
          ses voisines à moitié vides. Le plafond était à six lignes ; c'est la
          citation qui fixait la hauteur de la section, et trois lignes suffisent
          à donner le ton — l'avis entier se lit sur la page du produit. */}
      {/* L'écart sous la citation est une MARGE et non un padding. Sur un bloc
          coupé par `line-clamp` — un `-webkit-box` tronqué —, le padding
          intérieur agrandit la fenêtre de clipping : la quatrième ligne
          réapparaissait, tranchée en deux, sous les trois lignes autorisées. */}
      <blockquote
        className={`relative mb-4 line-clamp-3 text-sm leading-relaxed text-foreground ${avis.title ? "mt-2" : "mt-3"}`}
      >
        {avis.quote}
      </blockquote>

      {/* `mt-auto` : les cartes d'une même rangée prennent la hauteur de la
          plus haute, et un avis court laissait alors un vide PENDANT sous le
          lien produit. L'auteur et le lien sont maintenant plaqués en bas de
          carte — l'écart résiduel s'ouvre entre la citation et le trait de
          séparation, où il se lit comme de la respiration et non comme un
          oubli. */}
      <footer className="mt-auto flex items-center gap-3 border-t border-border pt-4">
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-xs font-semibold text-deep ${teinte(avis.author)}`}
        >
          {initiales(avis.author)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-deep">{avis.author}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[avis.city, date].filter(Boolean).join(" · ")}
          </p>
        </div>
      </footer>

      {/* L'avis renvoie au produit qu'il concerne : c'est ce qui le rend
          utile. Sans lien, le visiteur convaincu doit repartir chercher la
          référence à la main.
          Laiton d'ENCRE et non laiton plein : sur blanc, le laiton plein
          plafonne à 3,2:1 (voir `--gold-ink` dans globals.css). */}
      {avis.href ? (
        <Link
          href={avis.href}
          className="group mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold-ink transition hover:text-deep"
        >
          <span className="truncate">{avis.productName}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <p className="mt-3 truncate text-xs text-muted-foreground">{avis.productName}</p>
      )}
    </article>
  );
}

export function AvisClients({
  avis,
  resume,
}: {
  avis: KKTestimonialView[];
  resume: KKReviewsSummary;
}) {
  // Rien de publié, rien à montrer. Voir l'en-tête du fichier.
  if (avis.length === 0 || resume.total === 0) return null;

  // Une seule rangée : au-delà de trois, la grille repasse à la ligne et la
  // section double de hauteur pour dire la même chose. La page n'en demande
  // que trois (voir app/[locale]/page.tsx) ; la coupe ici est une ceinture.
  const cartes = avis.slice(0, 3);
  const moyenne = resume.average.toFixed(1).replace(".", ",");

  return (
    /*
     * SECTION RAMENÉE À SA PLUS COURTE EXPRESSION.
     *
     * Elle se composait en deux colonnes côte à côte : à gauche un panneau de
     * chiffres — sur-titre, titre en deux lignes de 36 px, moyenne en 60 px,
     * puis l'histogramme des cinq notes ; à droite trois cartes dont la
     * citation courait sur six lignes. Chacune tenait dans les 400 px, et la
     * rangée prenait la hauteur de la plus haute : la preuve sociale occupait
     * un écran entier au milieu du parcours.
     *
     * Ce qui a été coupé, dans l'ordre du gain :
     *   — L'HISTOGRAMME (≈ 150 px). Il détaillait la répartition des notes
     *     alors que la section n'a plus à convaincre à elle seule : la page
     *     /avis le porte en entier, et le lien y mène.
     *   — LA CITATION passe de six lignes à trois (≈ 70 px par carte, et
     *     c'est la carte qui fixe la hauteur de la rangée).
     *   — LE PANNEAU DE CHIFFRES devient une ligne : moyenne, étoiles et
     *     nombre d'avis se lisent maintenant côte à côte sous le titre, au
     *     lieu de s'empiler sur trois niveaux.
     *   — LES MARGES : palier `section` au lieu de `section-wide`, cartes en
     *     p-5 au lieu de p-7.
     *
     * Ce qui reste est ce qu'on vient chercher : la note, le volume, trois
     * voix. Le reste est à un clic.
     */
    <section className="bg-background">
      <div className="section mx-auto max-w-7xl px-6">
        {/* En-tête sur une seule ligne à partir de `sm` : le titre à gauche, la
            note à droite. Empilés, ils coûtaient deux blocs de hauteur pour
            deux informations qui se lisent d'un seul regard. */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="eyebrow">Avis clients</p>
            <h2 className="mt-1.5 font-display text-2xl leading-tight text-deep sm:text-[1.75rem]">
              Ce qu&rsquo;en disent celles et ceux qui ont essayé.
            </h2>
          </div>

          {/* La moyenne reste le plus gros caractère du bloc — c'est le chiffre
              qu'on vient chercher — mais en 36 px au lieu de 60. `figure`
              aligne les chiffres sur une chasse fixe (voir globals.css). */}
          <div className="flex items-center gap-3">
            <p className="figure font-display text-4xl leading-none text-deep">{moyenne}</p>
            <div>
              <Etoiles note={resume.average} taille="h-4 w-4" />
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="figure">{resume.total}</span> avis publié
                {resume.total > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* ──────────────────────────── LES VOIX ──────────────────────── */}
        {/* Rail à défilement sous `xl`, grille de trois au-delà — une seule
            rangée dans les deux cas. Les marges négatives rendent les cartes
            affleurantes au bord de l'écran : une carte coupée par la gouttière
            se lit comme mal placée, coupée par le bord elle se lit comme un
            rail. Même procédé que les routines.
            `py-1` sur la piste : sans lui, l'ombre des cartes et leur
            soulèvement au survol (`kk-lift`) seraient rognés par le cadre de
            défilement. */}
        <ul className="kk-piste -mx-6 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-1 pb-3 xl:mx-0 xl:grid xl:grid-cols-3 xl:gap-5 xl:overflow-visible xl:px-0 xl:pb-1">
          {cartes.map((a) => (
            <li key={a.id} className="w-[min(82vw,20rem)] shrink-0 snap-start xl:w-auto xl:shrink">
              <CarteAvis avis={a} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
