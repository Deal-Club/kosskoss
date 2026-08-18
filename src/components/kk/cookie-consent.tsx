"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogoImage } from "@/components/brand/Logo";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { cn } from "@/lib/utils";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  acceptAll,
  customConsent,
  needsDecision,
  parseConsent,
  rejectAll,
  serializeConsent,
  type Consent,
} from "@/lib/consent";

/**
 * Bandeau de consentement aux traceurs.
 *
 * ── CE QUI EST NÉGOCIÉ, ET CE QUI NE L'EST PAS ───────────────────────────────
 *
 * Trois boutons de MÊME POIDS : « Non merci », « Je choisis », « OK pour moi ».
 * Refuser coûte exactement un clic, comme accepter. Ce n'est pas un choix
 * esthétique — un « tout accepter » mis en avant face à un refus caché derrière
 * deux écrans est précisément ce que la CNIL sanctionne. Le bouton d'acceptation
 * n'est donc pas plus coloré ni plus gros que celui de refus.
 *
 * Aucune croix de fermeture : fermer sans choisir laisserait le visiteur croire
 * qu'il a tranché alors que rien ne serait enregistré, et le bandeau
 * reviendrait à chaque page. Les trois boutons sont les seules sorties.
 *
 * ── POURQUOI UN RECHARGEMENT APRÈS LE CHOIX ──────────────────────────────────
 *
 * Les balises sont injectées au rendu SERVEUR (voir `CodeSnippets`). Un
 * `<script>` réinjecté plus tard par React ne s'exécute pas : le navigateur
 * n'exécute que ce qui vient du flux HTML initial. Un simple `router.refresh()`
 * afficherait donc un consentement accepté sans que la moindre balise démarre.
 * D'où le rechargement complet — le seul moyen honnête de faire correspondre
 * l'état affiché et l'état réel.
 */

/** Événement écouté pour rouvrir le bandeau depuis le pied de page. */
export const COOKIE_PREFERENCES_EVENT = "kk:cookies:open";

const COPY = {
  fr: {
    greeting: "Bonjour,",
    title: "Parlons cookies.",
    intro:
      "Les cookies indispensables au panier, à votre compte et à la langue du site sont déjà là : sans eux, la boutique ne fonctionne pas.",
    ask: "Pour le reste — mesurer l'audience, mesurer nos publicités — nous ne déposons rien sans votre accord.",
    later:
      "Vous pourrez revenir sur ce choix à tout moment depuis le lien « Préférences de cookies », en bas de chaque page.",
    refuse: "Non merci",
    choose: "Je choisis",
    accept: "OK pour moi",
    save: "Enregistrer mes choix",
    back: "Retour",
    privacy: "Politique de confidentialité",
    panelTitle: "Vos préférences",
    categories: {
      necessaire: {
        label: "Strictement nécessaires",
        help: "Panier, connexion à votre compte, langue d'affichage, sécurité. Toujours actifs : la boutique ne fonctionne pas sans eux.",
        locked: "Toujours actifs",
      },
      mesure: {
        label: "Mesure d'audience",
        help: "Compter les visites et comprendre quelles pages servent, pour améliorer la boutique.",
      },
      marketing: {
        label: "Publicité et réseaux sociaux",
        help: "Mesurer l'efficacité de nos publicités et vous présenter des offres plus proches de vos besoins.",
      },
    },
    open: "Préférences de cookies",
  },
  en: {
    greeting: "Hello,",
    title: "Let's talk cookies.",
    intro:
      "The cookies your basket, your account and the site language depend on are already here: without them the shop does not work.",
    ask: "For everything else — measuring traffic, measuring our advertising — we store nothing without your agreement.",
    later:
      "You can change your mind at any time from the “Cookie preferences” link at the bottom of every page.",
    refuse: "No thanks",
    choose: "Let me choose",
    accept: "That's fine",
    save: "Save my choices",
    back: "Back",
    privacy: "Privacy policy",
    panelTitle: "Your preferences",
    categories: {
      necessaire: {
        label: "Strictly necessary",
        help: "Basket, account sign-in, display language, security. Always on: the shop does not work without them.",
        locked: "Always on",
      },
      mesure: {
        label: "Audience measurement",
        help: "Counting visits and understanding which pages help, so we can improve the shop.",
      },
      marketing: {
        label: "Advertising and social media",
        help: "Measuring how well our advertising works and showing offers closer to what you need.",
      },
    },
    open: "Cookie preferences",
  },
} as const;

type Locale = keyof typeof COPY;

/** Pose le cookie. `SameSite=Lax` suffit : il n'est lu que sur notre domaine. */
function writeConsentCookie(consent: Consent): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function readConsentCookie(): Consent | null {
  const found = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(found?.slice(CONSENT_COOKIE.length + 1));
}

/**
 * Le cookie vit hors de React : on le lit avec `useSyncExternalStore`, comme le
 * raccourci du diagnostic lit son masquage dans localStorage.
 *
 * `instantaneServeur` répond « rien à demander » : le HTML livré ne contient
 * donc jamais le bandeau, aucune hydratation ne diverge, et React réconcilie
 * ensuite avec la valeur réelle. Un état posé dans un effet aurait fait la même
 * chose au prix d'un rendu en cascade — ce que le compilateur React refuse.
 */
function souscrireCookie(): () => void {
  // Personne d'autre ne modifie ce cookie pendant la vie de la page : après un
  // choix, on recharge. Il n'y a donc rien à écouter.
  return () => {};
}

function ilFautDemander(): boolean {
  return needsDecision(readConsentCookie());
}

function ilFautDemanderServeur(): boolean {
  return false;
}

// ---- Interrupteur ----

