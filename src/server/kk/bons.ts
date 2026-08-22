import { prisma } from "@/server/prisma";
import { numeroSuivant } from "@/lib/kk/numerotation";
import {
  statutApresReception,
  totauxBon,
  STATUT_BON_LABELS,
  type LigneBon,
  type StatutBon,
} from "@/lib/kk/approvisionnement";

// Réexporté pour les appelants côté serveur qui importent déjà ce module —
// la source reste `src/lib/kk/approvisionnement.ts`, un module pur qu'un
// composant client peut importer directement sans tirer Prisma.
export { STATUT_BON_LABELS };
import { DELAI_TRANSACTION_STOCK_MS, type StockReason } from "@/server/stock";

/**
 * Bons de commande fournisseur, et la réception — le cœur du lot.
 *
 * ── LE STATUT NE SE SAISIT JAMAIS ────────────────────────────────────────────
 *
 * `statutApresReception` (src/lib/kk/approvisionnement.ts) est la SEULE source
 * du statut d'un bon une fois envoyé. Ce module ne l'écrit qu'en sortie de ce
 * calcul, jamais depuis une valeur venue du client.
 *
 * ── POURQUOI LA RÉCEPTION NE RÉUTILISE PAS `adjustStock` ────────────────────
 *
 * `src/server/stock.ts` expose déjà `adjustStock`, mais elle ouvre SA PROPRE
 * transaction (`prisma.$transaction`, sur le client global). L'appeler depuis
 * l'intérieur de la transaction de `recevoirLignes` lancerait une DEUXIÈME
 * transaction, indépendante de la première : si une ligne plus loin dans la
 * boucle échoue et fait annuler la transaction de `recevoirLignes`, les
 * écritures déjà commises par les appels à `adjustStock` resteraient, elles —
 * exactement le défaut que « tout dans une seule transaction » interdit.
 * `recevoirLignes` réécrit donc elle-même, avec le client `tx` reçu du
 * `prisma.$transaction` englobant, les deux écritures qu'`adjustStock` aurait
 * faites (le stock du produit, le mouvement de stock), avec le même motif
 * `"wareneingang"` — le vocabulaire existant, pas un septième.
 */

export const PREFIXE_BON = "BC-";

/** Motif de mouvement de stock pour une réception — celui que connaît déjà `src/server/stock.ts`. */
const MOTIF_RECEPTION: StockReason = "wareneingang";

/** Nombre de reprises sur collision de numéro, comme pour les factures. */
const TENTATIVES = 5;

// ---- Lecture ----

export interface LigneBonRecord {
  id: string;
  productId: string | null;
  brand: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  /** Borné à zéro : une sur-livraison ne crée pas de restant négatif. */
  quantiteRestante: number;
  unitCostCents: number;
}

export interface BonRecord {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  status: StatutBon;
  note: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: LigneBonRecord[];
  /** Cumuls dérivés des lignes — voir `totauxBon`. */
  engageCents: number;
  recuCents: number;
  restantCents: number;
}

type BonRow = {
  id: string;
  reference: string;
  supplierId: string;
  status: string;
  note: string;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: { name: string };
  items: {
    id: string;
    productId: string | null;
    brand: string;
    name: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCostCents: number;
  }[];
};

const AVEC_RELATIONS = {
  supplier: { select: { name: true } },
  items: { orderBy: { id: "asc" as const } },
} as const;

function versLigneBon(item: BonRow["items"][number]): LigneBonRecord {
  return {
    id: item.id,
    productId: item.productId,
    brand: item.brand,
    name: item.name,
    quantityOrdered: item.quantityOrdered,
    quantityReceived: item.quantityReceived,
    quantiteRestante: Math.max(0, item.quantityOrdered - item.quantityReceived),
    unitCostCents: item.unitCostCents,
  };
}

function versLigneBonPure(item: BonRow["items"][number]): LigneBon {
  return {
    quantiteCommandee: item.quantityOrdered,
    quantiteRecue: item.quantityReceived,
    coutUnitaireCents: item.unitCostCents,
  };
}

function versBonRecord(row: BonRow): BonRecord {
  const totaux = totauxBon(row.items.map(versLigneBonPure));
  return {
    id: row.id,
    reference: row.reference,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    status: row.status as StatutBon,
    note: row.note,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(versLigneBon),
    engageCents: totaux.engageCents,
    recuCents: totaux.recuCents,
    restantCents: totaux.restantCents,
  };
}

