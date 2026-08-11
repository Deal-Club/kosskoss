"use client";

import { useEffect, useRef, useState } from "react";
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
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { DiagIcon } from "@/lib/kk/diagnostic";
import type { ClientQuestion } from "@/server/kk/diagnostic-data";
import type { DiagnosticResult } from "@/server/kk/diagnostic";
import { formatFcfa } from "@/lib/kk/format";
import { Petal, BottleMotif } from "./motifs";
import { DiagnosticAnalyse, DUREE_ANALYSE } from "./diagnostic-analyse";

const ICONS: Record<DiagIcon, typeof Droplet> = {
  droplet: Droplet, wind: Wind, smile: Smile, contrast: Contrast, sparkles: Sparkles,
  sun: Sun, clock: Clock, shield: Shield, wallet: Wallet, gem: Gem, leaf: Leaf, check: Check,
};

/**
 * Parcours du diagnostic.
 *
 * Trois étapes mortes ont été retirées, sur le principe posé par le client
 * (« le site doit être orienté conversion et donc ne pas multiplier les étapes
 * si elles ne sont pas nécessaires ») :
 *
 *  1. L'ÉCRAN D'INTRO. Le visiteur venait de cliquer « Faire mon diagnostic » ;
 *     il tombait sur un écran qui affichait « Commencer le diagnostic ». Une
 *     étape entière pour zéro information nouvelle. La promesse (5 questions,
 *     1 minute, gratuit, sans engagement) est désormais tenue sur la page
 *     d'accueil, avant le clic — comme sur la maquette du client, qui liste les
 *     cinq questions dans le module d'appel. On entre donc sur la question 1.
 *
 *  2. LE FAUX CHARGEMENT. Un `setTimeout` de 1,1 s retardait volontairement un
 *     résultat déjà reçu du serveur, « pour l'effet ». C'est de l'abandon
 *     acheté. L'écran d'analyse subsiste, mais il ne dure que le temps réel de
 *     la requête.
 *
 *  3. LE SECOND CLIC PAR QUESTION. Il fallait choisir sa réponse PUIS cliquer
 *     « Continuer » : dix clics pour cinq questions. La sélection fait
 *     désormais avancer d'elle-même. Le court délai avant le passage laisse
 *     voir la coche — sans lui, on doute d'avoir cliqué.
 *
 * Les réponses sont conservées le temps de l'onglet : un rechargement, un
 * appel téléphonique ou un retour arrière ne font plus repartir de zéro.
 */
type Phase = "question" | "loading" | "result";

/** Clé de reprise. `session` et non `local` : un diagnostic est daté, il ne
 *  doit pas ressurgir des semaines plus tard comme s'il était encore valable. */
const REPRISE = "kk-diagnostic";