function Toggle({
  checked,
  onChange,
  label,
  help,
  locked,
  lockedLabel,
}: {
  checked: boolean;
  onChange?: (value: boolean) => void;
  label: string;
  help: string;
  locked?: boolean;
  lockedLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-deep">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{help}</p>
      </div>

      {locked ? (
        <span className="mt-1 shrink-0 rounded-full bg-cream px-3 py-1 text-[11px] font-bold tracking-wide text-deep/60 uppercase">
          {lockedLabel}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange?.(!checked)}
          className={cn(
            "relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:outline-none",
            checked ? "bg-deep" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300",
              checked && "translate-x-5",
            )}
          />
        </button>
      )}
    </div>
  );
}

// ---- Bandeau ----

export function CookieConsent({ locale = "fr" }: { locale?: string }) {
  const copy = COPY[(locale === "en" ? "en" : "fr") as Locale];

  const demande = useSyncExternalStore(souscrireCookie, ilFautDemander, ilFautDemanderServeur);

  // Ouverture explicite depuis le pied de page, indépendante du cookie : on
  // peut vouloir revoir ses réglages après les avoir enregistrés.
  const [rouvert, setRouvert] = useState(false);
  const [panel, setPanel] = useState(false);
  const [mesure, setMesure] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [closing, setClosing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Rouverture depuis le pied de page : on repart des choix en cours.
    function open() {
      const current = readConsentCookie();
      setMesure(current?.mesure ?? false);
      setMarketing(current?.marketing ?? false);
      setPanel(true);
      setRouvert(true);
    }

    window.addEventListener(COOKIE_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, open);
  }, []);

  const visible = demande || rouvert;

  // Le focus vient sur le bandeau à l'ouverture : un lecteur d'écran doit être
  // averti qu'une décision est attendue, pas la découvrir en fin de page.
  useEffect(() => {
    if (visible) cardRef.current?.focus();
  }, [visible]);

  function decide(consent: Consent) {
    writeConsentCookie(consent);
    setClosing(true);
    // On laisse l'animation de sortie se jouer avant de recharger : sans ce
    // délai, le bandeau disparaît d'un coup et le rechargement paraît être un
    // bogue plutôt qu'une confirmation.
    window.setTimeout(() => window.location.reload(), 260);
  }

  if (!visible) return null;

  const buttonBase =
    "flex-1 rounded-full border px-5 py-3 text-sm font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:outline-none";

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md",
        "motion-safe:transition-all motion-safe:duration-300",
        closing
          ? "translate-y-3 opacity-0"
          : "motion-safe:animate-[kk-consent-in_420ms_cubic-bezier(0.16,1,0.3,1)_both]",
      )}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={copy.title}
        className="rounded-3xl border border-border/70 bg-white p-6 shadow-[0_18px_50px_-12px_rgba(15,59,70,0.35)] outline-none sm:p-7"
      >
        {panel ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-deep">{copy.panelTitle}</h2>
              <LogoImage tone="dark" className="h-9 shrink-0" />
            </div>

            <div className="mt-4 max-h-[45vh] overflow-y-auto pr-1">
              <Toggle
                checked
                locked
                lockedLabel={copy.categories.necessaire.locked}
                label={copy.categories.necessaire.label}
                help={copy.categories.necessaire.help}
              />
              <Toggle
                checked={mesure}
                onChange={setMesure}
                label={copy.categories.mesure.label}
                help={copy.categories.mesure.help}
              />
              <Toggle
                checked={marketing}
                onChange={setMarketing}
                label={copy.categories.marketing.label}
                help={copy.categories.marketing.help}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPanel(false)}
                className={cn(buttonBase, "border-border text-deep hover:border-deep hover:bg-cream")}
              >
                {copy.back}
              </button>
              <button
                type="button"
                onClick={() => decide(customConsent(mesure, marketing))}
                className={cn(buttonBase, "border-deep bg-deep text-white hover:brightness-110")}
              >
                {copy.save}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-xl leading-tight font-bold text-deep">
                  {copy.greeting}
                </p>
                <h2 className="font-display text-xl leading-tight font-bold text-deep">
                  {copy.title}
                </h2>
              </div>
              <LogoImage tone="dark" className="h-10 shrink-0" />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-foreground/85">{copy.intro}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{copy.ask}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.later}</p>

            <Link
              href="/confidentialite"
              className="mt-2 inline-block text-xs font-medium text-deep underline underline-offset-2 hover:text-gold-ink"
            >
              {copy.privacy}
            </Link>

            {/* Trois boutons de même poids visuel : refuser n'est pas plus
                difficile qu'accepter. */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => decide(rejectAll())}
                className={cn(buttonBase, "border-border text-deep hover:border-deep hover:bg-cream")}
              >
                {copy.refuse}
              </button>
              <button
                type="button"
                onClick={() => setPanel(true)}
                className={cn(buttonBase, "border-border text-deep hover:border-deep hover:bg-cream")}
              >
                {copy.choose}
              </button>
              <button
                type="button"
                onClick={() => decide(acceptAll())}
                className={cn(buttonBase, "border-deep bg-deep text-white hover:brightness-110")}
              >
                {copy.accept}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Lien du pied de page.
 *
 * Il rouvre le bandeau au lieu d'ouvrir une page : le visiteur veut modifier
 * un réglage, pas lire un document.
 */
export function CookiePreferencesButton({ locale = "fr" }: { locale?: string }) {
  const copy = COPY[(locale === "en" ? "en" : "fr") as Locale];

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))}
      className="text-xs text-footer-foreground transition hover:text-gold-soft"
    >
      {copy.open}
    </button>
  );
}
