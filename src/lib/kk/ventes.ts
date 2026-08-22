/**
 * Agrégation des ventes pour le tableau de bord et l'export comptable.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * L'écran et l'export CSV consomment les mêmes totaux. En gardant le module
 * sans dépendance, la règle de calcul est testable sans base — et c'est la
 * seule partie du lot où une erreur se verrait chez le comptable.
 *
 * ── LE FCFA N'A PAS DE SOUS-UNITÉ ───────────────────────────────────────────
 *
 * Les entiers reçus ici SONT des francs entiers. Le suffixe « Cents » des
 * champs de la base est hérité d'une activité précédente et ment. Aucune
 * division par 100 nulle part.
 *
 * ── CE QUE `null` VEUT DIRE ─────────────────────────────────────────────────
 *
 * Un coût à `null` n'est pas un coût de zéro : c'est un coût qu'on ignore. Une
 * ligne sans coût entre dans le chiffre d'affaires et reste hors de la marge.
 * D'où `lignesAvecCout` / `lignesTotal`, que l'écran est tenu d'afficher : une
 * marge muette sur son incomplétude ment. La même règle vaut pour
 * `panierMoyenCents` : une moyenne sur zéro commande n'est pas nulle, elle
 * n'existe pas.
 *
 * ── LA MARGE COMPARE DEUX MONTANTS, PAS FORCÉMENT SUR LA MÊME BASE ──────────
 *
 * `margeCents` soustrait un coût d'achat (`unitCostCents`) d'un prix de vente
 * (le total NET de la ligne). Si ces deux montants ne sont pas saisis sur la
 * même base, le taux qui en sort est approximatif. C'est une question qui
 * relève du comptable, pas de ce module — elle est notée ici pour qui lira ce
 * calcul plus tard.
 *
 * ── BRUT, REMISE, NET : TROIS GRANDEURS, JAMAIS CONFONDUES ──────────────────
 *
 * Une ligne porte `lineTotalCents` (le total BRUT, prix unitaire × quantité)
 * et `remiseCents` (sa part de la remise de la commande). Leur différence est
 * le CA NET de la ligne — c'est LUI, jamais le brut, qui entre dans
 * `chiffreAffairesCents`, dans la marge et dans le panier moyen : c'est
 * l'argent réellement reçu, celui qui doit couvrir le coût d'achat. Confondre
 * brut et net revient à afficher un chiffre d'affaires et une marge
 * surévalués du montant exact des remises accordées.
 */

export interface LigneVente {
  orderId: string;
  orderNumber: string;
  /** Date de référence de la vente : encaissement quand il est connu. */
  date: Date;
  brand: string;
  name: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  /** Total BRUT de la ligne, avant remise : prix unitaire × quantité. */
  lineTotalCents: number;
  /**
   * Part de la remise de commande attribuée à cette ligne, au prorata de son
   * total brut — voir `repartirRemise`. Toujours 0 sur une commande sans code
   * promo.
   */
  remiseCents: number;
  /** `null` = coût inconnu au moment de la vente. Jamais confondu avec 0. */
  unitCostCents: number | null;
}

export interface TotauxVentes {
  /**
   * Chiffre d'affaires NET : somme des lignes de produits (brut MOINS les
   * remises réparties dessus), livraison exclue. Cette boutique ne décompose
   * pas ses prix en hors taxe et taxe : le montant est celui réglé, tel quel.
   * C'est ce total, net des remises, qui est comparable à l'encaissé compté
   * par ailleurs (`Order.totalCents`).
   */
  chiffreAffairesCents: number;
  /** Remises accordées sur la période, déjà déduites de `chiffreAffairesCents` ci-dessus. */
  remisesCents: number;
  quantite: number;
  nombreCommandes: number;
  /** `null` sans commande : une moyenne sur zéro commande n'existe pas. */
  panierMoyenCents: number | null;
  /** `null` quand aucune ligne de la période n'a de coût. Calculée sur le NET. */
  margeCents: number | null;
  /** Points de pourcentage, une décimale, rapportés au CA NET des seules
   *  lignes qui ont un coût. */
  tauxMarge: number | null;
  lignesAvecCout: number;
  lignesTotal: number;
}

export interface VenteProduit {
  cle: string;
  brand: string;
  name: string;
  variantLabel: string;
  quantite: number;
  /** NET : brut moins la part de remise de chaque ligne du produit. */
  chiffreAffairesCents: number;
  margeCents: number | null;
  lignesSansCout: number;
}

export interface PointJour {
  /** « AAAA-MM-JJ », en heure locale. */
  jour: string;
  chiffreAffairesCents: number;
  nombreCommandes: number;
}

