"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "./localized-link";
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
  Loader2,
} from "lucide-react";
import type { DiagIcon } from "@/lib/kk/diagnostic";
import { questionVisible } from "@/lib/kk/diagnostic-conditions";
import type { ClientQuestion } from "@/server/kk/diagnostic-data";
import type { DiagnosticResult } from "@/server/kk/diagnostic";
import type { KKRoutineView } from "@/types/kk";
import { questionnaireEntame, type Reprise } from "@/lib/kk/diagnostic-reprise";
import { Petal } from "./motifs";
import { RoutineAddToCart } from "./routine-add";
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
 *
 * QUESTION CONDITIONNELLE (Q5 « pores » du quiz client, lot 7C) : elle ne
 * s'affiche que si la réponse à Q2 (« priorite ») vaut « Boutons /
 * Imperfections » ou « Glow / Éclat » — `questionVisible()`
 * (src/lib/kk/diagnostic-conditions.ts) l'évalue à partir des CLÉS de réponse
 * déjà données, pas de leurs identifiants de base. `visibleQuestions`, dérivée
 * ci-dessous, est la liste qui compte réellement pour la navigation ET pour
 * le total affiché (« Question X sur Y ») : une question restée invisible ne
 * doit apparaître dans aucun des deux, sous peine d'annoncer un total que le
 * parcours ne tiendra pas.
 */
type Phase = "propose" | "question" | "loading" | "result";

/** Clé de reprise. `session` et non `local` : un diagnostic est daté, il ne
 *  doit pas ressurgir des semaines plus tard comme s'il était encore valable. */
const REPRISE = "kk-diagnostic";

