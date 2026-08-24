/**
 * Pose des balises GA4/Meta Pixel côté navigateur et point d'entrée unique
 * pour les quatre composants qui déclenchent une mesure : la fiche produit
 * (`view_item`), l'ajout au panier (`add_to_cart`), l'entrée dans le tunnel
 * (`begin_checkout`) et la page de confirmation d'achat (`purchase`).
 *
 * ── MODULE PUR CÔTÉ IMPORTS, PAS CÔTÉ EFFETS ─────────────────────────────────
 *
 * Ce fichier vit dans `src/lib/kk/` : il n'importe que `@/lib/consent` et
 * `@/lib/kk/mesure`, deux modules purs — voir la règle en tête de ceux-ci.
 * Il touche en revanche `window` et `document`, des API du navigateur et non
 * des imports : c'est le même principe que `use-scroll-lock.ts`, déjà dans ce
 * dossier. Chaque fonction qui les utilise se protège par
 * `typeof window === "undefined"` pour rester appelable sans lever depuis un
 * test Node (aucun DOM) ou un rendu serveur.
 *
 * ── DEUX CONDITIONS POUR CHAQUE BALISE, PAS UNE ──────────────────────────────
 *
 * GA4 ne se charge, et un événement ne part vers lui, QUE si `ga4Id` est
 * configuré ET que le visiteur a accepté la catégorie « mesure ». Le Pixel
 * (et sa CAPI, côté serveur) suit la même règle sur la catégorie « marketing »
 * — c'est la catégorie sous laquelle le bandeau de consentement présente déjà
 * la publicité et le remarketing (voir `cookie-consent.tsx`), et le Pixel Meta
 * en est l'exemple même.
 *
 * La bibliothèque externe (`gtag/js`, `fbevents.js`) n'est chargée qu'une fois
 * les deux conditions réunies : c'est CETTE requête réseau, vers un domaine
 * tiers, qui constitue le dépôt soumis à article 82 — pas seulement les
 * événements envoyés ensuite.
 *
 * ── LE CONSENTEMENT EST RELU À CHAQUE ÉVÉNEMENT, PAS SEULEMENT AU CHARGEMENT ─
 *
 * Un retrait de consentement en cours de visite n'entraîne PAS toujours un
 * rechargement de page — `cookie-consent.tsx` ne recharge que si le nouveau
 * choix OUVRE une catégorie qui ne l'était pas, jamais quand il se contente
 * d'en refermer une. Une bibliothèque déjà chargée reste donc en mémoire après
 * un refus tardif : rien ne peut l'en retirer. C'est pourquoi
 * `mesurerEvenement` relit le cookie de consentement à CHAQUE appel plutôt que
 * de se fier à une décision prise une fois au montage : dès que le visiteur
 * retire son accord, plus aucun événement ne part, même si le script, lui,
 * reste présent en mémoire.
 *
 * ── UN ÉCHEC NE CASSE JAMAIS LA PAGE ──────────────────────────────────────────
 *
 * `mesurerEvenement` avale toute exception (bibliothèque absente, cookie
 * illisible…) : une mesure manquée est un désagrément statistique, jamais une
 * erreur visible du visiteur.
 */

import { allowsCategory, parseConsent, CONSENT_COOKIE, type ConsentCategory } from "@/lib/consent";
import { versGa4, versPixel, nomEvenementMeta, type EvenementDetail } from "@/lib/kk/mesure";

// ---- Le navigateur, typé sans `any` ----

/** Fonction `fbq`, augmentée des propriétés que le code de base Meta lui accroche. */
type FbqFunction = ((...args: unknown[]) => void) & {
  queue: unknown[];
  loaded: boolean;
  callMethod?: (...args: unknown[]) => void;
  version: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: FbqFunction;
    _fbq?: unknown;
  }
}

// ---- Consentement, relu en direct ----

/**
 * Même lecture que `readConsentCookie` dans `cookie-consent.tsx`, dupliquée
 * ici à dessein plutôt qu'importée : ce fichier reste un module de
 * `src/lib/kk/`, qui n'importe que des modules purs (voir l'en-tête), et
 * `cookie-consent.tsx` est un composant React. Les deux copies partagent la
 * même logique de fond — `CONSENT_COOKIE` et `parseConsent`, tous deux définis
 * une seule fois dans `@/lib/consent` — ce qui est le format qui a divergé une
 * fois dans ce projet (voir `parametres.ts`), pas cette poignée de lignes.
 */
function litConsentementCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const trouve = document.cookie.split("; ").find((entree) => entree.startsWith(`${CONSENT_COOKIE}=`));
  return trouve?.slice(CONSENT_COOKIE.length + 1);
}

/** Le visiteur autorise-t-il CETTE catégorie, MAINTENANT ? */
function consentementAutorise(categorie: ConsentCategory): boolean {
  return allowsCategory(parseConsent(litConsentementCookie()), categorie);
}

// ---- État du module : quels traceurs ont été chargés ----

let ga4Charge = false;
let pixelCharge = false;

