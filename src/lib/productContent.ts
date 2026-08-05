import { isValidGtin } from "./gtin";

/**
 * Contenu rédigé pour un produit, appliqué en base par son slug.
 * On indexe par slug, pas par SKU : `slug` est `@unique` dans le schéma
 * Prisma, alors que le SKU ne l'est pas (il est dérivé par troncature du
 * slug dans `scripts/seed-bois-variations.ts` et peut entrer en collision).
 */
export interface ProductContent {
  slug: string;
  description: string;
  shortDescription: string;
  descriptionEn: string;
  shortDescriptionEn: string;
  /**
   * Caractéristiques affichées en liste sur la fiche produit (colonne `bullets`).
   * Champ facultatif : une entrée qui ne le porte pas laisse intactes les
   * caractéristiques déjà en base.
   */
  bullets?: string[];
  bulletsEn?: string[];
  /** Écrit seulement si le checksum est valide et la source identifiable. */
  gtin?: string;
  mpn?: string;
  googleProductCategory?: string;
  shippingWeightGrams?: number;
  energyEfficiencyClass?: string;
}

// Fourchette de longueur des descriptions longues.
//
// Le plafond était fixé à 800 caractères, ce qui produisait des fiches jugées
// trop maigres par le commerçant : à ce format, la description tient les
// caractéristiques techniques et rien d'autre. Il est passé à 2400 pour laisser
// place à ce qui fait vraiment décider un acheteur — quel appareil, quelle
// autonomie, comment stocker, comment choisir entre deux longueurs.
//
// Deuxième passe : le commerçant demande des fiches rédigées en plusieurs
// paragraphes (nature du produit, essence, séchage, usage, stockage). Le
// plafond monte donc à 3800 et le plancher à 1100, pour que la fiche détaillée
// soit la norme et non un cas particulier.
//
// Google Merchant accepte jusqu'à 5 000 caractères : la contrainte est
// éditoriale, pas technique.
const LONGUEUR_MIN = 1100;
const LONGUEUR_MAX = 3800;

/**
 * Nombre de caractéristiques attendues quand le champ est renseigné.
 *
 * Le plafond était de 6, calibré pour une liste d'accroches. Les fiches portent
 * désormais un vrai tableau « intitulé : valeur » (produit, composition,
 * conditionnement, humidité, appareils compatibles, stockage…), dont seules les
 * lignes réellement documentées sont écrites : 16 laisse la place au cas le
 * plus complet sans autoriser une liste fourre-tout.
 *
 * À noter : `src/server/merchant.ts` ne reprend que les 10 premières entrées
 * dans `product_highlights`. Les caractéristiques sont donc rangées de la plus
 * distinctive à la plus accessoire.
 */
const BULLETS_MIN = 3;
const BULLETS_MAX = 16;
/**
 * Une caractéristique reste une étiquette, pas un paragraphe. La borne passe de
 * 90 à 120 caractères : le format « intitulé : valeur » consomme à lui seul une
 * vingtaine de caractères avant la valeur utile.
 */
const BULLET_LONGUEUR_MAX = 120;

// Vocabulaire commercial que Google refuse dans une description : il décrit
// l'offre du marchand, pas le produit. `src/server/merchant.ts` (ligne ~336)
// retombe sur `shortDescription` quand `description` est absente : le champ
// court est une source du flux au même titre, donc soumis au même contrôle.
const MOTS_PROMOTIONNELS = [
  // Français
  "livraison offerte",
  "livraison gratuite",
  "meilleur prix",
  "prix imbattable",
  "promotion",
  "soldes",
  "déstockage",
  "offre spéciale",
  "profitez",
  "commandez",
  // Anglais — mêmes formules commerciales, pour la version /en du site.
  "free delivery",
  "free shipping",
  "best price",
  "lowest price",
  "special offer",
  "order now",
  "buy now",
  "sale",
  "discount",
  "limited time",
];

// Reprend la liste utilisée par `src/server/merchant.test.ts` : les deux
// contrôles doivent traquer le même vocabulaire allemand résiduel.
const MOTS_ALLEMANDS = [
  "von",
  "Ausstattung",
  "Zustand",
  "fabrikneu",
  "originalverpackt",
  "Aktion",
  "Beschreibung",
  "Zeichen",
  "Klassifizierung",
  "Versand",
  "Energielabel",
  "Pflichtfelder",
  "Preis",
];

/**
 * Contrôle commun HTML / vocabulaire promotionnel / mots allemands, partagé
 * entre les champs longs et les champs courts.
 *
 * `mot` est cherché par mot entier (`\b...\b`), pas par sous-chaîne : un
 * terme anglais comme « sale » ne doit pas se déclencher sur « wholesale »,
 * un scénario réel avec la liste anglaise ajoutée ci-dessus. La casse est
 * ignorée (drapeau `i`) pour les deux listes : le vocabulaire allemand doit
 * être détecté aussi bien en début de phrase (« Ausstattung ») qu'ailleurs
 * (« ausstattung »), exactement comme le fait déjà le contrôle promotionnel.
 */