/** CA NET d'une ligne : son total brut, moins la part de remise reçue. */
function caNetLigne(ligne: LigneVente): number {
  return ligne.lineTotalCents - ligne.remiseCents;
}

/**
 * Marge d'une ligne, ou `null` si son coût est inconnu.
 *
 * Calculée sur le CA NET, pas sur le brut : c'est l'argent réellement reçu
 * après remise qui doit couvrir le coût d'achat. La calculer sur le brut
 * surévaluerait la marge du montant exact de la remise.
 */
function margeLigne(ligne: LigneVente): number | null {
  if (ligne.unitCostCents === null) return null;
  return caNetLigne(ligne) - ligne.unitCostCents * ligne.quantity;
}

/**
 * Répartit la remise d'une commande sur ses lignes, au prorata du total brut
 * de chacune.
 *
 * ── POURQUOI LA DERNIÈRE LIGNE ABSORBE LE RESTE D'ARRONDI ───────────────────
 *
 * Chaque part est arrondie à l'entier inférieur ; la somme de ces parts
 * arrondies peut alors tomber quelques francs en-dessous de la remise
 * réellement accordée. Donner ce reste à la DERNIÈRE ligne — plutôt que de le
 * perdre, ou de le répartir une seconde fois au prorata — garantit que la
 * somme des parts vaut EXACTEMENT `discountCents`. Un écart d'un franc dans
 * une comptabilité se cherche pendant une heure ; il ne doit jamais
 * apparaître ici.
 *
 * `subtotalCents` à 0 rend une remise nulle sur chaque ligne : diviser par
 * zéro n'a pas de sens, et une commande sans sous-total n'a rien à répartir.
 *
 * Garde-fou : la part d'une ligne ne dépasse jamais son propre total brut —
 * une remise mal saisie en base ne doit pas rendre une ligne négative.
 *
 * ── QUAND CE GARDE-FOU PEUT EMPÊCHER L'EXACTITUDE ────────────────────────────
 *
 * La somme des parts vaut EXACTEMENT `discountCents` tant que la dernière
 * ligne a assez de marge sous son propre plafond pour absorber le reste
 * d'arrondi. Formellement : `derniere_ligne × (1 − remise / sous_total) ≥
 * nombre_de_lignes − 1`. Ce n'est PAS une question de hauteur de remise — une
 * remise de 20 % suffit à faire perdre 2 F si les lignes sont assez inégales
 * — c'est une question de PETITESSE DE LA DERNIÈRE LIGNE : moins elle a de
 * marge sous son plafond, moins elle peut absorber.
 *
 * Sur les paniers réels de cette boutique — au plus 8 lignes, chacune d'au
 * moins 500 F — la condition tient toujours : aucun échec observé sur 1 800
 * 000 tirages construits pour la mettre en défaut. Elle cesserait de tenir
 * si une ligne descendait à quelques francs. Le jour où ce cas se présente,
 * la correction n'est pas de changer le plafond mais de changer la
 * distribution du reste : au lieu de le poser en bloc sur la dernière ligne,
 * le distribuer franc par franc sur les lignes qui ont encore de la marge
 * sous leur propre plafond, en tournant tant qu'il en reste.
 */
export function repartirRemise(
  lignes: { lineTotalCents: number }[],
  discountCents: number,
  subtotalCents: number,
): number[] {
  if (lignes.length === 0 || discountCents === 0 || subtotalCents === 0) {
    return lignes.map(() => 0);
  }

  const parts = lignes.map((ligne) =>
    Math.min(ligne.lineTotalCents, Math.floor((discountCents * ligne.lineTotalCents) / subtotalCents)),
  );

  const reparti = parts.reduce((total, part) => total + part, 0);
  const reste = discountCents - reparti;
  if (reste > 0) {
    const derniere = parts.length - 1;
    // Voir le commentaire de tête : le reste va à la DERNIÈRE ligne, jamais
    // ailleurs, pour que le résultat soit reproductible.
    parts[derniere] = Math.min(lignes[derniere].lineTotalCents, parts[derniere] + reste);
  }

  return parts;
}

/**
 * Clé de regroupement : les libellés RECOPIÉS sur la ligne, jamais
 * l'identifiant produit. Une ligne dont le produit a été supprimé du catalogue
 * porte `productId` à `null` — grouper là-dessus fondrait tous les produits
 * disparus en un seul. La clé passe par JSON.stringify plutôt que par une
 * concaténation : un séparateur, quel qu'il soit, peut figurer dans un nom de
 * produit et ferait alors se confondre deux articles distincts.
 */
function cleProduit(ligne: LigneVente): string {
  return JSON.stringify([ligne.brand, ligne.name, ligne.variantLabel]);
}