/** Charge la bibliothèque `gtag.js`, une seule fois. */
function chargerGa4(id: string): void {
  if (ga4Charge || typeof window === "undefined") return;
  ga4Charge = true;

  window.dataLayer = window.dataLayer || [];
  const dataLayer = window.dataLayer;
  function gtag(...args: unknown[]) {
    dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  // `send_page_view: false` : GA4 n'émet PAS de vue de page automatique. Elle
  // est envoyée explicitement à chaque navigation par `MesurePageVue`
  // (`mesurerAction("page_view", …)`), pour capter aussi les changements de
  // route côté client de l'App Router, qui ne rechargent pas la page.
  gtag("config", id, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/**
 * Charge la bibliothèque `fbevents.js`, une seule fois — reprise du code de
 * base officiel Meta, SANS l'appel automatique `fbq('track', 'PageView')`
 * qu'il porte d'habitude : seuls les quatre événements du critère 20 doivent
 * partir, pas une vue de page que le brief ne demande pas.
 */
function chargerPixel(id: string): void {
  if (pixelCharge || typeof window === "undefined") return;
  pixelCharge = true;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    } as FbqFunction;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", id);
}

/**
 * Appelée une fois par le composant monté en layout, avec les identifiants
 * lus en base. Idempotente : un montage en double (React Strict Mode) ne
 * charge pas deux fois la même bibliothèque, grâce aux drapeaux `ga4Charge`/
 * `pixelCharge` ci-dessus.
 */
export function initialiserMesure(identifiants: { ga4Id: string; metaPixelId: string }): void {
  try {
    if (identifiants.ga4Id && consentementAutorise("mesure")) {
      chargerGa4(identifiants.ga4Id);
    }
    if (identifiants.metaPixelId && consentementAutorise("marketing")) {
      chargerPixel(identifiants.metaPixelId);
    }
  } catch (erreur) {
    // Un traceur absent ou une bibliothèque tierce en échec ne doit jamais
    // faire tomber le montage de la page.
    console.error("[mesure] initialisation impossible", erreur);
  }
}

// ---- Émission des quatre événements ----

/** GA4 nomme ses événements e-commerce EXACTEMENT comme `EvenementMesure` : aucune table n'est nécessaire. */

/**
 * Émet un événement vers GA4 et/ou le Pixel Meta, chacun sous condition de son
 * propre couple (identifiant configuré, catégorie de consentement accordée) —
 * relu ICI, pas seulement au chargement (voir l'en-tête du fichier).
 *
 * N'exige pas que `initialiserMesure` ait déjà tourné : si le traceur n'a pas
 * été chargé (identifiant absent au montage, consentement pas encore donné),
 * `window.gtag`/`window.fbq` sont simplement absents et rien ne part. Cette
 * fonction ne charge JAMAIS la bibliothèque elle-même — seul `chargerGa4`/
 * `chargerPixel`, appelés par `initialiserMesure`, le font. Un consentement
 * accordé APRÈS le montage sans rechargement de page (bandeau rouvert depuis
 * le pied de page, par exemple) n'active donc rien tant que la page n'a pas
 * rappelé `initialiserMesure` : l'événement qui a déclenché ce constat-là est
 * perdu, comme toute mesure manquée (voir l'en-tête du fichier).
 */
export function mesurerEvenement(detail: EvenementDetail): void {
  try {
    if (typeof window === "undefined") return;

    // Les identifiants ne sont plus disponibles ici une fois `initialiserMesure`
    // passée : on ne les redemande pas, on se contente de vérifier que le
    // chargement a bien eu lieu ET que le consentement tient toujours.
    if (ga4Charge && consentementAutorise("mesure") && typeof window.gtag === "function") {
      window.gtag("event", detail.type, versGa4(detail));
    }

    if (pixelCharge && consentementAutorise("marketing") && typeof window.fbq === "function") {
      // `event_id` part en troisième argument (`eventID`), pas dans les
      // données personnalisées : c'est la forme que Meta attend pour
      // rapprocher cet envoi Pixel de l'envoi CAPI équivalent, côté serveur,
      // portant le MÊME identifiant (voir `src/server/kk/capi.ts`).
      const { event_id: eventID, ...donnees } = versPixel(detail);
      window.fbq("track", nomEvenementMeta(detail.type), donnees, { eventID });
    }
  } catch (erreur) {
    // Une mesure perdue est un désagrément statistique ; elle ne doit jamais
    // remonter au visiteur ni interrompre le geste qui vient de la déclencher
    // (ajout au panier, passage en caisse...).
    console.error("[mesure] envoi impossible", erreur);
  }
}

// ---- Émission générique (vue de page, diagnostic, contact…) ----

/**
 * Émet un événement GA4 « libre » (nom + paramètres arbitraires), et
 * facultativement un événement Meta standard, sous les MÊMES gardes que
 * `mesurerEvenement` : bibliothèque chargée + catégorie de consentement relue à
 * l'instant. Sert aux mesures qui ne suivent pas le gabarit e-commerce
 * (`view_item`…) : `page_view`, le tunnel du Diagnostic Beauté, le clic de
 * contact WhatsApp.
 *
 * `optionsMeta.evenement` : si renseigné, un `fbq('track', …)` part aussi sous
 * consentement « marketing » (ex. « Contact » pour le clic WhatsApp). Absent,
 * l'événement reste GA4 uniquement — le cas de `page_view` et du diagnostic,
 * que le Pixel n'a pas à recevoir.
 */
export function mesurerAction(
  nom: string,
  parametres: Record<string, unknown> = {},
  optionsMeta: { evenement?: string } = {},
): void {
  try {
    if (typeof window === "undefined") return;

    if (ga4Charge && consentementAutorise("mesure") && typeof window.gtag === "function") {
      window.gtag("event", nom, parametres);
    }

    if (
      optionsMeta.evenement &&
      pixelCharge &&
      consentementAutorise("marketing") &&
      typeof window.fbq === "function"
    ) {
      window.fbq("track", optionsMeta.evenement, parametres);
    }
  } catch (erreur) {
    console.error("[mesure] action impossible", erreur);
  }
}

/** Réservé aux tests : remet le module dans son état initial (rien de chargé). */
export function _reinitialiserPourLesTests(): void {
  ga4Charge = false;
  pixelCharge = false;
}
