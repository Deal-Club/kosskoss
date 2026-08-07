"use client";

import { useState } from "react";
import { LocalizedLink as Link } from "./localized-link";
import Image from "next/image";
import {
  Droplet,
  Wind,
  Smile,
  Contrast,
  Sparkles,
  Sun,
  Clock,
  Shield,
  Wallet,
  Gem,
  Leaf,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { DiagIcon } from "@/lib/kk/diagnostic";
import type { ClientQuestion } from "@/server/kk/diagnostic-data";
import type { DiagnosticResult } from "@/server/kk/diagnostic";
import { formatFcfa } from "@/lib/kk/format";
import { Petal, BottleMotif } from "./motifs";
import { PatternBackdrop } from "./pattern-backdrop";

const ICONS: Record<DiagIcon, typeof Droplet> = {
  droplet: Droplet, wind: Wind, smile: Smile, contrast: Contrast, sparkles: Sparkles,
  sun: Sun, clock: Clock, shield: Shield, wallet: Wallet, gem: Gem, leaf: Leaf, check: Check,
};

type Phase = "intro" | "question" | "loading" | "result";

export function DiagnosticFlow({ questions }: { questions: ClientQuestion[] }) {
  const { add, openDrawer } = useCart();
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const question = questions[qIndex];
  const selected = question ? answers[question.id] : undefined;

  function choose(answerId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: answerId }));
  }

  async function next() {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    // Dernière question → analyse
    setPhase("loading");
    setError(null);
    try {
      const answerIds = questions.map((q) => answers[q.id]).filter(Boolean);
      const res = await fetch("/api/kk/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerIds }),
      });
      const data = (await res.json()) as DiagnosticResult;
      // Petite pause pour l'effet « analyse ».
      window.setTimeout(() => {
        setResult(data);
        setPhase("result");
      }, 1100);
    } catch {
      setError("L'analyse a échoué. Réessayez.");
      setPhase("question");
    }
  }

  function restart() {
    setAnswers({});
    setQIndex(0);
    setResult(null);
    setPhase("intro");
  }

  function addRoutine() {
    if (!result) return;
    for (const step of result.steps) {
      const p = step.product;
      add(
        {
          productId: p.id,
          slug: (p.href ?? "").split("/").pop() ?? "",
          brand: p.brand,
          name: p.name,
          image: p.image ?? "",
          path: p.href ?? "#",
          priceCents: p.priceFcfa,
          stock: 99,
        },
        1,
      );
    }
    openDrawer();
  }

  /* ------------------------------------------------------------- Intro -- */
  if (phase === "intro") {
    return (
      <MinimalShell>
        {/* Le motif habille l'écran d'accueil du diagnostic, pas les questions
            qui suivent : là, l'attention doit aller aux réponses. */}
        <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-deep px-6 py-16 text-center text-primary-foreground">
          <PatternBackdrop align="center" />
          <Petal className="kk-float pointer-events-none absolute -top-4 right-4 h-24 w-24 text-primary-foreground/10" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-sand text-deep">
              <Sparkles className="h-8 w-8" />
            </span>
            <p className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground/60">
              Diagnostic beauté
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl">La sélection qui vous choisit</h1>
            <p className="mx-auto mt-4 max-w-lg text-primary-foreground/75">
              5 questions sur votre peau et vos envies. Nous composons une routine de soins
              parfaitement adaptée, à ajouter au panier en un geste.
            </p>
            {/* Bouton en sable sur fond profond : l'inverse du reste du site,
                parce qu'ici c'est le fond qui est sombre. */}
            <button
              type="button"
              onClick={() => setPhase("question")}
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-sand px-8 py-4 text-sm font-semibold text-deep transition hover:bg-primary-foreground"
            >
              Commencer le diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-4 text-xs text-primary-foreground/60">Environ 1 minute · gratuit</p>
          </div>
        </section>
      </MinimalShell>
    );
  }

  /* ---------------------------------------------------------- Loading -- */
  if (phase === "loading") {
    return (
      <MinimalShell>
        <section className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-deep" />
          <p className="font-display text-2xl text-deep">Analyse de votre profil…</p>
          <p className="text-sm text-muted-foreground">Nous composons votre routine sur mesure.</p>
        </section>
      </MinimalShell>
    );
  }

  /* ----------------------------------------------------------- Result -- */
  if (phase === "result" && result) {
    return (
      <MinimalShell>
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">Votre routine personnalisée</p>
          <h1 className="mt-2 text-4xl text-deep sm:text-5xl">Votre profil beauté</h1>
          {result.chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {result.chips.map((c) => (
                <span key={c} className="rounded-full bg-sand px-4 py-1.5 text-sm font-medium text-deep">
                  {c}
                </span>
              ))}
            </div>
          )}
          <p className="mt-4 max-w-2xl text-muted-foreground">
            D&rsquo;après vos réponses, voici la routine que nous vous recommandons — un geste après
            l&rsquo;autre, avec des produits sélectionnés pour vous.
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
            {/* Étapes */}
            <ol className="space-y-6">
              {result.steps.map((step) => {
                const p = step.product;
                const hasImage = typeof p.image === "string" && p.image.length > 0;
                return (
                  <li key={step.key} className="flex gap-5 rounded-2xl border border-border/70 bg-card p-5">
                    <div className="relative hidden h-32 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab] sm:block">
                      {hasImage ? (
                        <Image src={p.image as string} alt={p.name} fill sizes="120px" className="object-cover" />
                      ) : (
                        <BottleMotif className="absolute inset-0 m-auto h-3/5 text-deep/60" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-deep text-xs font-semibold text-primary-foreground">
                          {step.index}
                        </span>
                        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {step.label}
                        </span>
                      </div>
                      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {p.brand}
                      </p>
                      <Link href={p.href ?? "#"} className="font-display text-lg text-deep hover:underline">
                        {p.name}
                      </Link>
                      {step.why && <p className="mt-1 text-sm text-muted-foreground">{step.why}</p>}
                      <p className="figure mt-2 text-sm font-semibold text-deep">{formatFcfa(p.priceFcfa)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Résumé routine */}
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
                  Votre routine complète
                </h2>
                <ul className="mt-4 space-y-3">
                  {result.steps.map((step) => (
                    <li key={step.key} className="flex justify-between gap-3 text-sm">
                      <span className="text-foreground">
                        <span className="text-muted-foreground">{step.index}. </span>
                        {step.product.name}
                      </span>
                      <span className="figure shrink-0 text-deep">{formatFcfa(step.product.priceFcfa)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-semibold text-deep">Total routine</span>
                  <span className="figure text-xl font-semibold text-deep">{formatFcfa(result.totalFcfa)}</span>
                </div>
                <button
                  type="button"
                  onClick={addRoutine}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Ajouter toute la routine au panier
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-deep hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refaire le diagnostic
                </button>
              </div>
            </aside>
          </div>
        </section>
      </MinimalShell>
    );
  }

  /* --------------------------------------------------------- Question -- */
  const Icon = (icon: string) => ICONS[icon as DiagIcon] ?? Check;
  return (
    <MinimalShell>
      <section className="relative mx-auto max-w-3xl px-6 py-10">
        <Petal className="pointer-events-none absolute -left-24 top-20 hidden h-72 w-72 text-sand/60 lg:block" />
        <p className="eyebrow text-center">
          Étape {qIndex + 1} sur {questions.length}
        </p>
        <div className="mx-auto mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-sand">
          <div
            className="h-full rounded-full bg-deep transition-all"
            style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h1 className="mt-8 text-center text-2xl text-deep sm:text-3xl">{question.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-center text-muted-foreground">{question.subtitle}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {question.answers.map((a) => {
            const active = selected === a.id;
            const A = Icon(a.icon);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => choose(a.id)}
                aria-pressed={active}
                className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition ${
                  active ? "border-deep bg-sand shadow-sm" : "border-border bg-card hover:border-deep/40"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? "bg-deep text-primary-foreground" : "bg-sand text-deep"}`}>
                  <A className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium text-deep">{a.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{a.description}</span>
                </span>
                <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-deep bg-deep text-primary-foreground" : "border-border"}`}>
                  {active && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (qIndex === 0 ? setPhase("intro") : setQIndex((i) => i - 1))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!selected}
            className="group inline-flex items-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {qIndex === questions.length - 1 ? "Voir ma routine" : "Continuer"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>
    </MinimalShell>
  );
}

/** Coquille immersive : en-tête minimal (logo + quitter). */
function MinimalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <Link href="/" className="wordmark text-sm text-deep">
          KOSSKOSS <span className="text-[0.6rem] tracking-[0.4em] text-deep/60">SELECT</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-deep">
          Quitter le diagnostic <X className="h-4 w-4" />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