function controleContenu(ou: string, champ: string, texte: string, anomalies: string[]): void {
  if (/<[a-z/][^>]*>/i.test(texte)) {
    anomalies.push(`${ou} ${champ} contient du HTML`);
  }
  const promo = MOTS_PROMOTIONNELS.find((mot) => new RegExp(`\\b${mot}\\b`, "i").test(texte));
  if (promo) {
    anomalies.push(`${ou} ${champ} contient le terme promotionnel « ${promo} »`);
  }
  const allemand = MOTS_ALLEMANDS.find((mot) => new RegExp(`\\b${mot}\\b`, "i").test(texte));
  if (allemand) {
    anomalies.push(`${ou} ${champ} contient le mot allemand « ${allemand} »`);
  }
}

/**
 * Contrôle la conformité du contenu avant écriture. Rend la liste des anomalies,
 * vide si tout est conforme. Ne lève pas : l'appelant décide quoi en faire.
 */
export function validateProductContent(entries: ProductContent[]): string[] {
  const anomalies: string[] = [];
  const vus = new Set<string>();
  const gtinsVus = new Set<string>();
  const mpnsVus = new Set<string>();

  for (const entry of entries) {
    const ou = `[${entry.slug}]`;

    if (vus.has(entry.slug)) anomalies.push(`${ou} slug en double`);
    vus.add(entry.slug);

    for (const [champ, texte] of [
      ["description", entry.description],
      ["descriptionEn", entry.descriptionEn],
    ] as const) {
      if (texte.length < LONGUEUR_MIN) {
        anomalies.push(`${ou} ${champ} fait ${texte.length} caractères, minimum ${LONGUEUR_MIN}`);
      }
      if (texte.length > LONGUEUR_MAX) {
        anomalies.push(`${ou} ${champ} fait ${texte.length} caractères, maximum ${LONGUEUR_MAX}`);
      }
      controleContenu(ou, champ, texte, anomalies);
    }

    // Champs courts : pas de fourchette 400-800 (ils visent ~140 caractères),
    // mais soumis aux mêmes contrôles HTML / promotionnel / allemand, plus une
    // vérification de non-vacuité — une valeur vide y passait jusqu'ici sans
    // anomalie alors que `merchant.ts` peut s'en servir en repli.
    for (const [champ, texte] of [
      ["shortDescription", entry.shortDescription],
      ["shortDescriptionEn", entry.shortDescriptionEn],
    ] as const) {
      if (!texte.trim()) {
        anomalies.push(`${ou} ${champ} est vide`);
      }
      controleContenu(ou, champ, texte, anomalies);
    }

    // Caractéristiques : facultatives, mais dès qu'elles sont fournies elles
    // doivent l'être dans les deux langues et sous forme d'étiquettes courtes.
    // C'est ce contrôle qui empêche de réintroduire les deux défauts relevés
    // par le commerçant : une liste vide, ou une phrase entière recopiée en
    // guise de caractéristique.
    if (entry.bullets !== undefined || entry.bulletsEn !== undefined) {
      for (const [champ, liste] of [
        ["bullets", entry.bullets],
        ["bulletsEn", entry.bulletsEn],
      ] as const) {
        if (!liste || liste.length === 0) {
          anomalies.push(`${ou} ${champ} est absent alors que l'autre langue est renseignée`);
          continue;
        }
        if (liste.length < BULLETS_MIN || liste.length > BULLETS_MAX) {
          anomalies.push(
            `${ou} ${champ} compte ${liste.length} entrées, attendu entre ${BULLETS_MIN} et ${BULLETS_MAX}`,
          );
        }
        for (const texte of liste) {
          if (!texte.trim()) {
            anomalies.push(`${ou} ${champ} contient une entrée vide`);
            continue;
          }
          if (texte.length > BULLET_LONGUEUR_MAX) {
            anomalies.push(
              `${ou} ${champ} : « ${texte.slice(0, 40)}… » fait ${texte.length} caractères, maximum ${BULLET_LONGUEUR_MAX}`,
            );
          }
          controleContenu(ou, champ, texte, anomalies);
        }
      }

      // Les deux listes décrivent le même produit : un décompte différent
      // signale une traduction oubliée.
      if (entry.bullets && entry.bulletsEn && entry.bullets.length !== entry.bulletsEn.length) {
        anomalies.push(
          `${ou} bullets (${entry.bullets.length}) et bulletsEn (${entry.bulletsEn.length}) n'ont pas le même nombre d'entrées`,
        );
      }
    }

    if (entry.description.trim() === entry.shortDescription.trim()) {
      anomalies.push(`${ou} description identique à shortDescription`);
    }
    if (entry.descriptionEn.trim() === entry.shortDescriptionEn.trim()) {
      anomalies.push(`${ou} descriptionEn identique à shortDescriptionEn`);
    }

    if (entry.gtin !== undefined) {
      if (!isValidGtin(entry.gtin)) {
        anomalies.push(`${ou} GTIN « ${entry.gtin} » : checksum invalide`);
      } else if (gtinsVus.has(entry.gtin)) {
        anomalies.push(`${ou} GTIN « ${entry.gtin} » en double`);
      }
      gtinsVus.add(entry.gtin);
    }

    if (entry.mpn !== undefined && entry.mpn.trim()) {
      if (mpnsVus.has(entry.mpn)) {
        anomalies.push(`${ou} MPN « ${entry.mpn} » en double`);
      }
      mpnsVus.add(entry.mpn);
    }
  }

  return anomalies;
}
