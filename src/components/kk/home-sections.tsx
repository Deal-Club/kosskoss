import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { NavGroup } from "@/server/kk/navigation";
import type { HomeFaqEntry } from "@/server/kk/home-faq";
import { Flourish, Petal } from "./motifs";
import { PatternBackdrop } from "./pattern-backdrop";

/**
 * Sections d'accueil bâties sur des données réelles du catalogue.
 *
 * Elles vivent à part de `home.tsx` — qui porte le haut de page historique —
 * parce qu'elles ont besoin de la navigation et des marques lues en base, là où
 * les autres se contentent des produits qu'on leur passe.
 *
 * Aucun chiffre n'est écrit à la main ici : le nombre de références, celui des
 * marques et la liste des univers sont comptés dans la base au moment du rendu.
 */

/**
 * Visuels de secours par univers, tant que les catégories n'ont pas d'image.
 *
 * Ce sont des photos de produits réels du catalogue : les visuels génériques
 * p1/p3/p6 ont disparu avec le catalogue de démonstration, et les référencer
 * laissait trois images cassées sur l'accueil. Les clés suivent les slugs
 * d'univers réellement en base — « corps-cheveux » n'existe plus.
 */
const UNIVERSE_IMAGE: Record<string, string> = {
  "soins-visage": "/images/products/BOJ-GLO-SER-30.jpg",
  "corps-hygiene": "/images/products/NUB-BAU-COR-450.jpg",
  homme: "/images/products/CLI-MEN-DEO-75.jpg",
};

const FALLBACK_IMAGE = "/images/products/BOJ-GIN-CLE-210.jpg";

/* ----------------------------------------------------------- Nos univers -- */

/**
 * Les deux (ou N) univers du catalogue, en grandes cartes.
 *
 * C'est le raccourci de navigation qui manquait sur l'accueil : jusqu'ici, le
 * seul chemin vers une catégorie précise passait par le menu déroulant.
 */
