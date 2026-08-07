import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Star,
  Smartphone,
  Truck,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";
import type { KKProductView, KKTestimonialView } from "@/types/kk";
import { TYPES_DE_PEAU, PREOCCUPATIONS, type Besoin } from "@/lib/kk/besoins";
import { ProductCard } from "./product-card";
import { Monogram, Petal, Flourish } from "./motifs";

/* ------------------------------------------------------------------ Hero -- */

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Flourish className="pointer-events-none absolute -left-16 top-24 hidden h-40 w-[28rem] text-gold/40 lg:block" />
      {/* Respiration dissymétrique : peu d'air en haut, où le bandeau et la
          navigation en donnent déjà, davantage en bas pour détacher le hero de
          la section suivante. */}
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-10">
        <div className="max-w-xl">
          <p className="eyebrow kk-rise flex items-center gap-2" style={{ "--d": "0ms" } as React.CSSProperties}>
            <span className="h-px w-8 bg-gold" /> Concept-store beauté · Afrique centrale
          </p>
          <h1
            className="kk-rise mt-5 text-[2.6rem] leading-[1.05] text-deep sm:text-6xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            La sélection beauté qui vous choisit.
          </h1>
          <p
            className="kk-rise mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            Une sélection courte de soins pour les peaux noires, mates et
            métissées. Des marques reconnues, des circuits d&rsquo;approvisionnement
            sérieux, et des routines pensées pour le climat d&rsquo;ici.
          </p>
          <div
            className="kk-rise mt-9 flex flex-wrap items-center gap-4"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/diagnostic"
              className="kk-fill group inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <Sparkles className="h-4 w-4" />
              Faire mon diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/soins-visage"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-deep kk-underline"
            >
              Découvrir la boutique
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Visuel hero — image d'ambiance plutôt qu'un packshot : le geste de
            soin sur une peau riche en mélanine dit le positionnement de la
            maison, là où un flacon isolé ne montrait qu'une référence.
            Cadrage plein (`object-cover`) : la photo est composée au format
            4/5 du gabarit, elle n'a pas besoin de marge.
            `priority` : c'est le plus grand visuel au-dessus de la ligne de
            flottaison, donc celui que le navigateur doit chercher en premier. */}
        <div
          className="kk-rise relative mx-auto w-full max-w-md"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-deep shadow-2xl shadow-deep/15">
            <Image
              src="/images/editorial/hero-soin.webp"
              alt="Application d'un sérum du bout des doigts sur une peau riche en mélanine"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          </div>
          <Petal className="kk-float absolute -right-6 -top-6 h-24 w-24 text-deep/90" />
          <div className="absolute -bottom-5 -left-5 grid h-20 w-20 place-items-center rounded-2xl bg-cream shadow-xl">
            <Monogram className="h-12 w-12 text-deep" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- Sélection par peau -- */

/** Une entrée de besoin : libellé, précision, et lien vers le rayon filtré. */
function BesoinCard({ besoin }: { besoin: Besoin }) {
  return (
    <li>
      <Link
        href={`/soins-visage?besoin=${besoin.tag}`}
        className="group flex h-full flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 transition-colors hover:border-deep/40 hover:bg-sand/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
      >
        <div>
          <span className="flex items-center gap-2 text-sm font-semibold text-deep">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold transition-transform duration-300 group-hover:scale-150" />
            {besoin.label}
          </span>
          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
            {besoin.hint}
          </span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 self-end text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-deep" />
      </Link>
    </li>
  );
}

/**
 * Entrée dans le catalogue par le besoin.
 *
 * Chaque pastille menait auparavant au diagnostic, quel que soit le type
 * choisi : « choisissez selon votre peau » ne choisissait rien. Elles ouvrent
 * désormais le rayon réellement filtré (`?besoin=`), sur les étiquettes que
 * portent les produits.
 *
 * Deux registres séparés parce qu'ils ne répondent pas à la même question : le
 * type de peau ne change pas, la préoccupation du moment si. Et pour qui ne
 * sait pas se situer, le diagnostic reste offert en bas — c'est la porte de
 * sortie, pas la porte principale.
 */
