"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { Monogram } from "@/components/kk/motifs";
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
 * ── IL NE S'AFFICHE QUE S'IL SERT À QUELQUE CHOSE ────────────────────────────
 *
 * Le layout ne le monte que lorsqu'un fragment de mesure ou de publicité est
 * réellement actif au back-office (voir `tracageActif`). Sans traceur, la
 * boutique ne pose que le panier, la session et la langue — dispensés de
 * consentement par l'article 82 — et le bandeau ne paraît pas du tout.
 *
 * ── UNE PETITE CARTE, EN BAS À GAUCHE ────────────────────────────────────────
 *
 * Le bandeau était une carte de la hauteur d'un demi-écran : salutation, titre,
 * logo, trois paragraphes et un lien avant d'arriver aux boutons. Beaucoup de
 * cérémonie pour une question à deux issues.
 *
 * Il garde sa POSITION d'origine — coin bas gauche, hors du chemin du bouton
 * WhatsApp qui occupe le coin droit — mais tient désormais dans une vignette de
 * 21 rem : une phrase, deux boutons, un lien. Une barre pleine largeur avait
 * été essayée entre-temps ; elle barrait le hero de bout en bout, ce qui est
 * plus envahissant qu'une carte qu'on peut ignorer du coin de l'œil.
 *
 * ── CE QUI N'EST PAS NÉGOCIABLE ──────────────────────────────────────────────
 *
 * DEUX boutons de MÊME POIDS : « Refuser » et « Accepter ». Refuser coûte
 * exactement un clic, comme accepter, et le bouton d'acceptation n'est ni plus
 * gros ni plus coloré. Ce n'est pas une préférence de design : un « tout
 * accepter » mis en avant face à un refus caché derrière un second écran est
 * précisément ce que la CNIL sanctionne. Un bandeau à bouton unique, si
 * tentant soit-il pour ne plus déranger personne, serait un vice de
 * consentement — le refus doit rester aussi simple que l'accord.
 *
 * Le réglage fin passe en LIEN et non en troisième bouton : ceux qui veulent
 * trier catégorie par catégorie sont rares, et leur donner un bouton de même
 * poids qu'aux deux réponses franches allongeait la barre pour rien.
 *
 * Aucune croix de fermeture : fermer sans choisir laisserait le visiteur croire
 * qu'il a tranché alors que rien ne serait enregistré, et le bandeau
 * reviendrait à chaque page.
 *
 * ── POURQUOI UN RECHARGEMENT APRÈS LE CHOIX ──────────────────────────────────
 *
 * Les balises sont injectées au rendu SERVEUR (voir `CodeSnippets`). Un
 * `<script>` réinjecté plus tard par React ne s'exécute pas : le navigateur
 * n'exécute que ce qui vient du flux HTML initial. Un simple `router.refresh()`
 * afficherait donc un consentement accepté sans que la moindre balise démarre.
 * D'où le rechargement complet — le seul moyen honnête de faire correspondre
 * l'état affiché et l'état réel.
 *
 * Le rechargement n'a lieu QUE si le choix change ce qui est chargé : refuser
 * quand rien n'était accepté ne recharge rien.
 */

/** Événement écouté pour rouvrir le bandeau depuis le pied de page. */
export const COOKIE_PREFERENCES_EVENT = "kk:cookies:open";

