import Link from "next/link";
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
import { MOCK_SKIN_TYPES, MOCK_TESTIMONIALS } from "@/data/kk/home-mock";
import type { KKProductView } from "@/types/kk";
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
            <span className="h-px w-8 bg-gold" /> Cosmétique · Cameroun
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
            Découvrez une cosmétique experte et sur-mesure. Des soins adaptés à
            votre texture de peau, pensés pour révéler votre éclat naturel.
          </p>
          <div
            className="kk-rise mt-9 flex flex-wrap items-center gap-4"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/diagnostic"
              className="group inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
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

        {/* Visuel hero — composition placeholder (aucune photo réelle). */}
        <div
          className="kk-rise relative mx-auto w-full max-w-md"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-deep/15">
            <Image
              src="/images/products/p3.jpg"
              alt="Sélection de soins KossKoss Select"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              priority
            />
            <span className="absolute bottom-5 left-5 rounded-full bg-cream/90 px-4 py-2 text-xs font-semibold text-deep shadow-sm">
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
      <div className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/60 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg text-deep">Choisissez selon votre peau</h2>
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
      <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4">
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
      <div className="relative overflow-hidden rounded-[2rem] bg-sand px-8 py-12 sm:px-14 sm:py-16">
        <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
          <div className="max-w-lg">
            <p className="eyebrow">Diagnostic beauté</p>
            <h2 className="mt-3 text-3xl text-deep sm:text-4xl">
              Votre routine en quelques réponses
            </h2>
            <p className="mt-4 text-muted-foreground">
              Répondez à quelques questions sur votre peau et vos envies : nous
              composons une sélection de soins parfaitement adaptée, prête à
              ajouter au panier.
            </p>
            <Link
              href="/diagnostic"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90"
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
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-last aspect-[5/4] overflow-hidden rounded-[2rem] lg:order-first">
          <Image
            src="/images/products/p6.jpg"
            alt="Rituel de soins KossKoss Select"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        <div className="max-w-xl">
          <p className="eyebrow">Notre exigence</p>
          <h2 className="mt-3 text-3xl text-deep sm:text-4xl">Des soins choisis avec méthode</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Chaque produit de la maison est retenu pour sa formule, sa tolérance
            et ses résultats. Nous privilégions des marques transparentes et des
            actifs qui ont fait leurs preuves — rien au hasard.
          </p>
          <ul className="mt-6 space-y-3">
            {["Formules sélectionnées une à une", "Marques transparentes et vérifiées", "Conseils adaptés à votre peau"].map(
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
            Découvrir la maison
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

export function Testimonials() {
  return (
    <section className="bg-sand/50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <p className="eyebrow">Avis vérifiés</p>
          <h2 className="mt-2 text-2xl text-deep sm:text-3xl">Ce qu&rsquo;elles en pensent</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {MOCK_TESTIMONIALS.map((t) => (
            <figure key={t.id} className="flex flex-col rounded-2xl border border-border/60 bg-card p-7">
              <Stars rating={t.rating} />
              <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-foreground">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-deep">{t.author}</span>
                <span className="text-muted-foreground"> · {t.city}</span>
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
  const items = [
    { icon: Smartphone, title: "Paiement Mobile Money", text: "Orange Money & MTN" },
    { icon: Truck, title: "Livraison Cameroun", text: "Partout, suivi WhatsApp" },
    { icon: BadgeCheck, title: "Produits authentiques", text: "Marques sélectionnées" },
    { icon: MessageCircle, title: "Support à l'écoute", text: "Une équipe disponible" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="grid gap-8 rounded-2xl border border-border/60 bg-card/50 px-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
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