export function SkinTypeStrip() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="kk-enter overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/50">
        <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-12">
          <div className="lg:max-w-xs">
            <p className="eyebrow">Trouver vite</p>
            <h2 className="mt-2 text-2xl leading-tight text-deep sm:text-[1.75rem]">
              Votre peau, votre routine
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Dites-nous ce qui vous préoccupe : nous ouvrons le rayon
              correspondant, déjà trié.
            </p>
            <Link
              href="/diagnostic"
              className="group mt-5 inline-flex items-center gap-2 text-sm font-medium text-deep kk-underline"
            >
              <Sparkles className="h-4 w-4 text-gold" />
              Je ne sais pas, guidez-moi
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Type de peau
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TYPES_DE_PEAU.map((b) => (
                  <BesoinCard key={b.tag} besoin={b} />
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Préoccupation
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PREOCCUPATIONS.map((b) => (
                  <BesoinCard key={b.tag} besoin={b} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Rail produits -- */

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-2xl text-deep sm:text-3xl">{title}</h2>
      </div>
      {action && (
        <Link
          href="/soins-visage"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep kk-underline"
        >
          {action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export function ProductRail({
  eyebrow,
  title,
  action,
  products,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  products: KKProductView[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <SectionHead eyebrow={eyebrow} title={title} action={action} />
      <div className="kk-enter-stagger grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------- Promo diagnostic -- */

export function DiagnosticPromo() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="kk-enter relative overflow-hidden rounded-[2rem] bg-sand px-8 py-12 sm:px-14 sm:py-16">
        {/* Visuel de section. Il n'apparaît qu'à partir de `md` : en dessous,
            la bannière devient étroite et haute, le cadrage `cover` ne
            retiendrait que le visage et le texte passerait par-dessus. Le fond
            sable seul y suffit.
            `alt` vide et `aria-hidden` : l'image illustre un propos que le
            titre et le paragraphe énoncent déjà — l'annoncer une seconde fois
            n'apprendrait rien à qui écoute la page. */}
        <Image
          src="/images/editorial/diagnostic-bandeau.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 0px, 1280px"
          className="hidden object-cover object-right md:block"
        />
        {/* Dégradé sable : il garantit le contraste du texte quelle que soit la
            largeur, le recadrage faisant glisser le sujet d'un écran à l'autre.
            Il est plein jusqu'à 30 % — la colonne de texte s'arrête à 45 % —
            puis s'efface avant 60 %, là où le sujet commence. Un voile qui
            court plus loin ternit la photo qu'il est censé mettre en valeur. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-gradient-to-r from-sand from-30% to-transparent to-60% md:block"
        />

        <div className="relative grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
          <div className="max-w-lg">
            <p className="eyebrow">Diagnostic beauté</p>
            <h2 className="mt-3 text-3xl text-deep sm:text-4xl">
              Votre routine en quelques réponses
            </h2>
            <p className="mt-4 text-muted-foreground">
              Cinq questions sur votre peau, vos préoccupations et votre budget.
              Nous vous proposons ensuite une sélection courte, adaptée à votre
              profil et au climat local — libre à vous de la suivre ou non.
            </p>
            <Link
              href="/diagnostic"
              className="kk-fill group mt-8 inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Commencer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {/* Colonne de droite laissée vide : c'est là que le sujet de la
              photo se place. Le pétale décoratif qui l'occupait ferait doublon
              avec les botaniques de l'image. */}
          <div aria-hidden="true" />
        </div>
        {/* Sur mobile, l'image est masquée : ce pétale reste le seul ornement. */}
        <Petal className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 text-deep/5 md:hidden" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------ Bloc éditorial -- */

export function EditorialBlock() {
  return (
    <section className="kk-enter mx-auto max-w-7xl px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Nature morte plutôt qu'un packshot : la section parle de méthode et
            de tri — « nous filtrons l'offre plutôt que de l'empiler ». Trois
            flacons largement espacés portent ce propos ; une étagère pleine
            dirait l'inverse du texte qu'elle accompagne. */}
        <div className="kk-lift relative order-last aspect-[5/4] overflow-hidden rounded-[2rem] bg-deep lg:order-first">
          <Image
            src="/images/editorial/exigence-nature-morte.webp"
            alt="Trois flacons de soin posés en lumière rasante, largement espacés"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        <div className="max-w-xl">
          <p className="eyebrow">Notre exigence</p>
          <h2 className="mt-3 text-3xl text-deep sm:text-4xl">Des soins choisis avec méthode</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Nous filtrons l&rsquo;offre plutôt que de l&rsquo;empiler : chaque référence
            entre au catalogue pour sa formule, sa tolérance et son intérêt réel
            sur les peaux riches en mélanine. Peu de doublons, aucun produit au
            hasard.
          </p>
          <ul className="mt-6 space-y-3">
            {["Chaque référence a une raison d'être", "Marques reconnues, circuits d'approvisionnement sérieux", "Conseils adaptés aux peaux noires et métissées"].map(
              (item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-gold" />
                  {item}
                </li>
              ),
            )}
          </ul>
          <Link
            href="/soins-visage"
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-deep kk-underline"
          >
            Découvrir la sélection
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Témoignages -- */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Note ${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-gold text-gold" : "text-border"}`}
        />
      ))}
    </div>
  );
}

/**
 * Avis clients. N'affiche que de vrais avis passés par la modération.
 * Liste vide = section entièrement masquée : mieux vaut pas d'avis du tout
 * qu'un témoignage écrit par la boutique.
 */
export function Testimonials({ testimonials }: { testimonials: KKTestimonialView[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-sand/50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <p className="eyebrow">Avis publiés après modération</p>
          <h2 className="mt-2 text-2xl text-deep sm:text-3xl">Ce qu&rsquo;en disent nos clients</h2>
        </div>
        <div className="kk-enter-stagger mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="kk-lift flex flex-col rounded-2xl border border-border/60 bg-card p-7">
              <Stars rating={t.rating} />
              <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-foreground">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-deep">{t.author}</span>
                {t.city && <span className="text-muted-foreground"> · {t.city}</span>}
                <span className="mt-1 block text-muted-foreground">à propos de {t.productName}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Réassurance -- */

export function TrustRow() {
  // L'authenticité passe en tête : c'est la première inquiétude de nos clients,
  // avant même le prix ou le délai.
  const items = [
    { icon: BadgeCheck, title: "Produits authentiques", text: "Circuits d'approvisionnement sérieux" },
    { icon: MessageCircle, title: "Conseil avant l'achat", text: "On vous guide, sans jargon" },
    { icon: Smartphone, title: "Paiement Mobile Money", text: "Orange Money & MTN" },
    { icon: Truck, title: "Livraison Cameroun", text: "Partout, suivi WhatsApp" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="kk-enter-stagger grid gap-8 rounded-2xl border border-border/60 bg-card/50 px-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-deep">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-deep">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