const COPY = {
  fr: {
    /** Une phrase courte : ce qu'on dépose, et sous quelle condition. Elle tient
     *  dans une carte de 21 rem sans dépasser trois lignes. */
    line: "Nous mesurons l'audience du site. Rien n'est déposé sans votre accord.",
    refuse: "Refuser",
    choose: "Choisir",
    accept: "Accepter",
    save: "Enregistrer",
    back: "Retour",
    privacy: "Politique de confidentialité",
    panelTitle: "Vos préférences",
    categories: {
      necessaire: {
        label: "Strictement nécessaires",
        help: "Panier, compte, langue, sécurité. Sans eux, la boutique ne fonctionne pas.",
        locked: "Toujours actifs",
      },
      mesure: {
        label: "Mesure d'audience",
        help: "Compter les visites, pour améliorer la boutique.",
      },
      marketing: {
        label: "Publicité et réseaux sociaux",
        help: "Mesurer nos publicités et vous proposer des offres pertinentes.",
      },
    },
    open: "Préférences de cookies",
  },
  en: {
    line: "We measure site traffic. Nothing is stored without your agreement.",
    refuse: "Decline",
    choose: "Choose",
    accept: "Accept",
    save: "Save",
    back: "Back",
    privacy: "Privacy policy",
    panelTitle: "Your preferences",
    categories: {
      necessaire: {
        label: "Strictly necessary",
        help: "Basket, account, language, security. The shop needs them.",
        locked: "Always on",
      },
      mesure: {
        label: "Audience measurement",
        help: "Counting visits, so we can improve the shop.",
      },
      marketing: {
        label: "Advertising and social media",
        help: "Measuring our advertising and showing relevant offers.",
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
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[0.8rem] font-semibold text-deep">{label}</p>
        <p className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">{help}</p>
      </div>

      {locked ? (
        <span className="mt-0.5 shrink-0 rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold tracking-wide text-deep/60 uppercase">
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
    const avant = readConsentCookie();
    writeConsentCookie(consent);
    setClosing(true);

    // Le rechargement n'existe que pour laisser DÉMARRER des balises qui
    // n'étaient pas dans le flux HTML. Si le choix n'ouvre aucune catégorie qui
    // n'était pas déjà ouverte — un refus, ou un simple resserrement des
    // réglages — il n'y a rien à faire partir, et recharger la page ne ferait
    // que punir le visiteur d'avoir répondu.
    const ouvreQuelqueChose =
      (consent.mesure && !avant?.mesure) || (consent.marketing && !avant?.marketing);

    if (!ouvreQuelqueChose) {
      window.setTimeout(() => setRouvert(false), 260);
      return;
    }

    // On laisse l'animation de sortie se jouer avant de recharger : sans ce
    // délai, le bandeau disparaît d'un coup et le rechargement paraît être un
    // bogue plutôt qu'une confirmation.
    window.setTimeout(() => window.location.reload(), 260);
  }

  if (!visible) return null;

  const buttonBase =
    "rounded-full border px-4 py-2 text-[0.8rem] font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:outline-none";

  return (
    <div
      className={cn(
        // Coin bas gauche : le coin droit est pris par le bouton WhatsApp, et
        // une carte étroite laisse la page lisible derrière elle.
        // `w-[calc(100vw-2rem)]` plafonné à 21 rem : sur téléphone la carte
        // occupe la largeur moins ses marges, sur bureau elle s'arrête net.
        "fixed bottom-4 left-4 z-[70] w-[calc(100vw-2rem)] max-w-[21rem]",
        // La barre de gestes iOS mange sinon le bas de la carte.
        "mb-[env(safe-area-inset-bottom)]",
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
        aria-label={copy.line}
        className="rounded-2xl border border-border/70 bg-white p-4 shadow-[0_12px_36px_-12px_rgba(15,59,70,0.35)] outline-none"
      >
        {/* En-tête de marque, en registre de papier à lettres : le monogramme
            de la charte, puis un filet doré qui s'éteint vers la droite.
            LE MONOGRAMME PLUTÔT QUE LE LETTRAGE COMPLET. Le logotype officiel
            est au format 1070 × 306 : ramené à la hauteur admissible ici, il
            ferait 60 px de large et « SELECT » y deviendrait illisible. Le
            monogramme, lui, est dessiné pour tenir dans un carré — c'est
            précisément son usage.
            `title=""` : le nom de la maison est déjà annoncé par le `aria-label`
            du dialogue, l'annoncer deux fois n'apprend rien à qui écoute. */}
        <div className="mb-3 flex items-center gap-2.5">
          <Monogram className="h-6 w-6 shrink-0 text-deep" title="" />
          <span
            aria-hidden="true"
            className="h-px flex-1 bg-gradient-to-r from-gold/60 via-gold/20 to-transparent"
          />
        </div>

        {panel ? (
          <>
            <h2 className="font-display text-base font-bold text-deep">{copy.panelTitle}</h2>

            <div className="mt-2 max-h-[45vh] overflow-y-auto pr-1">
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

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPanel(false)}
                className={cn(buttonBase, "flex-1 border-border text-deep hover:border-deep hover:bg-cream")}
              >
                {copy.back}
              </button>
              <button
                type="button"
                onClick={() => decide(customConsent(mesure, marketing))}
                className={cn(buttonBase, "flex-1 border-deep bg-deep text-white hover:brightness-110")}
              >
                {copy.save}
              </button>
            </div>
          </>
        ) : (
          /* Trois niveaux, du plus lu au moins lu : la phrase, les deux
             réponses, le réglage fin. */
          <>
            <p className="text-[0.8rem] leading-snug text-foreground/85">
              {copy.line}{" "}
              <Link
                href="/confidentialite"
                className="font-medium text-deep underline underline-offset-2"
              >
                {copy.privacy}
              </Link>
            </p>

            {/* Refuser et accepter : même largeur, même graisse, un clic
                chacun. Le bouton d'acceptation n'est pas mis en avant. */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => decide(rejectAll())}
                className={cn(buttonBase, "flex-1 border-border text-deep hover:border-deep hover:bg-cream")}
              >
                {copy.refuse}
              </button>
              <button
                type="button"
                onClick={() => decide(acceptAll())}
                className={cn(buttonBase, "flex-1 border-deep bg-deep text-white hover:brightness-110")}
              >
                {copy.accept}
              </button>
            </div>

            {/* Le réglage fin en lien : utile à quelques-uns, il n'a pas à
                peser autant que les deux réponses franches. */}
            <button
              type="button"
              onClick={() => setPanel(true)}
              className="mt-2.5 text-[0.72rem] font-medium text-muted-foreground underline underline-offset-2 transition hover:text-deep"
            >
              {copy.choose}
            </button>
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