export function DiagnosticFlow({ questions }: { questions: ClientQuestion[] }) {
  const { add, openDrawer } = useCart();
  const [phase, setPhase] = useState<Phase>("question");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Passage automatique en cours : neutralise un second clic pendant le délai. */
  const enCours = useRef<number | null>(null);
  /** Attente de fin de séquence d'analyse, à annuler si l'écran est quitté. */
  const attenteAnalyse = useRef<number | null>(null);

  const question = questions[qIndex];
  const selected = question ? answers[question.id] : undefined;

  // Reprise. Lue une seule fois au montage ; l'index est borné au cas où le
  // questionnaire aurait raccourci entre-temps au back-office.
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(REPRISE);
      if (!brut) return;
      const repris = JSON.parse(brut) as { qIndex?: number; answers?: Record<string, string> };
      if (repris.answers) setAnswers(repris.answers);
      if (typeof repris.qIndex === "number") {
        setQIndex(Math.min(Math.max(repris.qIndex, 0), questions.length - 1));
      }
    } catch {
      /* Stockage indisponible ou illisible : on repart simplement de zéro. */
    }
  }, [questions.length]);

  useEffect(() => {
    try {
      sessionStorage.setItem(REPRISE, JSON.stringify({ qIndex, answers }));
    } catch {
      /* Navigation privée, quota plein : la reprise est un confort, pas un dû. */
    }
  }, [qIndex, answers]);

  // Un passage automatique programmé ne doit pas survivre au démontage.
  useEffect(() => () => {
    if (enCours.current !== null) window.clearTimeout(enCours.current);
    if (attenteAnalyse.current !== null) window.clearTimeout(attenteAnalyse.current);
  }, []);

  /**
   * Sélection d'une réponse : elle vaut validation.
   *
   * Le délai de 260 ms n'est pas un effet — c'est le temps de voir la coche se
   * poser. Sans lui, l'écran change avant que le geste soit confirmé et le
   * visiteur ne sait pas ce qu'il a répondu.
   */
  function choose(answerId: string) {
    if (enCours.current !== null) return;
    const suivant = { ...answers, [question.id]: answerId };
    setAnswers(suivant);
    setError(null);
    enCours.current = window.setTimeout(() => {
      enCours.current = null;
      avancer(suivant);
    }, 260);
  }

  async function avancer(reponses: Record<string, string>) {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    // Dernière question → analyse.
    //
    // Le résultat n'est affiché qu'une fois la séquence d'analyse arrivée à son
    // terme. Ce n'est pas un délai décoratif : la requête revient en quelques
    // dizaines de millisecondes, et un diagnostic qui répond avant qu'on ait vu
    // l'écran ne passe pas pour rapide — il passe pour n'avoir rien regardé.
    // Les trois temps montrés (lecture, croisement, composition) sont ceux que
    // le moteur exécute réellement ; on leur laisse le temps d'être lus.
    //
    // L'attente est un PLANCHER, jamais un ajout : si la requête dure plus
    // longtemps que la séquence, rien n'est rallongé.
    setPhase("loading");
    setError(null);
    const debut = Date.now();
    try {
      const answerIds = questions.map((q) => reponses[q.id]).filter(Boolean);
      const res = await fetch("/api/kk/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerIds }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as DiagnosticResult;

      const reste = DUREE_ANALYSE - (Date.now() - debut);
      if (reste > 0) {
        await new Promise<void>((resoudre) => {
          attenteAnalyse.current = window.setTimeout(() => {
            attenteAnalyse.current = null;
            resoudre();
          }, reste);
        });
      }

      setResult(data);
      setPhase("result");
    } catch {
      // Un échec ne se fait pas attendre : on rend la main tout de suite.
      setError("L'analyse a échoué. Choisissez à nouveau votre réponse.");
      setPhase("question");
    }
  }

  function restart() {
    setAnswers({});
    setQIndex(0);
    setResult(null);
    setPhase("question");
    try {
      sessionStorage.removeItem(REPRISE);
    } catch {
      /* sans conséquence */
    }
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

  /* ---------------------------------------------------------- Loading -- */
  if (phase === "loading") {
    return (
      <MinimalShell>
        <DiagnosticAnalyse />
      </MinimalShell>
    );
  }

  /* ----------------------------------------------------------- Result -- */
  if (phase === "result" && result) {
    return (
      <MinimalShell>
        {/* Le résultat se lève au lieu d'apparaître d'un coup : il prend la
            suite du pétale qui vient de se remplir, et le raccord entre les
            deux écrans se lit comme un seul geste. */}
        <section className="kk-rise mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">Votre routine personnalisée</p>
          <h1 className="mt-2 text-deep">Votre profil beauté</h1>
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
                        <Image src={p.image as string} alt={p.name} fill sizes="120px" className="object-contain p-2" />
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
            <aside className="lg:sticky lg:top-24 lg:self-start">
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
                  className="kk-fill mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground"
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
      {/* `isolate` : la section devient son propre contexte d'empilement, ce qui
          confine le pétale décoratif — sans quoi son `-z-10` le ferait passer
          sous le fond de la page, où il disparaîtrait. */}
      <section className="relative isolate mx-auto max-w-3xl px-6 py-10">
        {/* `-z-10` : le pétale est POSITIONNÉ, le titre et les cartes ne le sont
            pas. En CSS, un élément positionné se peint au-dessus de ceux qui ne
            le sont pas, même s'il vient avant dans le DOM — le motif recouvrait
            donc la question et les réponses d'un voile clair. Il repasse
            derrière, à sa place d'ornement. */}
        <Petal className="pointer-events-none absolute -left-24 top-20 -z-10 hidden h-72 w-72 text-sand/60 lg:block" />
        <p className="eyebrow text-center">
          Étape {qIndex + 1} sur {questions.length}
        </p>
        <div className="mx-auto mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-sand">
          <div
            className="kk-fill h-full rounded-full bg-deep transition-all"
            style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h1 className="mt-8 text-center text-deep">{question.title}</h1>
        <p className="lead mx-auto mt-2 max-w-md text-center">{question.subtitle}</p>

        {/* Une réponse = une validation : plus de bouton « Continuer ». Dit ici
            pour que le visiteur sache que son clic engage la suite. */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Choisissez une réponse pour passer à la suite
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
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

        {/* Il ne reste que le retour. Le bouton « Continuer » a disparu avec le
            second clic par question : c'est la sélection qui fait avancer.
            Sur la première question, le retour quitte le diagnostic — plutôt
            que de ramener sur un écran d'intro qui n'existe plus. */}
        <div className="mt-8 flex items-center justify-center">
          {qIndex === 0 ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à l&rsquo;accueil
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setQIndex((i) => i - 1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Question précédente
            </button>
          )}
        </div>
      </section>
    </MinimalShell>
  );
}

/** Coquille immersive : en-tête minimal (logo + quitter). */
function MinimalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <Link href="/" className="wordmark text-sm text-deep">
          KossKoss <span className="text-[0.6rem] tracking-[0.36em] text-deep">SELECT</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-deep">
          Quitter le diagnostic <X className="h-4 w-4" />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
