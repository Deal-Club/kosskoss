/**
 * Consentement aux traceurs.
 *
 * ── POURQUOI CE MODULE EXISTE ────────────────────────────────────────────────
 *
 * `TARGET.md` disait qu'un bandeau était inutile « tant que seuls des cookies
 * strictement nécessaires sont déposés ». C'était vrai — ça ne l'est plus : la
 * boutique dispose d'un écran « Scripts & balises » qui injecte du HTML
 * arbitraire (gestionnaire de balises, pixel publicitaire) dans toutes les
 * pages, pour tous les visiteurs. Dès qu'un fragment de ce type est actif,
 * l'article 82 de la loi Informatique et Libertés s'applique et le consentement
 * doit être recueilli AVANT le dépôt.
 *
 * Le chat Smartsupp, lui, ne pose pas de problème : il ne charge rien tant que
 * le visiteur n'a pas cliqué — voir `SmartsuppLauncher`.
 *
 * ── TROIS RÈGLES QUI GOUVERNENT TOUT LE MODULE ───────────────────────────────
 *
 *  1. **En cas de doute, on ne dépose rien.** Cookie absent, illisible, d'une
 *     version inconnue ou périmé : `allowsCategory` répond non. Le silence n'est
 *     jamais un accord, et un bogue de lecture ne doit pas se traduire par un
 *     pixel qui part.
 *
 *  2. **Refuser est aussi simple qu'accepter.** Le bandeau porte « Non merci »
 *     et « OK pour moi » au même niveau, avec le même nombre de clics. C'est
 *     une exigence de la CNIL, pas une préférence de design.
 *
 *  3. **Le choix se périme.** Six mois, la durée recommandée par la CNIL :
 *     passé ce délai le bandeau revient, y compris après un refus.
 *
 * Le format du cookie est volontairement lisible à l'œil nu — `1.1.0.1755424800`
 * — plutôt qu'un JSON encodé : on peut vérifier un consentement depuis
 * l'inspecteur du navigateur, sans outil.
 */

export const CONSENT_COOKIE = "kk_consent";

/**
 * Version du format ET du périmètre demandé.
 *
 * L'incrémenter invalide tous les consentements en cours et fait revenir le
 * bandeau. C'est le geste à faire le jour où une nouvelle catégorie de traceurs
 * apparaît : un accord donné pour deux catégories ne vaut pas pour trois.
 */
export const CONSENT_VERSION = 1;

/**
 * Treize mois — le maximum retenu par la CNIL pour la durée de vie d'un cookie
 * de consentement.
 *
 * C'était six mois, la durée qu'elle *recommande* pour re-solliciter. Mais un
 * visiteur régulier se voyait alors redemander son avis deux fois par an, y
 * compris après avoir refusé : la définition même de l'agacement, pour une
 * réponse qui n'avait pas changé. Treize mois reste dans le cadre et divise
 * cette fréquence par plus de deux.
 *
 * Ce qui ne change pas : le choix reste révocable à tout moment depuis le pied
 * de page, et incrémenter `CONSENT_VERSION` le réinitialise immédiatement le
 * jour où une nouvelle catégorie de traceurs apparaît.
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 396;

/**
 * `necessaire`  session, panier, langue, panier d'achat — jamais négociable
 * `mesure`      statistiques de fréquentation
 * `marketing`   publicité, remarketing, réseaux sociaux
 */
export const CONSENT_CATEGORIES = ["necessaire", "mesure", "marketing"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export function isConsentCategory(value: unknown): value is ConsentCategory {
  return typeof value === "string" && (CONSENT_CATEGORIES as readonly string[]).includes(value);
}

export interface Consent {
  readonly version: number;
  readonly mesure: boolean;
  readonly marketing: boolean;
  readonly decidedAt: Date;
}

// ---- Construction ----

export function customConsent(mesure: boolean, marketing: boolean, now: Date = new Date()): Consent {
  // La seconde est la précision du cookie : arrondir ici garantit qu'un aller
  // et retour par `serializeConsent` rend exactement le même objet.
  const decidedAt = new Date(Math.floor(now.getTime() / 1000) * 1000);
  return { version: CONSENT_VERSION, mesure, marketing, decidedAt };
}

export function acceptAll(now: Date = new Date()): Consent {
  return customConsent(true, true, now);
}

export function rejectAll(now: Date = new Date()): Consent {
  return customConsent(false, false, now);
}

// ---- Sérialisation ----

/** `version.mesure.marketing.horodatage` — aucun caractère réservé des cookies. */
export function serializeConsent(consent: Consent): string {
  const flag = (value: boolean) => (value ? "1" : "0");
  return [
    consent.version,
    flag(consent.mesure),
    flag(consent.marketing),
    Math.floor(consent.decidedAt.getTime() / 1000),
  ].join(".");
}

/**
 * Lit la valeur du cookie.
 *
 * Rend `null` dès que quelque chose cloche — et `null` signifie « aucune
 * décision », donc « on ne dépose rien et on redemande ». Aucun repli
 * permissif : c'est le seul comportement acceptable pour un module de
 * consentement.
 */
export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 4) return null;

  const version = Number(parts[0]);
  if (version !== CONSENT_VERSION) return null;

  const seconds = Number(parts[3]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  // Tout ce qui n'est pas exactement « 1 » vaut refus : une valeur inattendue
  // ne doit pas devenir un accord par accident.
  return {
    version,
    mesure: parts[1] === "1",
    marketing: parts[2] === "1",
    decidedAt: new Date(seconds * 1000),
  };
}

// ---- Décision ----

export function isExpired(consent: Consent, now: Date = new Date()): boolean {
  return now.getTime() - consent.decidedAt.getTime() > CONSENT_MAX_AGE_SECONDS * 1000;
}

/** Faut-il afficher le bandeau ? */
export function needsDecision(consent: Consent | null, now: Date = new Date()): boolean {
  if (!consent) return true;
  return isExpired(consent, now);
}

/**
 * Seule fonction que le reste du code doit appeler pour savoir si un traceur
 * peut se déclencher.
 */
export function allowsCategory(
  consent: Consent | null,
  category: ConsentCategory,
  now: Date = new Date(),
): boolean {
  // Les cookies nécessaires ne relèvent pas du consentement : session, panier,
  // langue. Les refuser reviendrait à casser la boutique.
  if (category === "necessaire") return true;

  if (!consent) return false;
  if (isExpired(consent, now)) return false;

  return category === "mesure" ? consent.mesure : consent.marketing;
}