export function DiagnosticFlow({
  questions,
  savedAnswerIds,
  locale = "fr",
}: {
  questions: ClientQuestion[];
  /** Réponses du dernier diagnostic du client connecté, lues côté serveur.
   *  `null` pour un visiteur sans session ou qui n'a jamais terminé le
   *  questionnaire — dans ce cas la page se comporte comme avant. */
  savedAnswerIds?: string[] | null;
  /** Langue de la page, transmise à la route de calcul de la routine et à
   *  l'envoi de la routine par e-mail — même usage que sur `NewsletterBand`,
   *  qui ne s'en sert que pour l'appel réseau, jamais pour changer le texte
   *  affiché. */
  locale?: string;
}) {
  const t = useTranslations("diagnostic");
  const tRoutine = useTranslations("routine");
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

  // Clés (DiagAnswer.key) des réponses déjà données, dérivées de `answers`
  // (qui stocke des identifiants de base). C'est cet ensemble, pas `answers`
  // lui-même, que `questionVisible()` attend — voir sa signature.
  const answerKeysDonnees = useMemo(() => {
    const cles = new Set<string>();
    for (const q of questions) {
      const id = answers[q.id];
      if (!id) continue;
      const a = q.answers.find((a) => a.id === id);
      if (a) cles.add(a.key);
    }
    return cles;
  }, [questions, answers]);

  /** Les questions RÉELLEMENT posées, dans l'ordre : c'est cette liste, pas
   *  `questions`, qui pilote la navigation et le total affiché. */
  const visibleQuestions = useMemo(
    () => questions.filter((q) => questionVisible(q, answerKeysDonnees)),
    [questions, answerKeysDonnees],
  );

  const question = visibleQuestions[qIndex];
  const selected = question ? answers[question.id] : undefined;

  // Reprise. Lue une seule fois au montage ; l'index est borné au cas où le
  // questionnaire aurait raccourci entre-temps au back-office. Bornée sur la
  // liste COMPLÈTE des questions ici (celle restaurée pour `answers` n'est
  // pas encore posée à ce point de l'effet) — le clamp exact sur les
  // questions réellement visibles est repris juste en dessous, à chaque rendu.
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(REPRISE);
      if (!brut) return;
      const repris = JSON.parse(brut) as Reprise;
      if (repris.answers) setAnswers(repris.answers);
      if (typeof repris.qIndex === "number") {
        setQIndex(Math.min(Math.max(repris.qIndex, 0), questions.length - 1));
      }
    } catch {
      /* Stockage indisponible ou illisible : on repart simplement de zéro. */
    }
  }, [questions.length]);

  // Clamp final : si la reprise (ou un changement de réponse à Q2 qui masque
  // Q5 après coup) laisse `qIndex` au-delà des questions réellement visibles,
  // on ramène sur la dernière plutôt que de rendre `question` undefined.
  useEffect(() => {
    if (visibleQuestions.length === 0) return;
    if (qIndex > visibleQuestions.length - 1) setQIndex(visibleQuestions.length - 1);
  }, [qIndex, visibleQuestions.length]);

  // Profil client : proposer de revoir la routine plutôt que de relancer le
  // QCM. N'écrase pas une reprise d'onglet déjà en cours — un questionnaire
  // entamé prime sur un ancien résultat, sans quoi revenir en arrière depuis
  // la question 3 renverrait sans cesse à cet écran.
  //
  // C'est un PROGRÈS RÉEL qu'on cherche, pas la simple présence de la clé :
  // l'effet d'enregistrement plus bas écrit `{"qIndex":0,"answers":{}}` dès le
  // premier montage, une valeur parfaitement vide mais bien présente. Se fier
  // à `getItem()` seul faisait donc dépendre la proposition de l'ordre de
  // déclaration des effets — elle ne survivait qu'au tout premier affichage de
  // la page, et tout retour dans le même onglet (aller voir un produit, passer
  // par le panier) renvoyait le client à la question 1.
  useEffect(() => {
    if (!savedAnswerIds || savedAnswerIds.length === 0) return;
    try {
      if (questionnaireEntame(sessionStorage.getItem(REPRISE))) return;
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
      setError(t("analysisFailed"));
      setPhase(retourEnErreur);
    }
  }

  async function avancer(reponses: Record<string, string>) {
    if (qIndex < visibleQuestions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    // Dernière question visible → analyse. Seules les questions réellement
    // posées entrent dans `answerIds` : une question restée invisible (Q5,
    // le plus souvent) n'a jamais reçu de réponse dans `reponses`, et
    // `filter(Boolean)` l'exclut naturellement plutôt que d'envoyer un
    // identifiant vide au moteur.
    const answerIds = visibleQuestions.map((q) => reponses[q.id]).filter(Boolean);
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
              ? t("rateLimitedWithMinutes", { minutes })
              : t("rateLimited"),
          );
          setEnvoiStatut("erreur");
          return;
        }
        if (!res.ok) {
          setEnvoiMessage(data.error ?? t("sendFailed"));
          setEnvoiStatut("erreur");
          return;
        }
        setEnvoiMessage(t("sendSuccess"));
        setEnvoiStatut("ok");
      } catch {
        setEnvoiMessage(t("checkConnection"));
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
              setInscriptionMessage(data.error ?? t("subscribeFailed"));
              setInscriptionStatut("erreur");
              return;
            }
            setInscriptionMessage(t("subscribeSuccess"));
            setInscriptionStatut("ok");
          } catch {
            setInscriptionMessage(t("subscribeFailed"));
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
          <p className="eyebrow">{t("proposeEyebrow")}</p>
          <h1 className="mt-2 text-deep">{t("proposeTitle")}</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("proposeText")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={revoirRoutine}
              className="kk-fill inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition"
            >
              {t("reviewRoutine")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={refaireQuestionnaire}
              className="text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              {t("retakeQuiz")}
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
        <DiagnosticAnalyse />
      </MinimalShell>
    );
  }

  /* ----------------------------------------------------------- Result -- */
  if (phase === "result" && result) {
    // Chips du profil déclaré : type de peau, préoccupation déclarée (celle
    // dite à Q2, CONSERVÉE même quand la bascule de sécurité l'a emportée —
    // c'est elle qui permet au bandeau de sécurité, plus bas, de dire « avant
    // votre préoccupation » plutôt que d'avoir l'air de s'être trompé), et
    // réactivité déclarée.
    const profil = [result.peauLabel, result.besoinDeclareLabel, result.reactiviteLabel].filter(Boolean);

    // Routine à proposer au formulaire d'envoi par e-mail : l'Essentielle en
    // priorité, la Premium en repli — voir la route qui applique la même
    // règle côté serveur.
    const routinePourEmail = result.essentielle ?? result.premium;
    const niveauPourEmail = result.essentielle ? t("resultEssentialBadge") : t("resultPremiumBadge");

    const aucuneRoutine = !result.essentielle && !result.premium;

    return (
      <MinimalShell>
        {/* Le résultat se lève au lieu d'apparaître d'un coup : il prend la
            suite du pétale qui vient de se remplir, et le raccord entre les
            deux écrans se lit comme un seul geste. */}
        <section className="kk-rise mx-auto max-w-4xl px-6 py-12">
          <p className="eyebrow">{t("resultEyebrow")}</p>
          <h1 className="mt-2 text-deep">{t("resultTitle")}</h1>

          {/* Le profil en une ligne : type de peau, besoin, sensibilité. */}
          {profil.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {profil.map((c) => (
                <span key={c} className="rounded-full bg-sand px-4 py-1.5 text-sm font-medium text-deep">
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* La phrase de priorité. */}
          {result.prioriteTexte && (
            <p className="mt-4 max-w-2xl text-muted-foreground">
              {t("resultPriority", { texte: result.prioriteTexte })}
            </p>
          )}

          {/* Conseil selon le type de peau (Q1) — texte exact du document du
              client, jamais reformulé ici (src/lib/kk/diagnostic-matrice.ts). */}
          {result.conseilTypePeau && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("resultSkinAdvice", { texte: result.conseilTypePeau })}
            </p>
          )}

          {/* La bascule de sécurité, quand elle s'est appliquée : le texte
              exact du document du client, recopié mot pour mot par
              diagnostic-matrice.ts (MESSAGE_SECURITE) — jamais reformulé ici.
              Elle explique pourquoi la routine ci-dessous n'est pas celle de
              la préoccupation déclarée plus haut. */}
          {result.messageSecurite && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-gold/40 bg-sand/70 p-4"
            >
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-deep" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-deep">{result.messageSecurite}</p>
            </div>
          )}

          {/* Les deux routines : Essentielle et Premium du même besoin. Si
              l'une des deux n'existe pas ou n'est plus servable, l'écran le
              dit plutôt que d'en inventer une (contrainte n°3 du lot). */}
          {aucuneRoutine ? (
            <div className="mt-8 rounded-2xl border border-border/70 bg-card p-6 text-center">
              <p className="text-muted-foreground">{t("resultNoRecommendation")}</p>
              <button
                type="button"
                onClick={refaireQuestionnaire}
                className="kk-fill mt-4 inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition"
              >
                {t("retakeQuiz")}
              </button>
            </div>
          ) : (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
                {t("resultSelectionTitle")}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {result.essentielle ? (
                  <ResultRoutineCard routine={result.essentielle} niveau="essentielle" t={t} tRoutine={tRoutine} />
                ) : (
                  <ResultRoutineMissing niveau="essentielle" t={t} />
                )}
                {result.premium ? (
                  <ResultRoutineCard routine={result.premium} niveau="premium" t={t} tRoutine={tRoutine} />
                ) : (
                  <ResultRoutineMissing niveau="premium" t={t} />
                )}
              </div>
            </div>
          )}

          {/* Conseil selon l'environnement (Q4) — dernier de l'ordre demandé,
              texte exact du document du client. */}
          {result.conseilEnvironnement && (
            <div className="mt-8 rounded-2xl bg-sand/60 p-5 text-sm leading-relaxed text-deep">
              {t("resultEnvironmentAdvice", { texte: result.conseilEnvironnement })}
            </div>
          )}

          {/* Envoi par e-mail de la routine proposée en premier (Essentielle,
              repli sur Premium). Le libellé nomme explicitement laquelle est
              envoyée — plutôt que de laisser croire que « cette routine »
              recouvre les deux. */}
          {routinePourEmail && (
            <form
              onSubmit={envoyerRoutineParEmail}
              className="mt-10 max-w-md rounded-2xl border border-border/70 bg-card p-5"
            >
              <h3 className="text-xs font-semibold tracking-[0.14em] text-deep uppercase">
                {t("emailFormTitle", { niveau: niveauPourEmail })}
              </h3>
              <label htmlFor="diagnostic-routine-email" className="sr-only">
                {t("emailLabel")}
              </label>
              <input
                id="diagnostic-routine-email"
                type="email"
                required
                autoComplete="email"
                value={routineEmail}
                onChange={(e) => setRoutineEmail(e.target.value)}
                placeholder={t("emailLabel")}
                aria-invalid={envoiStatut === "erreur"}
                aria-describedby={envoiMessage ? "diagnostic-routine-email-message" : undefined}
                className="mt-3 w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-deep placeholder:text-muted-foreground focus:border-deep focus:outline-none"
              />

              <button
                type="submit"
                disabled={enCoursEnvoi}
                className="kk-fill mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {enCoursEnvoi && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("sendRoutineEmail")}
              </button>

              {/* Case décochée par défaut : cocher inscrit, ne pas cocher
                  n'inscrit à rien — même en demandant l'envoi. */}
              <label className="mt-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={inscrireLettre}
                  onChange={(e) => setInscrireLettre(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-deep"
                />
                <span>{t("subscribeNewsletterCheckbox")}</span>
              </label>

              {envoiMessage && (
                <p
                  id="diagnostic-routine-email-message"
                  role={envoiStatut === "erreur" ? "alert" : "status"}
                  className="mt-2.5 text-xs text-deep"
                >
                  {envoiMessage}
                </p>
              )}
              {inscriptionMessage && (
                <p role={inscriptionStatut === "erreur" ? "alert" : "status"} className="mt-1.5 text-xs text-deep">
                  {inscriptionMessage}
                </p>
              )}
            </form>
          )}
        </section>
      </MinimalShell>
    );
  }

  /* --------------------------------------------------------- Question -- */
  if (!question) return null;
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
          {t("stepOf", { current: qIndex + 1, total: visibleQuestions.length })}
        </p>
        <div className="mx-auto mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-sand">
          <div
            className="kk-fill h-full rounded-full bg-deep transition-all"
            style={{ width: `${((qIndex + 1) / visibleQuestions.length) * 100}%` }}
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
        {question.subtitle && (
          <p className="mx-auto mt-2 max-w-md text-center text-base text-muted-foreground">
            {question.subtitle}
          </p>
        )}

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
                  {a.description && (
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">
                      {a.description}
                    </span>
                  )}
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
              <ArrowLeft className="h-4 w-4" /> {t("exit")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setQIndex((i) => i - 1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
            >
              <ArrowLeft className="h-4 w-4" /> {t("previous")}
            </button>
          )}

          <button
            type="button"
            onClick={() => avancer(answers)}
            disabled={!selected}
            className="kk-fill inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition disabled:pointer-events-none disabled:opacity-40"
          >
            {qIndex < visibleQuestions.length - 1 ? t("next") : t("seeResult")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </MinimalShell>
  );
}

/**
 * Une des deux routines du résultat (Essentielle ou Premium).
 *
 * Volontairement sans visuel : le composant serveur `RoutineCard`
 * (src/components/kk/routine-card.tsx) importe `next-intl/server`, incompatible
 * avec un rendu client — dupliquer sa mise en page ici sans cette dépendance
 * reste plus sûr qu'un import qui casserait le paquet client.
 */
function ResultRoutineCard({
  routine,
  niveau,
  t,
  tRoutine,
}: {
  routine: KKRoutineView;
  niveau: "essentielle" | "premium";
  t: ReturnType<typeof useTranslations>;
  tRoutine: ReturnType<typeof useTranslations>;
}) {
  const Badge = niveau === "essentielle" ? Leaf : Gem;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-deep uppercase">
        <Badge className="h-4 w-4" aria-hidden="true" />
        {niveau === "essentielle" ? t("resultEssentialBadge") : t("resultPremiumBadge")}
      </div>
      <h3 className="mt-2 font-display text-xl leading-snug">
        <Link href={routine.href} className="text-deep transition hover:text-deep/70">
          {routine.name}
        </Link>
      </h3>
      {routine.claim && <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{routine.claim}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        <RoutineAddToCart routine={routine} mode="achat" />
        <Link
          href={routine.href}
          className="group inline-flex items-center gap-1 text-sm font-medium text-deep kk-underline"
        >
          {tRoutine("detailLink")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

/** Quand une des deux routines n'existe pas (ou plus) pour le besoin retenu :
 *  l'écran le dit plutôt que d'en inventer une (contrainte n°3 du lot). */
function ResultRoutineMissing({
  niveau,
  t,
}: {
  niveau: "essentielle" | "premium";
  t: ReturnType<typeof useTranslations>;
}) {
  const Badge = niveau === "essentielle" ? Leaf : Gem;
  const libelle = niveau === "essentielle" ? t("resultEssentialBadge") : t("resultPremiumBadge");
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-border bg-sand/30 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-deep/70 uppercase">
        <Badge className="h-4 w-4" aria-hidden="true" />
        {libelle}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("resultRoutineMissing", { niveau: libelle })}</p>
    </div>
  );
}

/** Coquille immersive : en-tête minimal (logo + quitter). */
function MinimalShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("diagnostic");
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
          {t("exitDiagnostic")} <X className="h-4 w-4" />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