export async function listBons(filter?: {
  status?: StatutBon;
  supplierId?: string;
}): Promise<BonRecord[]> {
  const rows = await prisma.purchaseOrder.findMany({
    where: {
      status: filter?.status,
      supplierId: filter?.supplierId,
    },
    include: AVEC_RELATIONS,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(versBonRecord);
}

export async function getBon(id: string): Promise<BonRecord | null> {
  const row = await prisma.purchaseOrder.findUnique({ where: { id }, include: AVEC_RELATIONS });
  return row ? versBonRecord(row) : null;
}

// ---- Création et lignes (tant que le bon est en brouillon) ----

/**
 * Crée un bon vide, en `brouillon`, sous le fournisseur donné.
 *
 * Le numéro vient de la même séquence annuelle que les factures
 * (`src/lib/kk/numerotation.ts`), avec le préfixe `BC-`. Comme pour
 * `emettreFacture` (src/server/kk/facture.ts), l'unicité réelle vient de la
 * contrainte en base, pas de la lecture du dernier numéro : deux créations
 * simultanées liraient le même « dernier numéro », d'où la reprise sur
 * collision plutôt qu'une garantie a priori.
 */
export async function creerBon(supplierId: string, note = ""): Promise<BonRecord> {
  const fournisseur = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true },
  });
  if (!fournisseur) throw new Error("Fournisseur introuvable.");

  const annee = new Date().getFullYear();

  for (let tentative = 0; tentative < TENTATIVES; tentative += 1) {
    const dernier = await prisma.purchaseOrder.findFirst({
      where: { reference: { startsWith: `${PREFIXE_BON}${annee}-` } },
      orderBy: { reference: "desc" },
      select: { reference: true },
    });

    try {
      const cree = await prisma.purchaseOrder.create({
        data: {
          reference: numeroSuivant(PREFIXE_BON, dernier?.reference ?? null, annee),
          supplierId,
          note: note.trim(),
        },
        include: AVEC_RELATIONS,
      });
      return versBonRecord(cree);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || tentative === TENTATIVES - 1) throw error;
      // Collision sur `reference` : un autre bon vient de prendre ce numéro,
      // on relit et on réessaie avec le suivant.
    }
  }

  throw new Error("Impossible d'allouer un numéro de bon après plusieurs tentatives.");
}

async function chargerBonModifiable(bonId: string): Promise<BonRow> {
  const bon = await prisma.purchaseOrder.findUnique({ where: { id: bonId }, include: AVEC_RELATIONS });
  if (!bon) throw new Error("Bon de commande introuvable.");
  // Un bon transmis est un engagement : le réécrire après coup ferait
  // diverger ce qu'on a commandé de ce que le fournisseur a lu.
  if (bon.status !== "brouillon") {
    throw new Error(
      `Les lignes ne se modifient plus : ce bon n'est plus en brouillon (statut actuel : ${bon.status}).`,
    );
  }
  return bon;
}

export interface LigneBonInput {
  productId: string;
  quantityOrdered: number;
  unitCostCents: number;
}

/** Ajoute une ligne. Le libellé du produit est recopié, une fois pour toutes. */
export async function ajouterLigne(bonId: string, entree: LigneBonInput): Promise<BonRecord> {
  await chargerBonModifiable(bonId);

  if (!Number.isInteger(entree.quantityOrdered) || entree.quantityOrdered <= 0) {
    throw new Error("La quantité commandée doit être un entier strictement positif.");
  }
  if (!Number.isInteger(entree.unitCostCents) || entree.unitCostCents < 0) {
    throw new Error("Le coût unitaire doit être un entier positif ou nul.");
  }

  const produit = await prisma.product.findUnique({
    where: { id: entree.productId },
    select: { brand: true, name: true },
  });
  if (!produit) throw new Error("Produit introuvable.");

  await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: bonId,
      productId: entree.productId,
      brand: produit.brand,
      name: produit.name,
      quantityOrdered: entree.quantityOrdered,
      unitCostCents: entree.unitCostCents,
    },
  });

  return (await getBon(bonId)) as BonRecord;
}

export async function retirerLigne(bonId: string, ligneId: string): Promise<BonRecord> {
  const bon = await chargerBonModifiable(bonId);

  const ligne = bon.items.find((item) => item.id === ligneId);
  if (!ligne) throw new Error("Ligne introuvable sur ce bon.");

  await prisma.purchaseOrderItem.delete({ where: { id: ligneId } });

  return (await getBon(bonId)) as BonRecord;
}

// ---- Cycle de vie ----

