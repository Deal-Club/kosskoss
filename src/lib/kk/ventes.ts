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
 * (`lineTotalCents`). Si ces deux montants ne sont pas saisis sur la même
 * base, le taux qui en sort est approximatif. C'est une question qui relève
 * du comptable, pas de ce module — elle est notée ici pour qui lira ce calcul
 * plus tard.
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
  lineTotalCents: number;
  /** `null` = coût inconnu au moment de la vente. Jamais confondu avec 0. */
  unitCostCents: number | null;
}

export interface TotauxVentes {
  /**
   * Somme des lignes de produits, livraison exclue. Cette boutique ne
   * décompose pas ses prix en hors taxe et taxe : le montant est celui
   * réglé, tel quel.
   */
  chiffreAffairesCents: number;
  quantite: number;
  nombreCommandes: number;
  /** `null` sans commande : une moyenne sur zéro commande n'existe pas. */
  panierMoyenCents: number | null;
  /** `null` quand aucune ligne de la période n'a de coût. */
  margeCents: number | null;
  /** Points de pourcentage, une décimale, rapportés au CA des seules lignes
   *  qui ont un coût. */
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

/** Marge d'une ligne, ou `null` si son coût est inconnu. */
function margeLigne(ligne: LigneVente): number | null {
  if (ligne.unitCostCents === null) return null;
  return ligne.lineTotalCents - ligne.unitCostCents * ligne.quantity;
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
  let chiffreAffairesCents = 0;
  let quantite = 0;
  let lignesAvecCout = 0;
  let margeCents = 0;
  // Assiette de la marge : le CA des SEULES lignes qui ont un coût. Rapporter
  // une marge partielle au CA total donnerait un taux sous-évalué, d'autant
  // plus faux que le catalogue est peu renseigné.
  let caAvecCout = 0;

  for (const ligne of lignes) {
    commandes.add(ligne.orderId);
    chiffreAffairesCents += ligne.lineTotalCents;
    quantite += ligne.quantity;

    const marge = margeLigne(ligne);
    if (marge !== null) {
      lignesAvecCout += 1;
      margeCents += marge;
      caAvecCout += ligne.lineTotalCents;
    }
  }

  const nombreCommandes = commandes.size;

  return {
    chiffreAffairesCents,
    quantite,
    nombreCommandes,
    panierMoyenCents:
      nombreCommandes === 0 ? null : Math.round(chiffreAffairesCents / nombreCommandes),
    margeCents: lignesAvecCout === 0 ? null : margeCents,
    tauxMarge:
      lignesAvecCout === 0 || caAvecCout === 0
        ? null
        : Math.round((margeCents / caAvecCout) * 1000) / 10,
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
    entree.chiffreAffairesCents += ligne.lineTotalCents;

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
    entree.ca += ligne.lineTotalCents;
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
