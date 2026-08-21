"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocalizedLink as Link, withLocale } from "./localized-link";
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
  ArrowRight,
  Zap,
  Loader2,
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
 * (Le passage automatique à la question suivante, un temps en vigueur pour
 * épargner un clic, a été REVENU à la demande du client : la sélection se
 * contente d'enregistrer, et deux boutons « Précédent » / « Suivant » mènent
 * le parcours. On y gagne la relecture — voir sa réponse avant de la valider,
 * et revenir dessus — au prix d'un clic par question.)
 *
 * Les réponses sont conservées le temps de l'onglet : un rechargement, un
 * appel téléphonique ou un retour arrière ne font plus repartir de zéro.
 */
type Phase = "propose" | "question" | "loading" | "result";

/** Clé de reprise. `session` et non `local` : un diagnostic est daté, il ne
 *  doit pas ressurgir des semaines plus tard comme s'il était encore valable. */
const REPRISE = "kk-diagnostic";

export function DiagnosticFlow({
  questions,
  savedAnswerIds,
  locale = "fr",
  gestes,
}: {
  questions: ClientQuestion[];
  /** Réponses du dernier diagnostic du client connecté, lues côté serveur.
   *  `null` pour un visiteur sans session ou qui n'a jamais terminé le
   *  questionnaire — dans ce cas la page se comporte comme avant. */
  savedAnswerIds?: string[] | null;
  /** Langue de la page, transmise aux trois routes appelées depuis le parcours
   *  (calcul de la routine, envoi de la routine par e-mail, inscription à la
   *  lettre d'information) — même usage que sur `NewsletterBand`, qui ne s'en
   *  sert que pour l'appel réseau, jamais pour changer le texte affiché. */
  locale?: string;
  /** Libellés des gestes actifs, dans l'ordre — voir `DiagnosticAnalyse`. */
  gestes: string[];
}) {
  const { add } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("question");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Réponses ayant produit `result` : distinctes de `answers`, qui reste vide
   *  quand on arrive au résultat par « Revoir ma routine » sans repasser par
   *  le QCM. C'est ce tableau, pas `answers`, qu'il faut renvoyer au serveur
   *  pour que l'e-mail envoyé corresponde à la routine affichée. */
  const [lastAnswerIds, setLastAnswerIds] = useState<string[]>([]);
  /** Passage automatique en cours : neutralise un second clic pendant le délai. */
  /** Attente de fin de séquence d'analyse, à annuler si l'écran est quitté. */
  const attenteAnalyse = useRef<number | null>(null);

  // Formulaire d'envoi de la routine par e-mail (écran de résultat).
  //
  // Deux consentements, deux actions : `routineEmail` sert aux deux appels,
  // mais leur issue est suivie séparément (`envoiStatut`/`inscriptionStatut`)
  // puisque l'un peut réussir quand l'autre échoue. `enCoursEnvoi` est le seul
  // état qui pilote le bouton — un double clic ne doit pas partir même si un
  // des deux appels a déjà répondu et que l'autre traîne encore.
  const [routineEmail, setRoutineEmail] = useState("");
  const [inscrireLettre, setInscrireLettre] = useState(false);
  const [enCoursEnvoi, setEnCoursEnvoi] = useState(false);
  const [envoiStatut, setEnvoiStatut] = useState<"repos" | "ok" | "erreur">("repos");
  const [envoiMessage, setEnvoiMessage] = useState<string | null>(null);
  const [inscriptionStatut, setInscriptionStatut] = useState<"repos" | "ok" | "erreur">("repos");
  const [inscriptionMessage, setInscriptionMessage] = useState<string | null>(null);

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

  // Profil client : proposer de revoir la routine plutôt que de relancer le
  // QCM. N'écrase pas une reprise d'onglet déjà en cours — un questionnaire
  // entamé prime sur un ancien résultat, sans quoi revenir en arrière depuis
  // la question 3 renverrait sans cesse à cet écran.
  useEffect(() => {
    if (!savedAnswerIds || savedAnswerIds.length === 0) return;
    try {
      if (sessionStorage.getItem(REPRISE)) return;
    } catch {
      /* Stockage indisponible : la proposition reste affichée quand même. */
    }
    setPhase("propose");
  }, [savedAnswerIds]);

  useEffect(() => {
    try {
      sessionStorage.setItem(REPRISE, JSON.stringify({ qIndex, answers }));
    } catch {
      /* Navigation privée, quota plein : la reprise est un confort, pas un dû. */
    }
  }, [qIndex, answers]);

  // Un passage automatique programmé ne doit pas survivre au démontage.
  useEffect(() => () => {
    if (attenteAnalyse.current !== null) window.clearTimeout(attenteAnalyse.current);
  }, []);

  /** Sélection d'une réponse : elle enregistre, elle ne valide pas. */
  function choose(answerId: string) {
    setAnswers((actuelles) => ({ ...actuelles, [question.id]: answerId }));
    setError(null);
  }

  /**
   * Envoie des identifiants de réponse au moteur et affiche le résultat.
   * Commun aux deux chemins qui y mènent : la fin du QCM, et « Revoir ma
   * routine » sur le profil sauvegardé — dans les deux cas la routine est
   * recalculée sur le catalogue du jour, jamais rejouée depuis un résultat
   * figé.
   *
   * `retourEnErreur` est l'écran où revenir si la requête échoue : la
   * question courante depuis le QCM, la proposition depuis le profil.
   */
  async function soumettre(answerIds: string[], retourEnErreur: Phase) {
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
      const res = await fetch("/api/kk/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `locale` n'est pas décoratif : le moteur traduit les libellés de
        // gestes (`libelleGeste`) avec ce qu'il reçoit ici. Sans lui, la route
        // retombait sur le français, et l'écran de résultat affichait
        // « Nettoyer » là où l'écran d'attente qui le précède — rendu côté
        // serveur avec la langue de la page — venait d'annoncer « Cleanse ».
        body: JSON.stringify({ answers: answerIds, locale }),
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
      setLastAnswerIds(answerIds);
      setPhase("result");
    } catch {
      // Un échec ne se fait pas attendre : on rend la main tout de suite.
      setError("L'analyse a échoué. Choisissez à nouveau votre réponse.");
      setPhase(retourEnErreur);
    }
  }

  async function avancer(reponses: Record<string, string>) {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    // Dernière question → analyse.
    const answerIds = questions.map((q) => reponses[q.id]).filter(Boolean);
    await soumettre(answerIds, "question");
  }

  /** Revoit la routine du profil sauvegardé, sans repasser par le QCM. */
  function revoirRoutine() {
    if (!savedAnswerIds || savedAnswerIds.length === 0) return;
    void soumettre(savedAnswerIds, "propose");
  }

  /** Refaire le questionnaire remplace le profil : on repart de zéro, et
   *  c'est l'`upsert` d'`enregistrerProfil` qui écrasera l'ancien à la fin. */
  function refaireQuestionnaire() {
    setAnswers({});
    setQIndex(0);
    setError(null);
    setPhase("question");
  }

  /**
   * Achat direct de la routine recommandée.
   *
   * Le bouton déposait au panier et ouvrait le tiroir. Or on arrive ici APRÈS
   * avoir répondu à cinq questions et lu la composition geste par geste : la
   * décision est prise. Renvoyer vers un tiroir, puis vers le panier, puis vers
   * le tunnel, c'est ajouter trois écrans à un achat déjà consenti — l'inverse
   * de l'orientation conversion demandée.
   *
   * Le panier reste le passage obligé : c'est lui qui porte l'état de la
   * commande et le tunnel le lit. Il est traversé, pas exposé. Même dispositif
   * que le mode « achat » de `RoutineAddToCart` et que « Payer maintenant » sur
   * une fiche produit.
   */
  function acheterRoutine() {
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

    // Ni confirmation ni tiroir : deux interruptions qui ne feraient que
    // retarder le paiement.
    router.push(withLocale(pathname, "/commande"));
  }

  /**
   * Envoie la routine par e-mail et, si la case est cochée, inscrit la même
   * adresse à la lettre d'information.
   *
   * Les deux appels sont indépendants : chacun gère son propre échec sans
   * faire échouer l'autre, et sont lancés en parallèle plutôt qu'en série pour
   * ne pas faire attendre l'inscription derrière l'envoi. `Promise.all` reste
   * sûr ici parce qu'aucune des deux fonctions internes ne rejette — chacune
   * capture son erreur et la range dans son propre message.
   */
  async function envoyerRoutineParEmail(e: React.FormEvent) {
    e.preventDefault();
    if (enCoursEnvoi) return; // Double clic : le premier envoi est encore en cours.
    setEnCoursEnvoi(true);
    setEnvoiStatut("repos");
    setEnvoiMessage(null);
    setInscriptionStatut("repos");
    setInscriptionMessage(null);

    const adresse = routineEmail.trim();

    const appelEnvoi = (async () => {
      try {
        const res = await fetch("/api/kk/diagnostic/routine-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: adresse, answers: lastAnswerIds, locale }),
        });
        const data = (await res.json()) as { error?: string; retryAfterSeconds?: number };
        if (res.status === 429) {
          // Cas distinct du reste : le visiteur n'a rien fait de mal, il doit
          // patienter. Le message porte un délai concret plutôt qu'un « erreur ».
          const minutes = data.retryAfterSeconds ? Math.ceil(data.retryAfterSeconds / 60) : null;
          setEnvoiMessage(
            minutes
              ? `Trop de demandes d'envoi. Réessayez dans environ ${minutes} min.`
              : "Trop de demandes d'envoi. Merci de patienter un instant avant de réessayer.",
          );
          setEnvoiStatut("erreur");
          return;
        }
        if (!res.ok) {
          setEnvoiMessage(data.error ?? "L'envoi a échoué. Réessayez.");
          setEnvoiStatut("erreur");
          return;
        }
        setEnvoiMessage("Envoyée ! Vérifiez votre boîte de réception.");
        setEnvoiStatut("ok");
      } catch {
        setEnvoiMessage("Vérifiez votre connexion et réessayez.");
        setEnvoiStatut("erreur");
      }
    })();

    const appelInscription = inscrireLettre
      ? (async () => {
          try {
            const res = await fetch("/api/kk/newsletter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: adresse, locale, source: "diagnostic" }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              setInscriptionMessage(data.error ?? "Inscription à la lettre d'information impossible.");
              setInscriptionStatut("erreur");
              return;
            }
            setInscriptionMessage("Inscription à la lettre d'information confirmée.");
            setInscriptionStatut("ok");
          } catch {
            setInscriptionMessage("Inscription à la lettre d'information impossible.");
            setInscriptionStatut("erreur");
          }
        })()
      : Promise.resolve();

    await Promise.all([appelEnvoi, appelInscription]);
    setEnCoursEnvoi(false);
  }

  /* ---------------------------------------------------------- Propose -- */
  if (phase === "propose") {
    return (
      <MinimalShell>
        <section className="kk-rise mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="eyebrow">Bon retour</p>
          <h1 className="mt-2 text-deep">Vous avez déjà fait votre diagnostic</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Revoyez la routine construite à partir de vos réponses — recalculée sur les produits
            disponibles aujourd&rsquo;hui — ou refaites le questionnaire si votre peau a changé.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={revoirRoutine}
              className="kk-fill inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition"
            >
              Revoir ma routine
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={refaireQuestionnaire}
              className="text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              Refaire le questionnaire
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      </MinimalShell>
    );
  }

  /* ---------------------------------------------------------- Loading -- */
  if (phase === "loading") {
    return (
      <MinimalShell>
        <DiagnosticAnalyse gestes={gestes} />
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
            {/* Cartes compactes, alignées sur celles de la page routine.
                Elles occupaient une hauteur d'image de 128 px pour quatre
                lignes de texte empilées — numéro, geste, marque, nom — dans
                20 px de marge intérieure. Sur une routine de cinq gestes, le
                résultat du diagnostic demandait deux écrans de défilement. */}
            <ol className="space-y-3">
              {result.steps.map((step) => {
                const p = step.product;
                const hasImage = typeof p.image === "string" && p.image.length > 0;
                return (
                  <li key={step.key} className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4">
                    <div className="relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab] sm:block">
                      {hasImage ? (
                        <Image src={p.image as string} alt={p.name} fill sizes="80px" className="object-contain p-1.5" />
                      ) : (
                        <BottleMotif className="absolute inset-0 m-auto h-3/5 text-deep/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Numéro, geste et marque sur une seule ligne : trois
                          informations courtes qui tenaient sur trois lignes. */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-deep text-[0.65rem] font-semibold text-primary-foreground">
                          {step.index}
                        </span>
                        <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-deep uppercase">
                          {step.label}
                        </span>
                        <span aria-hidden="true" className="text-muted-foreground/40">
                          ·
                        </span>
                        <span className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                          {p.brand}
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-display text-[1.15rem] leading-snug">
                        <Link href={p.href ?? "#"} className="text-deep transition hover:text-deep/70">
                          {p.name}
                        </Link>
                      </h3>

                      {step.why && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.why}</p>
                      )}

                      {/* Pas de prix à l'unité, comme sur la page routine : la
                          routine se vend comme un tout, et aligner cinq montants
                          invite à les additionner de tête au lieu de lire la
                          composition. Le seul montant qui engage est celui du
                          récapitulatif, à droite, qui reste sous les yeux
                          pendant toute la lecture. */}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Résumé routine, au vert profond.

                Même raison que sur la fiche routine : il portait l'habillage
                des cartes de produit qui le précèdent et se lisait comme l'une
                d'elles, alors qu'il ne décrit rien — il totalise et il engage.
                L'écran de résultat étant clair de bout en bout, le fond sombre
                en fait le seul point d'ancrage, à l'endroit où l'on décide. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-2xl bg-deep text-primary-foreground shadow-[0_18px_40px_-24px_rgba(17,41,45,0.7)]">
                <div aria-hidden="true" className="h-0.5 w-full bg-gradient-to-r from-gold/70 via-gold to-gold/20" />

                <div className="p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-soft">
                    Votre routine complète
                  </h2>

                  <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                    {result.steps.map((step) => (
                      <li key={step.key} className="flex justify-between gap-3 py-3 text-sm">
                        <span className="text-primary-foreground/90">
                          <span className="figure text-primary-foreground/55">{step.index}. </span>
                          {step.product.name}
                        </span>
                        <span className="figure shrink-0 text-primary-foreground/80">
                          {formatFcfa(step.product.priceFcfa)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold tracking-wide text-primary-foreground/70 uppercase">
                      Total routine
                    </span>
                    <span className="figure text-2xl font-semibold text-primary-foreground">
                      {formatFcfa(result.totalFcfa)}
                    </span>
                  </div>

                  {/* Bouton sable sur fond sombre, qui se remplit de vert au
                      survol — la même inversion que sur la fiche routine. */}
                  <button
                    type="button"
                    onClick={acheterRoutine}
                    aria-label={`Commander la routine — ${result.steps.length} produits`}
                    className="kk-fill kk-fill-deep mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-sand px-6 py-3.5 text-sm font-semibold text-deep"
                  >
                    <Zap className="h-4 w-4" />
                    Commander la routine
                  </button>

                  {/* Le nombre de produits est dit sous le bouton : « Commander
                      la routine » seul laisse croire à un article unique, et la
                      surprise se paierait à l'écran suivant. */}
                  <p className="mt-2.5 text-center text-xs text-primary-foreground/60">
                    {result.steps.length} produits · paiement à l&apos;étape suivante
                  </p>

                  {/* Envoi par e-mail : une action distincte de l'achat, posée
                      sous elle plutôt que rivalisant avec elle. Même balisage
                      que `NewsletterBand`, sur le même fond — les deux
                      formulaires du site sur bg-deep se ressemblent
                      volontairement.

                      Deux consentements, deux actions : le bouton n'engage que
                      l'envoi de la routine, demandé par le visiteur en étant
                      ici. La case, EN DESSOUS et décochée par défaut, propose
                      l'inscription à la lettre d'information sans jamais s'y
                      substituer. */}
                  <form onSubmit={envoyerRoutineParEmail} className="mt-6 border-t border-white/10 pt-5">
                    <h3 className="text-xs font-semibold tracking-[0.14em] text-gold-soft uppercase">
                      Recevoir cette routine par e-mail
                    </h3>
                    <label htmlFor="diagnostic-routine-email" className="sr-only">
                      Votre adresse e-mail
                    </label>
                    <input
                      id="diagnostic-routine-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={routineEmail}
                      onChange={(e) => setRoutineEmail(e.target.value)}
                      placeholder="Votre adresse e-mail"
                      aria-invalid={envoiStatut === "erreur"}
                      aria-describedby={envoiMessage ? "diagnostic-routine-email-message" : undefined}
                      className="mt-3 w-full rounded-full border border-primary-foreground/25 bg-primary-foreground/[0.08] px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:border-gold focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={enCoursEnvoi}
                      className="kk-fill kk-fill-deep mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-deep disabled:opacity-60"
                    >
                      {enCoursEnvoi && <Loader2 className="h-4 w-4 animate-spin" />}
                      Recevoir ma routine par e-mail
                    </button>

                    {/* Case décochée par défaut : cocher inscrit, ne pas cocher
                        n'inscrit à rien — même en demandant l'envoi. */}
                    <label className="mt-3 flex items-start gap-2.5 text-xs text-primary-foreground/75">
                      <input
                        type="checkbox"
                        checked={inscrireLettre}
                        onChange={(e) => setInscrireLettre(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-gold"
                      />
                      <span>M&rsquo;inscrire aussi à la lettre d&rsquo;information</span>
                    </label>

                    {/* Les deux messages sont indépendants : l'un peut confirmer
                        pendant que l'autre signale un échec, et chacun nomme ce
                        qui le concerne — jamais un « une erreur est survenue »
                        générique qui laisserait deviner lequel des deux appels
                        a manqué. */}
                    {envoiMessage && (
                      <p
                        id="diagnostic-routine-email-message"
                        role={envoiStatut === "erreur" ? "alert" : "status"}
                        className="mt-2.5 text-xs text-gold"
                      >
                        {envoiMessage}
                      </p>
                    )}
                    {inscriptionMessage && (
                      <p role={inscriptionStatut === "erreur" ? "alert" : "status"} className="mt-1.5 text-xs text-gold">
                        {inscriptionMessage}
                      </p>
                    )}
                  </form>
                </div>
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

        {/* La question garde son <h1> — c'est bien le titre de l'écran — mais
            pas la TAILLE des titres de page.

            L'échelle globale monte le h1 jusqu'à 54 px, un calibre voulu pour
            un titre de rayon ou de hero. Appliqué à une question de formulaire,
            il occupait trois lignes et 180 px de haut avant même la première
            réponse, et repoussait les cartes sous la ligne de flottaison. On
            redescend ici, sans rien changer à l'échelle du site. */}
        <h1 className="mt-6 text-center text-[clamp(1.75rem,1.4rem+1.2vw,2.25rem)] leading-tight text-deep">
          {question.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-base text-muted-foreground">
          {question.subtitle}
        </p>

        {/* Cartes de réponse resserrées dans les mêmes proportions que la
            question : quatre choix courts n'ont pas besoin de 20 px de marge
            intérieure ni d'une pastille de 40 px. Les quatre tiennent
            désormais dans l'écran avec la question, ce qui est tout l'enjeu
            d'un questionnaire — voir ses options sans défiler. */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.answers.map((a) => {
            const active = selected === a.id;
            const A = Icon(a.icon);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => choose(a.id)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  active ? "border-deep bg-sand shadow-sm" : "border-border bg-card hover:border-deep/40"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${active ? "bg-deep text-primary-foreground" : "bg-sand text-deep"}`}>
                  <A className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.95rem] font-medium text-deep">{a.label}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">
                    {a.description}
                  </span>
                </span>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-deep bg-deep text-primary-foreground" : "border-border"}`}>
                  {active && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}

        {/* Navigation explicite.

            « Suivant » reste inactif tant qu'aucune réponse n'est choisie : le
            questionnaire n'a pas de question facultative, et un bouton qui
            n'avance pas quand on le presse est pire qu'un bouton grisé.

            Sur la première question, « Précédent » quitte le diagnostic —
            plutôt que de ramener sur un écran d'intro qui n'existe plus. Sur
            la dernière, « Suivant » devient « Voir mon résultat » : le libellé
            doit annoncer un changement d'écran, pas une question de plus. */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {qIndex === 0 ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Quitter
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setQIndex((i) => i - 1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Précédent
            </button>
          )}

          <button
            type="button"
            onClick={() => avancer(answers)}
            disabled={!selected}
            className="kk-fill inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition disabled:pointer-events-none disabled:opacity-40"
          >
            {qIndex < questions.length - 1 ? "Suivant" : "Voir mon résultat"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </MinimalShell>
  );
}

/** Coquille immersive : en-tête minimal (logo + quitter). */
function MinimalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* En-tête collant. Les écrans longs du parcours — la liste des produits
          conseillés, surtout — éloignaient « Quitter le diagnostic » de
          plusieurs hauteurs d'écran : la seule sortie du parcours immersif
          demandait de remonter tout en haut pour être atteinte.

          Le fond est OPAQUE et non transparent : sans lui, le contenu défile
          visiblement sous le titre. `backdrop-blur` adoucit le passage des
          visuels produits sous la barre. */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
