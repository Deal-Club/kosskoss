import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Bath,
  Check,
  Droplet,
  Droplets,
  FlaskConical,
  MessageCircle,
  Pipette,
  Plus,
  RefreshCw,
  Scissors,
  ShieldCheck,
  ShowerHead,
  Smartphone,
  Smile,
  SprayCan,
  Sparkles,
  Star,
  Sun,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { NavGroup } from "@/server/kk/navigation";
import type { HomeFaqEntry } from "@/server/kk/home-faq";
import type { BrandFocusView } from "@/server/kk/brand-focus";
import type { AvantApresView } from "@/data/kk/avant-apres";
import type { KKTestimonialView } from "@/types/kk";

/**
 * Sections d'accueil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * L'ORDRE DES BLOCS N'EST PAS UN CHOIX D'AUTEUR.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La maquette « Toutes pages » livrée par le client (voir
 * docs/design-references/kks/) porte une colonne « STRUCTURE DU SITE » avec
 * treize blocs numérotés et annotés. C'est la « philosophie de l'agencement »
 * qu'il dit ne pas percevoir : elle était écrite, elle n'était pas appliquée.
 *
 *    1 Hero · 2 Promesses clés · 3 Focus marque · 4 Diagnostic ·
 *    5 Achat rapide routines · 6 Catégories · 7 Best-sellers ·
 *    8 Conseils · 9 Avant/après · 10 Avis · 11 Services ·
 *    12 Newsletter · 13 Footer
 *
 * Le point décisif est l'ordre : les deux modules « solution » (diagnostic,
 * routines) passent AVANT les modules « produit » (catégories, best-sellers).
 * L'accueil précédent faisait l'inverse — trois blocs produit avant le
 * diagnostic, et aucune routine.
 *
 * Second changement de fond : la réassurance remonte en position 2. Elle était
 * en onzième position, alors que l'identité de marque désigne la peur de la
 * contrefaçon comme le premier frein de la cible.
 *
 * Troisième : deux blocs disaient la même chose sur nous-mêmes (« un
 * concept-store, pas un catalogue de plus » et « des soins choisis avec
 * méthode »). La maquette occupe cette place par un focus sur une marque
 * distribuée — c'est-à-dire par quelque chose qu'on peut acheter.
 */

/* ---------------------------------------------------------- 2. Promesses -- */

/**
 * Les quatre promesses, immédiatement sous le hero.
 *
 * Bande basse et serrée, comme sur la maquette : ce n'est pas une section, c'est
 * une ceinture de réassurance. L'authenticité passe en tête — c'est la première
 * inquiétude de cette clientèle, avant le prix et avant le délai.
 */