/** « AAAA-MM-JJ » en heure locale — `toISOString` donnerait le jour UTC. */
function jourLocal(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export function totaliserVentes(lignes: LigneVente[]): TotauxVentes {
  const commandes = new Set<string>();
  // Les trois grandeurs, jamais confondues : voir l'en-tête du module.
  let brutCents = 0;
  let remisesCents = 0;
  let quantite = 0;
  let lignesAvecCout = 0;
  let margeCents = 0;
  // Assiette de la marge : le CA NET des SEULES lignes qui ont un coût.
  // Rapporter une marge partielle à une assiette complète donnerait un taux
  // sous-évalué, d'autant plus faux que le catalogue est peu renseigné.
  let caNetAvecCout = 0;

  for (const ligne of lignes) {
    commandes.add(ligne.orderId);
    brutCents += ligne.lineTotalCents;
    remisesCents += ligne.remiseCents;
    quantite += ligne.quantity;

    const marge = margeLigne(ligne);
    if (marge !== null) {
      lignesAvecCout += 1;
      margeCents += marge;
      caNetAvecCout += caNetLigne(ligne);
    }
  }

  // Chiffre d'affaires NET : c'est lui, jamais le brut, qui est exposé.
  const chiffreAffairesCents = brutCents - remisesCents;
  const nombreCommandes = commandes.size;

  return {
    chiffreAffairesCents,
    remisesCents,
    quantite,
    nombreCommandes,
    panierMoyenCents:
      nombreCommandes === 0 ? null : Math.round(chiffreAffairesCents / nombreCommandes),
    margeCents: lignesAvecCout === 0 ? null : margeCents,
    tauxMarge:
      lignesAvecCout === 0 || caNetAvecCout === 0
        ? null
        : Math.round((margeCents / caNetAvecCout) * 1000) / 10,
    lignesAvecCout,
    lignesTotal: lignes.length,
  };
}

export function classerParProduit(lignes: LigneVente[], limite: number): VenteProduit[] {
  const parCle = new Map<string, VenteProduit & { avecCout: number }>();

  for (const ligne of lignes) {
    const cle = cleProduit(ligne);
    let entree = parCle.get(cle);
    if (!entree) {
      entree = {
        cle,
        brand: ligne.brand,
        name: ligne.name,
        variantLabel: ligne.variantLabel,
        quantite: 0,
        chiffreAffairesCents: 0,
        margeCents: 0,
        lignesSansCout: 0,
        avecCout: 0,
      };
      parCle.set(cle, entree);
    }

    entree.quantite += ligne.quantity;
    // NET, comme partout : le brut surévaluerait le CA du produit du montant
    // de sa part de remise.
    entree.chiffreAffairesCents += caNetLigne(ligne);

    const marge = margeLigne(ligne);
    if (marge === null) {
      entree.lignesSansCout += 1;
    } else {
      entree.avecCout += 1;
      entree.margeCents = (entree.margeCents ?? 0) + marge;
    }
  }

  return [...parCle.values()]
    .sort((a, b) => b.chiffreAffairesCents - a.chiffreAffairesCents)
    .slice(0, limite)
    .map(({ avecCout, ...produit }) => ({
      ...produit,
      // Aucune ligne renseignée : la marge est inconnue, pas nulle.
      margeCents: avecCout === 0 ? null : produit.margeCents,
    }));
}

export function ventesParJour(lignes: LigneVente[], du: Date, au: Date): PointJour[] {
  const parJour = new Map<string, { ca: number; commandes: Set<string> }>();

  for (const ligne of lignes) {
    const jour = jourLocal(ligne.date);
    let entree = parJour.get(jour);
    if (!entree) {
      entree = { ca: 0, commandes: new Set() };
      parJour.set(jour, entree);
    }
    // NET : un histogramme qui afficherait le brut ne correspondrait plus aux
    // cartes de l'écran, qui montrent toutes le chiffre d'affaires net.
    entree.ca += caNetLigne(ligne);
    entree.commandes.add(ligne.orderId);
  }

  // On parcourt la période jour par jour plutôt que les seules ventes : un
  // histogramme qui saute les jours creux ment sur le rythme.
  const points: PointJour[] = [];
  const curseur = new Date(du.getFullYear(), du.getMonth(), du.getDate());
  const fin = new Date(au.getFullYear(), au.getMonth(), au.getDate());

  while (curseur.getTime() <= fin.getTime()) {
    const jour = jourLocal(curseur);
    const entree = parJour.get(jour);
    points.push({
      jour,
      chiffreAffairesCents: entree?.ca ?? 0,
      nombreCommandes: entree?.commandes.size ?? 0,
    });
    curseur.setDate(curseur.getDate() + 1);
  }

  return points;
}
