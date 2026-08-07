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
import { MOCK_SKIN_TYPES } from "@/data/kk/home-mock";
import type { KKProductView, KKTestimonialView } from "@/types/kk";
import { ProductCard } from "./product-card";
import { Monogram, Petal, Flourish } from "./motifs";

/* ------------------------------------------------------------------ Hero -- */

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Flourish className="pointer-events-none absolute -left-16 top-24 hidden h-40 w-[28rem] text-gold/40 lg:block" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-deep underline-offset-4 hover:underline"
            >
              Découvrir la boutique
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Visuel hero — produit réel du catalogue.
            Nubiance HRB-3 : un correcteur d'hyperpigmentation, d'une marque
            formulée pour les peaux noires et métissées. C'est le sujet même du
            positionnement, et la préoccupation que le diagnostic met en avant.
            `object-contain` sur fond sable plutôt que `object-cover` : les
            photos du catalogue sont carrées et détourées sur blanc, un cadrage
            plein couperait le flacon. */}
        <div
          className="kk-rise relative mx-auto w-full max-w-md"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-sand shadow-2xl shadow-deep/15">
            <Image
              src="/images/products/NUB-HRB-JOU-50.jpg"
              alt="Nubiance HRB-3, soin jour correcteur d'hyperpigmentation"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-contain p-8"
              priority
            />
            {/* À droite : le sigle occupe le coin bas-gauche et, depuis qu'il
                est plein, il recouvrait cette pastille. */}
            <span className="absolute bottom-5 right-5 rounded-full bg-cream/90 px-4 py-2 text-xs font-semibold text-deep shadow-sm">
              Diagnostic en 2 min
            </span>
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

export function SkinTypeStrip() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="kk-enter flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/60 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg text-deep">Choisissez selon votre type de peau</h2>
        <ul className="flex flex-wrap gap-3">
          {MOCK_SKIN_TYPES.map((s) => (
            <li key={s.key}>
              <Link
                href="/diagnostic"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-cream px-4 py-2 text-sm font-medium text-deep transition hover:border-deep/50 hover:bg-sand"
              >
                <span className="h-2 w-2 rounded-full bg-gold" />
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
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
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-deep underline-offset-4 hover:underline"
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
        <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
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
          <div className="relative hidden justify-center md:flex">
            <Petal className="kk-float h-52 w-52 text-deep" />
          </div>
        </div>
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
        {/* Même parti pris que le hero : photo produit réelle, posée sur sable
            et non recadrée. */}
        <div className="relative order-last aspect-[5/4] overflow-hidden rounded-[2rem] bg-sand lg:order-first">
          <Image
            src="/images/products/BOJ-GLO-SER-30.jpg"
            alt="Beauty of Joseon, sérum éclat propolis et niacinamide"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-contain p-10"
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
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-deep underline-offset-4 hover:underline"
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