/** Transmet le bon au fournisseur : pose `sentAt`, passe en `envoye`, verrouille les lignes. */
export async function envoyerBon(bonId: string): Promise<BonRecord> {
  const bon = await prisma.purchaseOrder.findUnique({ where: { id: bonId }, include: AVEC_RELATIONS });
  if (!bon) throw new Error("Bon de commande introuvable.");
  if (bon.status !== "brouillon") {
    throw new Error(`Seul un bon en brouillon peut être envoyé (statut actuel : ${bon.status}).`);
  }
  if (bon.items.length === 0) {
    throw new Error("Ce bon n'a aucune ligne : rien à envoyer.");
  }

  const envoye = await prisma.purchaseOrder.update({
    where: { id: bonId },
    data: { status: "envoye", sentAt: new Date() },
    include: AVEC_RELATIONS,
  });
  return versBonRecord(envoye);
}

/** Abandonne le bon. Ce qui avait déjà été reçu reste reçu. */
export async function annulerBon(bonId: string): Promise<BonRecord> {
  const bon = await prisma.purchaseOrder.findUnique({ where: { id: bonId }, select: { status: true } });
  if (!bon) throw new Error("Bon de commande introuvable.");
  if (bon.status === "annule") {
    throw new Error("Ce bon est déjà annulé.");
  }
  // Un bon entièrement reçu est un fait accompli : l'annuler afficherait
  // « Annulé » sur des lignes déjà soldées, ce qui ferait croire que la
  // marchandise reçue ne compte plus.
  if (bon.status === "recu") {
    throw new Error("Ce bon est déjà entièrement reçu : il ne peut plus être annulé.");
  }

  const annule = await prisma.purchaseOrder.update({
    where: { id: bonId },
    data: { status: "annule" },
    include: AVEC_RELATIONS,
  });
  return versBonRecord(annule);
}

// ---- La réception — le cœur du lot ----

export interface ReceptionLigneInput {
  ligneId: string;
  quantite: number;
}

export interface ReceptionOptions {
  /**
   * Coche par défaut à l'écran : le coût du produit devient le coût payé sur
   * cette réception. Décochée pour un achat exceptionnel, qui ne doit pas
   * s'imposer comme référence.
   */
  majCoutProduit: boolean;
  note?: string;
  /** Identifiant ou nom de l'opérateur, reporté sur le mouvement de stock. */
  par?: string;
}

export interface ReceptionLigneResultat {
  ligneId: string;
  brand: string;
  name: string;
  /** Quantité reçue lors de CETTE réception (pas le cumul). */
  quantiteRecue: number;
  /** Cumul après cette réception. */
  quantiteRecueTotale: number;
  stockTouche: boolean;
  coutMisAJour: boolean;
  /**
   * Valeur effectivement écrite sur `product.costCents` quand `coutMisAJour`
   * est vrai. Un coût à zéro est une valeur licite (échantillon, dotation
   * fournisseur) — voir `coutZeroAVerifier` — pas une absence de coût.
   */
  coutEcritCents?: number;
  /**
   * Vrai quand `coutEcritCents` vaut 0 : sans ce signal, un zéro écrase
   * silencieusement le coût du produit et `src/lib/kk/marge.ts` l'affiche
   * alors comme une marge de 100 % sur tout le tableau de bord des ventes.
   */
  coutZeroAVerifier?: boolean;
  /** Renseigné quand la ligne n'a pas pu toucher le stock ou le coût. */
  message?: string;
}

export interface ResultatReception {
  bonId: string;
  reference: string;
  statut: StatutBon;
  lignes: ReceptionLigneResultat[];
}