export function UniverseCards({ groups }: { groups: NavGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-8">
        <p className="eyebrow">Nos univers</p>
        <h2 className="mt-2 text-2xl text-deep sm:text-3xl">Par où commencer</h2>
      </div>

      {/* Trois univers, donc trois colonnes sur grand écran : ils tiennent sur
          une seule ligne et se lisent comme un choix, pas comme une liste. */}
      <div className="kk-enter-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const total = group.categories.reduce((sum, c) => sum + c.productCount, 0);
          return (
            <article
              key={group.slug}
              className="kk-lift group relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card"
            >
              <Link href={group.href} className="block">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={UNIVERSE_IMAGE[group.slug] ?? FALLBACK_IMAGE}
                    alt={group.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* Voile bleu profond : il assure la lisibilité du titre
                      quelle que soit la photo, sans retoucher les visuels. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/60 to-deep/10" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-[family-name:var(--font-display,inherit)] text-2xl text-primary-foreground">
                      {group.label}
                    </h3>
                    <p className="mt-1 text-sm text-primary-foreground/80">
                      {total} référence{total > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2 p-5">
                {group.categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={category.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-cream px-3.5 py-1.5 text-xs font-medium text-deep transition hover:border-deep/50 hover:bg-sand"
                  >
                    {category.label}
                    <span className="figure text-[0.65rem] text-muted-foreground">
                      {category.productCount}
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Nos marques -- */

/**
 * Bandeau des marques présentes au catalogue.
 *
 * L'authenticité est la première inquiétude sur ce marché — devant le prix et
 * le délai. Nommer les maisons distribuées répond à cette question avant même
 * qu'elle soit posée, et chaque nom mène à ses produits.
 */
export function BrandStrip({ brands }: { brands: string[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="kk-enter border-y border-border/60 bg-sand/40">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:max-w-xs">
            <p className="eyebrow">Nos marques</p>
            <h2 className="mt-2 text-xl text-deep">
              {brands.length} maisons distribuées
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Des références reconnues, achetées par des circuits sérieux.
            </p>
          </div>

          <ul className="flex flex-wrap items-center gap-x-3 gap-y-3 lg:justify-end">
            {brands.map((brand) => (
              <li key={brand}>
                <Link
                  href={`/recherche?q=${encodeURIComponent(brand)}`}
                  className="inline-block rounded-full border border-border/70 bg-cream px-4 py-2 text-[0.78rem] font-medium uppercase tracking-[0.12em] text-deep/80 transition hover:border-deep/50 hover:bg-card hover:text-deep"
                >
                  {brand}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ La maison -- */

/**
 * Présentation de la maison, sur fond bleu profond.
 *
 * Le fond sombre est le seul de la page : il marque une pause dans le déroulé
 * crème et donne à cette section le poids d'une prise de parole.
 *
 * Les trois repères chiffrés sont comptés en base — jamais d'indicateur inventé
 * (nombre de clients, années d'existence) tant qu'il n'est pas vérifiable.
 */
export function MaisonSection({
  productCount,
  brandCount,
  universeCount,
}: {
  productCount: number;
  brandCount: number;
  universeCount: number;
}) {
  const figures = [
    { value: productCount, label: "références en catalogue" },
    { value: brandCount, label: "maisons distribuées" },
    { value: universeCount, label: "univers de soin" },
  ];

  const pillars = [
    {
      icon: ShieldCheck,
      title: "Authenticité d'abord",
      text: "Chaque référence vient d'un circuit d'approvisionnement identifié. C'est la première question qu'on nous pose, elle mérite une réponse claire.",
    },
    {
      icon: Leaf,
      title: "Une sélection courte",
      text: "Nous filtrons l'offre au lieu de l'empiler. Un produit entre au catalogue pour sa formule et sa tolérance, pas pour remplir un rayon.",
    },
    {
      icon: MapPin,
      title: "Pensé pour ici",
      text: "Peaux riches en mélanine, climat d'Afrique centrale, habitudes locales : nos conseils partent de ce contexte, pas d'un manuel importé.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      {/* Motif de marque. C'est ici la prise de parole de la maison : le seul
          endroit de l'accueil où un fond travaillé se justifie pleinement. */}
      <PatternBackdrop align="split" />

      <Flourish className="pointer-events-none absolute -right-24 top-10 hidden h-48 w-[32rem] text-primary-foreground/10 lg:block" />
      <Petal className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 text-primary-foreground/[0.06]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground/60">
              La maison
            </p>
            <h2 className="mt-4 text-3xl leading-tight sm:text-4xl">
              Un concept-store, pas un catalogue de plus
            </h2>
            <p className="mt-6 leading-relaxed text-primary-foreground/80">
              KossKoss Select réunit une sélection de soins pour les peaux noires, mates et
              métissées. Nous ne vendons pas tout ce qui existe : nous choisissons, nous
              expliquons, et nous assumons ce qui reste au catalogue.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4">
              {figures.map((figure) => (
                <div key={figure.label}>
                  <dt className="sr-only">{figure.label}</dt>
                  <dd>
                    <span className="figure block text-3xl font-semibold text-primary-foreground">
                      {figure.value}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-primary-foreground/60">
                      {figure.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/a-propos"
                className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-sand px-6 py-3 text-sm font-semibold text-deep"
              >
                Notre maison
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/diagnostic"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/85 underline-offset-4 hover:underline"
              >
                Faire le diagnostic
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <ul className="kk-enter-stagger grid gap-4 self-center">
            {pillars.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="kk-lift rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-6 backdrop-blur-sm hover:border-primary-foreground/30"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-deep">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-primary-foreground">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/70">
                      {text}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ Questions fréquentes -- */

/**
 * Questions fréquentes, en grille 4 × 2 sur grand écran.
 *
 * Les réponses proviennent de la page /faq (voir `getHomeFaq`) : un seul texte,
 * deux endroits d'affichage. Chaque carte est un `<details>` natif — pas de
 * JavaScript, pas d'état à hydrater, et le repli reste accessible au clavier
 * comme aux lecteurs d'écran.
 */
export function HomeFaq({ entries }: { entries: HomeFaqEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Bon à savoir</p>
          <h2 className="mt-2 text-2xl text-deep sm:text-3xl">Les questions qu&rsquo;on nous pose</h2>
        </div>
        <Link
          href="/faq"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep underline-offset-4 hover:underline"
        >
          Toutes les questions
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="kk-enter-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <details
            key={entry.question}
            className="kk-lift group rounded-2xl border border-border/70 bg-card p-5"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium text-deep [&::-webkit-details-marker]:hidden">
              {entry.question}
              <Plus
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- Appel -- */

/**
 * Appel à l'action de bas de page.
 *
 * Deux portes, pas une : le diagnostic pour qui ne sait pas quoi choisir,
 * WhatsApp pour qui veut parler à quelqu'un. Sur ce marché, la conversation
 * précède souvent l'achat — proposer seulement un bouton « acheter » laisserait
 * de côté une bonne part des visiteurs.
 *
 * Le lien WhatsApp ne s'affiche pas si aucun numéro n'est configuré : mieux
 * vaut un seul bouton qu'un lien qui ne mène nulle part.
 */
export function HomeCta({ whatsappUrl }: { whatsappUrl?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="relative overflow-hidden rounded-[2rem] bg-deep px-8 py-14 text-center text-primary-foreground sm:px-14 sm:py-16">
        <PatternBackdrop align="center" />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground/60">
            On vous accompagne
          </p>
          <h2 className="mt-4 text-3xl leading-tight sm:text-4xl">
            Vous ne savez pas par où commencer ?
          </h2>
          <p className="mx-auto mt-5 text-primary-foreground/75">
            Répondez à cinq questions sur votre peau : nous composons une routine adaptée, à votre
            budget. Et si vous préférez en parler, écrivez-nous — on répond dans la journée.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/diagnostic"
              className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-sand px-7 py-3.5 text-sm font-semibold text-deep"
            >
              <Sparkles className="h-4 w-4" />
              Faire mon diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:border-primary-foreground hover:bg-primary-foreground/10"
              >
                <MessageCircle className="h-4 w-4" />
                Parler sur WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