export function PromisesRow() {
  const items = [
    { icon: BadgeCheck, title: "Sélection experte", text: "Produits testés et approuvés" },
    { icon: ShieldCheck, title: "Paiement sécurisé", text: "Transactions protégées" },
    { icon: Truck, title: "Livraison rapide", text: "Partout au Cameroun" },
    { icon: MessageCircle, title: "Conseils personnalisés", text: "Par des experts skincare" },
  ];

  return (
    /* Fond de page, pas d'aplat : cette bande court sur toute la largeur, juste
       sous le hero, et son sable se lisait comme la couleur de fond du site.
       Le vert profond du hero la délimite en haut, un filet la ferme en bas —
       c'est tout ce dont elle a besoin pour se détacher. */
    <section className="border-b border-border/60 bg-background">
      <div className="section-tight mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-deep">{title}</p>
              <p className="text-xs leading-snug text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------- 3. Focus marque + 4. Diagnostic */

/**
 * Le module de diagnostic, tel que la maquette le compose : une carte posée
 * dans la section « Focus marque », qui ANNONCE LES CINQ QUESTIONS avant le
 * clic.
 *
 * C'est ce qui a permis de supprimer l'écran d'intro du parcours (voir
 * diagnostic-flow.tsx) : la promesse — cinq questions, gratuit, sans engagement
 * — est tenue ici, donc le bouton peut mener directement à la question 1 au lieu
 * d'un second écran qui redemandait le même clic.
 */
function DiagnosticCard({ questions }: { questions: string[] }) {
  return (
    <div className="rounded-2xl bg-cream p-7 shadow-2xl shadow-deep/20 sm:p-8">
      <p className="eyebrow">Diagnostic beauté</p>
      <h3 className="mt-2 font-display text-2xl leading-tight text-deep">
        Votre routine idéale en 3 minutes
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Répondez à {questions.length} questions et recevez votre routine personnalisée.
      </p>

      <ol className="mt-5 space-y-2.5">
        {questions.map((titre, i) => (
          <li key={titre} className="flex items-start gap-2.5 text-sm text-deep">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-gold text-gold">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>
              <span className="text-muted-foreground">{i + 1}. </span>
              {titre}
            </span>
          </li>
        ))}
      </ol>

      <Link
        href="/diagnostic"
        className="kk-fill kk-fill-deep group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-deep"
      >
        Commencer le diagnostic
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        100 % personnalisé · Gratuit · Sans engagement
      </p>
    </div>
  );
}

/**
 * Bloc 3 : mise en avant d'une maison distribuée.
 *
 * Il remplace les deux sections qui parlaient de nous. La différence est
 * commerciale autant qu'éditoriale : à cet endroit de la page, la maquette
 * montre une marque qu'on peut acheter plutôt qu'un discours sur notre méthode.
 *
 * La marque n'est pas écrite en dur : elle est lue en base (voir
 * server/kk/brand-focus.ts). Si elle disparaît du catalogue, la section se
 * masque au lieu d'annoncer une maison qu'on ne distribue plus.
 */
export function BrandFocus({
  focus,
  questions,
}: {
  focus: BrandFocusView | null;
  questions: string[];
}) {
  if (!focus) return null;

  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      {/* `items-center` : la colonne de texte est plus courte que la carte de
          diagnostic depuis que le panneau de packshots a été retiré. Alignées
          en haut, elles laissaient un vide sous le texte. */}
      <div className="section-wide mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow eyebrow-on-dark">Focus marque</p>
          <h2 className="mt-3 font-display text-4xl leading-none text-primary-foreground sm:text-5xl">
            {focus.brand}
          </h2>
          <p className="mt-3 font-display text-xl leading-snug text-primary-foreground">
            {focus.claim}
          </p>
          <p className="mt-5 max-w-lg leading-relaxed text-primary-foreground">
            {focus.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href={`/recherche?q=${encodeURIComponent(focus.brand)}`}
              className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-sand px-6 py-3 text-sm font-semibold text-deep"
            >
              Découvrir la marque
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <span className="figure text-sm text-primary-foreground">
              {focus.productCount} référence{focus.productCount > 1 ? "s" : ""} au catalogue
            </span>
          </div>

          {/* Le panneau qui montrait quatre packshots de la maison a été retiré.
              Posés sur le vert profond, leurs fonds de studio ressortaient ;
              rapatriés sur une dalle claire, ils devenaient une grande surface
              vide occupée par de petits flacons. Le bloc dit ce qu'il a à dire
              — la maison, son parti pris, le lien vers ses références — et les
              produits se montrent là où c'est leur place : dans les rails et
              les routines. */}
        </div>

        <DiagnosticCard questions={questions} />
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 6. Catégories -- */

/**
 * Accès direct aux rayons, en pastilles.
 *
 * Les grandes cartes précédentes occupaient un écran entier pour trois liens.
 * La maquette traite les catégories comme un raccourci — petites pastilles
 * rondes, deux rangées, à côté des best-sellers — et non comme une section.
 * C'est aussi ce qui permet de tenir treize blocs sans doubler la hauteur de
 * page : la maquette compose en colonnes là où l'accueil empilait des bandes
 * pleine largeur.
 */
/**
 * Une icône par catégorie, comme sur la maquette.
 *
 * La même silhouette de flacon servait pour toutes : la grille se lisait comme
 * un damier indifférencié et l'icône n'aidait pas à choisir. La table est
 * explicite parce que les slugs viennent de la base — une catégorie inconnue
 * retombe sur la goutte, jamais sur rien.
 *
 * `cheveux` et `masques` y figurent alors que le catalogue ne les contient pas
 * encore : ce sont deux entrées prévues, prêtes à s'afficher le jour où elles
 * sont créées. Toute autre catégorie ajoutée sans icône ici s'affichera avec la
 * goutte — c'est correct, mais c'est le signe qu'il faut compléter la table.
 */
const ICONE_CATEGORIE: Record<string, LucideIcon> = {
  nettoyants: SprayCan,
  toniques: FlaskConical,
  traitements: Pipette,
  hydratants: Droplets,
  solaires: Sun,
  corps: Bath,
  hygiene: ShowerHead,
  homme: UserRound,
  cheveux: Scissors,
  masques: Smile,
};

export function CategoryPills({ groups }: { groups: NavGroup[] }) {
  const categories = groups.flatMap((g) => g.categories);
  if (categories.length === 0) return null;

  return (
    /* `h-full` et colonne flex : la carte doit atteindre la hauteur du rail de
       best-sellers qu'elle accompagne, les deux blocs étant posés côte à côte.
       Le `mt-auto` sur le pied de carte absorbe la différence — l'écart s'ouvre
       entre les icônes et les deux liens, jamais à l'intérieur de la grille
       d'icônes, qui garde son pas régulier. */
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <p className="eyebrow">Shoppez par catégorie</p>
      <h2 className="mt-2 text-deep">Par où commencer</h2>

      {/* TROIS PAR LIGNE, et non quatre.

          Le catalogue compte huit catégories : à quatre par ligne elles
          tenaient en deux rangées et la carte restait nettement plus courte que
          le rail de best-sellers posé à côté. À trois, les mêmes huit entrées
          occupent trois rangées et les deux blocs s'équilibrent — sans inventer
          de catégorie. Une catégorie sans produit est d'ailleurs masquée
          d'office par la navigation (voir server/kk/navigation.ts) : en créer
          pour remplir la grille ne remplirait rien du tout.

          `flex` plutôt que `grid` pour une seule raison : la dernière rangée
          est incomplète (8 = 3 + 3 + 2) et se centre, là où une grille la
          collerait à gauche en laissant un trou à droite. Le plafond de douze
          laisse la place à une quatrième rangée si le catalogue s'étoffe. */}
      <ul className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-5">
        {categories.slice(0, 12).map((category) => {
          const Icone = ICONE_CATEGORIE[category.slug] ?? Droplet;
          return (
            /* (100 % − deux gouttières de 0.75rem) / 3 */
            <li key={category.href} className="w-[calc((100%-1.5rem)/3)]">
              <Link href={category.href} className="group flex flex-col items-center gap-2 text-center">
                {/* 72 px sur grand écran, 56 sur mobile.

                    Le 72 vient du passage de quatre à trois colonnes, qui a
                    élargi chaque case d'un tiers — mais seulement là où la
                    carte occupe un tiers de la page. Sur un téléphone elle
                    prend toute la largeur : trois cases dans 264 px utiles font
                    80 px chacune, et un cercle de 72 les remplissait au point
                    de se toucher. Le rapport icône/pastille reste à 44 % dans
                    les deux cas. */}
                <span className="grid h-14 w-14 place-items-center rounded-full bg-sand text-deep transition group-hover:bg-taupe sm:h-[4.5rem] sm:w-[4.5rem]">
                  <Icone className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={1.5} />
                </span>
                <span className="text-xs font-medium leading-snug text-deep">{category.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
        <Link
          href="/soins-visage"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-deep transition hover:border-deep/50 hover:bg-sand"
        >
          Voir toutes les catégories
        </Link>
        <Link
          href="/routines"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-deep kk-underline"
        >
          Ou partez d&rsquo;une routine
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------ 8 + 9 + 10. Conseils & preuves -- */

/**
 * Une seule section pour les blocs 8, 9 et 10 de la structure client —
 * « Conseils & contenu », « Avant / après » et « Avis clientes ».
 *
 * Ils étaient rendus en trois cartes autonomes posées côte à côte : trois
 * cadres, trois sur-titres dorés, trois titres de section, pour ce qui est un
 * seul propos — la preuve. À l'écran, cela faisait trois blocs qui se
 * disputaient l'attention là où il n'en fallait qu'un, et multipliait les
 * accents de couleur sans rien hiérarchiser.
 *
 * Un seul cadre, un seul titre, trois colonnes séparées par un filet. Les
 * colonnes absentes ne laissent pas de trou : le nombre de colonnes suit le
 * nombre de panneaux réellement servis, l'avant/après restant masqué tant
 * qu'aucun cas réel n'est fourni (voir src/data/kk/avant-apres.ts).
 */
function PanelTitre({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function InsightsSection({
  entries,
  cases,
  testimonials,
}: {
  entries: HomeFaqEntry[];
  cases: AvantApresView[];
  testimonials: KKTestimonialView[];
}) {
  const panneaux: React.ReactNode[] = [];

  if (entries.length > 0) {
    panneaux.push(
      <div key="conseils">
        <div className="flex items-baseline justify-between gap-4">
          <PanelTitre>Conseils &amp; guides</PanelTitre>
          <Link
            href="/faq"
            className="shrink-0 text-xs font-medium text-deep kk-underline"
          >
            Tout voir
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {entries.slice(0, 4).map((entry) => (
            <details key={entry.question} className="group border-b border-border/60 pb-3 last:border-0">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium text-deep [&::-webkit-details-marker]:hidden">
                {entry.question}
                <Plus
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>,
    );
  }

  if (cases.length > 0) {
    const cas = cases[0];
    panneaux.push(
      <div key="avant-apres">
        <PanelTitre>Avant / après</PanelTitre>
        <figure className="mt-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image src={cas.image} alt={cas.alt} fill sizes="(max-width:1024px) 100vw, 30vw" className="object-cover" />
            <span className="absolute bottom-3 left-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-medium text-primary-foreground">
              Avant
            </span>
            <span className="absolute bottom-3 right-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-medium text-primary-foreground">
              Après
            </span>
          </div>
          <figcaption className="mt-4">
            <p className="text-sm font-semibold text-deep">{cas.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{cas.caption}</p>
            {cas.routineHref && (
              <Link
                href={cas.routineHref}
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-deep kk-underline"
              >
                Voir la routine
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </figcaption>
        </figure>
      </div>,
    );
  }

  if (testimonials.length > 0) {
    const t = testimonials[0];
    panneaux.push(
      <div key="avis">
        <PanelTitre>Elles nous font confiance</PanelTitre>
        <figure className="mt-5">
          <div className="flex items-center gap-0.5" aria-label={`Note ${t.rating} sur 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-gold text-gold" : "text-border"}`} />
            ))}
          </div>
          <blockquote className="mt-4 text-[0.95rem] leading-relaxed text-foreground">
            « {t.quote} »
          </blockquote>
          <figcaption className="mt-4 text-sm">
            <span className="font-semibold text-deep">{t.author}</span>
            {t.city && <span className="text-muted-foreground"> · {t.city}</span>}
            <span className="mt-1 block text-muted-foreground">à propos de {t.productName}</span>
          </figcaption>
        </figure>
      </div>,
    );
  }

  if (panneaux.length === 0) return null;

  // Le nombre de colonnes suit le nombre de panneaux servis : à deux panneaux,
  // une grille de trois laisserait une colonne vide et déséquilibrerait la
  // section — exactement le défaut qu'on cherche à corriger.
  const colonnes =
    panneaux.length === 1 ? "" : panneaux.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="section mx-auto max-w-7xl px-6">
      <div className="rounded-[1.75rem] border border-border/70 bg-card px-7 py-9 sm:px-10 sm:py-11">
        <div className="mb-9">
          <p className="eyebrow">Bon à savoir</p>
          <h2 className="mt-2 text-deep">Conseils, résultats et avis</h2>
        </div>

        {/* `divide-x` trace un filet entre les colonnes plutôt qu'un cadre
            autour de chacune : la séparation se lit, la section reste une. */}
        <div className={`grid gap-9 ${colonnes} md:divide-x md:divide-border/70`}>
          {panneaux.map((panneau, i) => (
            <div key={i} className={i > 0 ? "md:pl-9" : undefined}>
              {panneau}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 11. Services -- */

/**
 * Bloc 11 : « Services & engagements ».
 *
 * Distinct des promesses du bloc 2 : celles-ci portent sur l'achat (sélection,
 * paiement, livraison, conseil), celles-là sur l'après (authenticité,
 * accompagnement, retour, moyens de paiement locaux).
 */
export function ServicesBand({ whatsappUrl }: { whatsappUrl?: string }) {
  const items = [
    { icon: BadgeCheck, title: "Produits authentiques", text: "Circuits d'approvisionnement tracés" },
    { icon: UserRound, title: "Experts à votre écoute", text: "Conseil avant et après l'achat" },
    { icon: RefreshCw, title: "Satisfait ou remboursé", text: "14 jours pour changer d'avis" },
    { icon: Smartphone, title: "Mobile Money", text: "Orange Money & MTN" },
  ];

  return (
    <section className="bg-deep text-primary-foreground">
      <div className="section mx-auto max-w-7xl px-6">
        <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold text-primary-foreground">{title}</p>
                <p className="mt-0.5 text-sm text-primary-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        {whatsappUrl && (
          <p className="mt-9 border-t border-primary-foreground/15 pt-7 text-center text-sm text-primary-foreground">
            Une question avant d&rsquo;acheter ?{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary-foreground kk-underline"
            >
              <MessageCircle className="h-4 w-4" />
              Écrivez-nous sur WhatsApp
            </a>{" "}
            — on répond dans la journée.
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Diagnostic -- */

/**
 * Rappel du diagnostic, posé juste après les best-sellers et avant la section
 * « Bon à savoir » — c'est la place demandée par le client.
 *
 * Il s'adresse à qui vient de parcourir le rayon sans se reconnaître dans aucun
 * produit. Volontairement sobre : le module complet est en haut de page
 * (bloc 4), celui-ci n'est qu'une porte de sortie.
 */
export function DiagnosticReminder() {
  return (
    <section className="section mx-auto max-w-7xl px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-taupe px-8 py-9">
        <div>
          <h2 className="text-deep">Vous ne savez pas par où commencer ?</h2>
          <p className="mt-1.5 text-sm text-deep">
            Cinq questions sur votre peau, et nous composons votre routine.
          </p>
        </div>
        <Link
          href="/diagnostic"
          className="kk-fill group inline-flex shrink-0 items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          <Sparkles className="h-4 w-4" />
          Faire mon diagnostic
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