/**
 * Reçoit une ou plusieurs lignes d'un bon, dans UNE SEULE transaction Prisma.
 *
 * Pour chaque ligne reçue : la quantité reçue de la ligne avance, un mouvement
 * de stock `"wareneingang"` est créé, le stock du produit augmente, et — si
 * `majCoutProduit` — le coût d'achat du produit devient le coût unitaire de la
 * ligne. Puis le statut du bon est recalculé par `statutApresReception`, à
 * partir de TOUTES ses lignes (pas seulement celles reçues cette fois).
 *
 * Six règles, qui ne se devinent pas :
 *
 * 1. Une quantité reçue nulle ou négative est refusée : une réception
 *    négative réécrirait l'histoire. Une correction passe par un ajustement
 *    de stock tracé (`src/server/stock.ts`), pas par ici.
 * 2. Une ligne sans produit rattaché (`productId` nul — jamais rattaché, ou
 *    produit supprimé depuis : `onDelete: SetNull`) est reçue au sens du bon
 *    — sa quantité reçue avance — mais ne touche ni le stock ni le coût,
 *    faute de produit à créditer. Le résultat le signale explicitement : le
 *    taire ferait croire à l'administrateur que son stock est à jour.
 * 3. La sur-livraison est acceptée sans plafond : le fournisseur livre ce
 *    qu'il livre, et refuser ne ferait pas rentrer la marchandise.
 * 4. Recevoir sur un bon `brouillon` (rien n'a encore été transmis) ou
 *    `annule` (la décision est prise) est refusé, avec un message qui dit
 *    lequel des deux bloque.
 * 5. Si une seule écriture échoue, AUCUNE des trois (quantité de la ligne,
 *    stock + coût du produit — un seul `update`, mouvement de stock) ne doit
 *    rester : tout passe par le `tx` de la transaction englobante, jamais par
 *    le client `prisma` global.
 * 6. Un même `ligneId` reçu plusieurs fois dans UN SEUL appel est refusé
 *    avant même d'ouvrir la transaction : ce n'est pas un doublon à absorber
 *    silencieusement, mais une saisie incohérente — l'écran n'envoie jamais un
 *    tel appel, mais la route est une surface publique. Et pour que même un
 *    doublon qui passerait outre ce refus ne fausse pas les chiffres, la
 *    quantité reçue et le stock s'écrivent tous deux en `{ increment }`,
 *    jamais en valeur absolue recalculée à partir d'un objet chargé avant la
 *    boucle : deux écritures sur la même ligne s'additionnent alors
 *    correctement au lieu de s'écraser l'une l'autre.
 * 7. Les lignes se VERROUILLENT (via l'`update` du produit) dans l'ordre
 *    croissant de `productId`, jamais dans l'ordre où l'appelant les a
 *    envoyées. Sans cet ordre total, deux réceptions concurrentes portant sur
 *    les deux mêmes produits, dans des ordres opposés, peuvent s'attendre
 *    mutuellement — le seul inter-blocage possible de cette fonction. Trier
 *    avant d'écrire ne change ni les produits crédités ni les quantités,
 *    seul l'ordre des écritures change ; le résultat rendu à l'appelant, lui,
 *    respecte toujours l'ordre de SA requête.
 */
export async function recevoirLignes(
  bonId: string,
  receptions: ReceptionLigneInput[],
  options: ReceptionOptions,
): Promise<ResultatReception> {
  // Règle 1 — vérifiée avant d'ouvrir la transaction : une entrée invalide ne
  // doit même pas déclencher une écriture qu'il faudrait ensuite annuler.
  for (const reception of receptions) {
    if (!Number.isInteger(reception.quantite) || reception.quantite <= 0) {
      throw new Error(
        `Quantité reçue invalide pour la ligne ${reception.ligneId} : elle doit être un entier strictement positif.`,
      );
    }
  }
  if (receptions.length === 0) {
    throw new Error("Aucune ligne à recevoir.");
  }

  // Règle 6 — également vérifiée avant d'ouvrir la transaction : un `ligneId`
  // répété dans le même appel est une saisie incohérente, pas un cas à
  // absorber silencieusement (voir l'en-tête du fichier).
  const ligneIdsVus = new Set<string>();
  const ligneIdsEnDouble = new Set<string>();
  for (const reception of receptions) {
    if (ligneIdsVus.has(reception.ligneId)) {
      ligneIdsEnDouble.add(reception.ligneId);
    }
    ligneIdsVus.add(reception.ligneId);
  }
  if (ligneIdsEnDouble.size > 0) {
    throw new Error(
      `Ligne(s) présente(s) plusieurs fois dans le même appel de réception : ${[...ligneIdsEnDouble].join(", ")}. Chaque ligne ne doit apparaître qu'une seule fois.`,
    );
  }

  // Délai de transaction explicite : Prisma en garde 5 s par défaut, ce que
  // dépasse un gros bon. La boucle fait jusqu'à 4 requêtes par ligne
  // (mise à jour de la ligne, lecture du produit, mise à jour du produit,
  // mouvement de stock), plus deux hors boucle (chargement du bon, relecture
  // des lignes pour le statut). Sur une base distante mesurée à ~220 ms
  // l'aller-retour : (4 × 220 ms) × 15 lignes + 2 × 220 ms ≈ 13,6 s pour un
  // bon de quinze lignes. 30 s laisse une marge confortable jusqu'à une
  // trentaine de lignes sans risquer un refus incompréhensible sur un gros bon.
  //
  // Repris de `src/server/stock.ts` (`DELAI_TRANSACTION_STOCK_MS`), pas
  // redéfini à côté : `adjustStock`/`setStock` peuvent attendre le verrou
  // qu'une réception retient sur un produit, et leur donner un délai plus
  // court ferait échouer CE client-là avant que la réception ne cède la
  // main — un échec qui coûte plus cher (un panier perdu) que celui,
  // relançable, d'une réception qui expire.
  const DELAI_TRANSACTION_MS = DELAI_TRANSACTION_STOCK_MS;

  return prisma.$transaction(async (tx) => {
    const bon = await tx.purchaseOrder.findUnique({ where: { id: bonId }, include: { items: true } });
    if (!bon) throw new Error("Bon de commande introuvable.");

    // Règle 4 — le message dit lequel des deux statuts bloque.
    if (bon.status === "brouillon" || bon.status === "annule") {
      throw new Error(
        bon.status === "brouillon"
          ? "Réception impossible : ce bon est encore en brouillon, il n'a pas été envoyé au fournisseur."
          : "Réception impossible : ce bon est annulé.",
      );
    }

    // Règle 7 — traite les lignes dans l'ordre croissant de `productId`,
    // jamais dans l'ordre reçu de l'appelant : un ordre total sur les
    // verrous supprime le seul inter-blocage possible ici (deux réceptions
    // concurrentes sur les deux mêmes produits, dans des ordres opposés,
    // s'attendraient sinon mutuellement). Une ligne sans produit rattaché
    // (`productId` nul) ne verrouille rien : elle est traitée en premier,
    // son ordre relatif aux autres n'a donc aucune conséquence.
    const receptionsParVerrou = [...receptions].sort((a, b) => {
      const produitA = bon.items.find((item) => item.id === a.ligneId)?.productId ?? "";
      const produitB = bon.items.find((item) => item.id === b.ligneId)?.productId ?? "";
      if (produitA !== produitB) return produitA < produitB ? -1 : 1;
      // À égalité de produit (ou deux lignes sans produit), l'ordre entre
      // elles est arbitraire mais doit être STABLE d'un appel à l'autre :
      // trancher sur `ligneId` plutôt que de laisser `sort` réordonner au
      // hasard entre deux exécutions.
      return a.ligneId < b.ligneId ? -1 : a.ligneId > b.ligneId ? 1 : 0;
    });

    // Les écritures suivent l'ordre de verrouillage ci-dessus, mais le
    // résultat rendu à l'appelant respecte l'ordre de SA requête — on
    // réordonne à la sortie de la boucle, pas pendant.
    const resultatsParLigneId = new Map<string, ReceptionLigneResultat>();

    for (const reception of receptionsParVerrou) {
      const ligne = bon.items.find((item) => item.id === reception.ligneId);
      if (!ligne) throw new Error(`Ligne ${reception.ligneId} introuvable sur ce bon.`);

      // Règle 3 — aucun plafond : la sur-livraison est acceptée.
      // Écrit en `{ increment }`, pas en valeur absolue recalculée depuis
      // `bon.items` chargé avant la boucle (règle 6) : même si un doublon de
      // `ligneId` passait outre le refus ci-dessus, les deux écritures
      // s'additionneraient au lieu de s'écraser. Le cumul se lit dans le
      // retour de l'`update`, jamais recalculé côté application.
      const ligneMiseAJour = await tx.purchaseOrderItem.update({
        where: { id: ligne.id },
        data: { quantityReceived: { increment: reception.quantite } },
      });
      const quantiteRecueTotale = ligneMiseAJour.quantityReceived;

      let stockTouche = false;
      let coutMisAJour = false;
      let coutEcritCents: number | undefined;
      let coutZeroAVerifier: boolean | undefined;
      let message: string | undefined;

      // Règle 2 — pas de produit rattaché : reçue au sens du bon, stock et
      // coût non touchés, et le résultat le dit.
      if (!ligne.productId) {
        message = "Aucun produit rattaché à cette ligne : le stock et le coût n'ont pas été modifiés.";
      } else {
        const produit = await tx.product.findUnique({
          where: { id: ligne.productId },
          select: { id: true },
        });

        if (!produit) {
          // Défensif : `onDelete: SetNull` doit avoir déjà mis `productId` à
          // `null` si le produit a disparu, ce cas ne devrait donc jamais se
          // présenter. On le traite comme la ligne sans produit ci-dessus,
          // plutôt que de laisser planter toute la réception pour une
          // incohérence qui n'est pas celle de l'opérateur.
          message = "Produit introuvable : le stock et le coût n'ont pas été modifiés.";
        } else {
          // Stock et coût en un seul `update` (au lieu de deux successifs) :
          // le stock en `{ increment }`, jamais en valeur absolue relue avant
          // la boucle — voir `src/server/stock.ts`, l'invariant que ce module
          // partage désormais avec `adjustStock`/`setStock`. Deux réceptions
          // simultanées du même produit s'additionnent alors correctement au
          // lieu de s'écraser.
          const produitMisAJour = await tx.product.update({
            where: { id: produit.id },
            data: {
              stock: { increment: reception.quantite },
              ...(options.majCoutProduit ? { costCents: ligne.unitCostCents } : {}),
            },
            select: { costCents: true },
          });

          // Réécriture directe des écritures qu'aurait faites `adjustStock`
          // (src/server/stock.ts) — voir le commentaire d'en-tête du fichier :
          // `adjustStock` ouvre sa propre transaction, elle ne peut pas être
          // appelée depuis celle-ci sans briser l'atomicité.
          await tx.stockMovement.create({
            data: {
              productId: produit.id,
              delta: reception.quantite,
              reason: MOTIF_RECEPTION,
              note: options.note?.trim()
                ? `Réception ${bon.reference} — ${options.note.trim()}`
                : `Réception ${bon.reference}`,
              createdBy: options.par ?? null,
            },
          });
          stockTouche = true;

          if (options.majCoutProduit) {
            coutMisAJour = true;
            // La valeur EFFECTIVEMENT écrite, lue dans le retour de l'update —
            // pas `ligne.unitCostCents` recopié en aveugle. Un coût à 0 est une
            // saisie licite (échantillon, dotation fournisseur) qu'on ne
            // refuse pas, mais qui doit se voir : `src/lib/kk/marge.ts`
            // affiche un coût de 0 comme une marge de 100 %, jamais comme une
            // marge inconnue.
            coutEcritCents = produitMisAJour.costCents ?? 0;
            coutZeroAVerifier = coutEcritCents === 0;
          }
        }
      }

      resultatsParLigneId.set(ligne.id, {
        ligneId: ligne.id,
        brand: ligne.brand,
        name: ligne.name,
        quantiteRecue: reception.quantite,
        quantiteRecueTotale,
        stockTouche,
        coutMisAJour,
        coutEcritCents,
        coutZeroAVerifier,
        message,
      });
    }

    // Reconstruit dans l'ordre de la requête d'origine — voir règle 7.
    const lignesResultat = receptions.map(
      (reception) => resultatsParLigneId.get(reception.ligneId) as ReceptionLigneResultat,
    );

    // Le statut se recalcule sur TOUTES les lignes du bon, y compris celles
    // que cette réception n'a pas touchées.
    const lignesActuelles = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: bonId } });
    const statutSuivant = statutApresReception(bon.status as StatutBon, lignesActuelles.map(versLigneBonPure));

    if (statutSuivant !== bon.status) {
      await tx.purchaseOrder.update({ where: { id: bonId }, data: { status: statutSuivant } });
    }

    return { bonId, reference: bon.reference, statut: statutSuivant, lignes: lignesResultat };
  }, { timeout: DELAI_TRANSACTION_MS });
}

/**
 * Quantités restant à recevoir, par produit, sur les bons `envoye` et
 * `recu_partiel` — la colonne « en commande » de l'écran du stock. Elle
 * répond à la seule question qu'on se pose devant une rupture : est-ce que ça
 * arrive ?
 */
export async function quantitesEnCommandeParProduit(): Promise<Map<string, number>> {
  const lignes = await prisma.purchaseOrderItem.findMany({
    where: {
      productId: { not: null },
      purchaseOrder: { status: { in: ["envoye", "recu_partiel"] } },
    },
    select: { productId: true, quantityOrdered: true, quantityReceived: true },
  });

  const parProduit = new Map<string, number>();
  for (const ligne of lignes) {
    if (!ligne.productId) continue;
    const restant = Math.max(0, ligne.quantityOrdered - ligne.quantityReceived);
    if (restant === 0) continue;
    parProduit.set(ligne.productId, (parProduit.get(ligne.productId) ?? 0) + restant);
  }
  return parProduit;
}
