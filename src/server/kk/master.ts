import path from "node:path";
import { readSheet, type CellValue, type Row } from "read-excel-file/node";
import { estNiveau, type NiveauRoutine } from "@/lib/kk/routines-niveau";
import { isValidGtin } from "@/lib/gtin";
import { slugify } from "@/lib/slugify";
import { prisma } from "@/server/prisma";

/**
 * Lecteur du master client (KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx).
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 *
 * Le classeur porte 71 fiches produit, 14 routines et leurs gestes (colonne
 * PRODUITS_ROUTINES) : le master du client, préparé à la main dans un
 * tableur. Ce module en fait la lecture SEULE — la validation des lignes, sans
 * toucher à la base. L'écriture (rapprochement par SKU/code, mise à jour,
 * création de routine, remplacement des gestes) vit dans les fonctions
 * `importer*` plus bas, ajoutées lot après lot sur ce même fichier.
 *
 * ── DÉPENDANCE AJOUTÉE ───────────────────────────────────────────────────────
 *
 * Aucune bibliothèque de lecture de tableur n'était présente dans le dépôt.
 * Choix : `read-excel-file` — pure JS (aucune dépendance native à compiler),
 * maintenue, et nettement plus légère que l'alternative `exceljs` (~2,5 Mo
 * contre ~22 Mo de dépendances). `xlsx` (SheetJS) a été écarté : la version
 * publiée sur npm traîne des CVE non corrigées depuis plusieurs années.
 *
 * ── LE CLASSEUR EST UNE SAISIE HUMAINE ──────────────────────────────────────
 *
 * Il portera des lignes vides (séparateurs visuels dans le tableur) et des
 * cellules mal typées (un prix saisi en texte, une étape non numérique). Une
 * ligne invalide est ÉCARTÉE et NOMMÉE dans le compte rendu — jamais devinée,
 * jamais silencieusement ignorée.
 */

// ---- Feuilles et colonnes ---------------------------------------------------

const FEUILLE_FICHES = "FICHES_PRODUITS";
const FEUILLE_ROUTINES = "ROUTINES";
const FEUILLE_LIAISONS = "PRODUITS_ROUTINES";

/** Chemin par défaut du master, tel que livré par le client. */
export const CHEMIN_MASTER_PAR_DEFAUT = path.join(
  process.cwd(),
  "assets",
  "corrections",
  "KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx",
);

// ---- Types ------------------------------------------------------------------

export interface LigneIgnoree {
  /** Numéro de ligne dans le classeur, en-tête compris (donc 1-based, ligne 1 = en-têtes). */
  ligne: number;
  raison: string;
}

/** Une fiche produit du master, colonnes validées et prêtes à l'emploi. */
export interface FicheMaster {
  ligne: number;
  sku: string;
  /** EAN_UPC — candidat pour `Product.gtin`, encore non validé (voir `isValidGtin`). */
  ean: string;
  marque: string;
  nom: string;
  /** FCFA entier — le FCFA n'a pas de sous-unité, jamais de division par 100. */
  prixFcfa: number;
  /** Libellé de catégorie du master (« Nettoyant », « Toner »…) — sert uniquement
   *  au signalement d'écart, jamais à déplacer un produit (voir `CATEGORIE_MASTER_VERS_SLUG`). */
  categorie: string;
  /** Solution_Courte → `Product.shortDescription`. */
  shortDescription: string;
  /** Benefice_1..3, non vides uniquement → `Product.bullets` (JSON). */
  benefices: string[];
  problemeAccroche: string;
  idealPour: string;
  usageMatin: string;
  usageSoir: string;
  frequence: string;
  conseilKossKoss: string;
  precautions: string;
  actifsCles: string;
  /** Reprises telles quelles : ce sont des indications pour le commerçant, pas du contenu client. */
  statutPublication: string;
  donneesAConfirmer: string;
  /** Besoin_Principal — jusqu'ici purement descriptive. Sert désormais à poser un
   *  tag de préoccupation (voir `BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION`), quand
   *  la valeur en désigne une. */
  besoinPrincipal: string;
}

/** Une routine du master (onglet ROUTINES), colonnes validées. */
export interface RoutineMaster {
  ligne: number;
  /** Routine_ID — clé de rapprochement, jamais le nom ni le slug. */
  code: string;
  niveau: NiveauRoutine;
  besoin: string;
  nom: string;
  /** Promesse → `Routine.claim`. */
  promesse: string;
  profilCible: string;
  usageMatin: string;
  usageSoir: string;
  badge: string;
  noteKossKoss: string;
}

/** Une liaison routine ↔ produit (onglet PRODUITS_ROUTINES), un geste. */
export interface LiaisonMaster {
  ligne: number;
  routineCode: string;
  /** Etape — entier positif, sert d'ordre d'affichage du geste. */
  etape: number;
  role: string;
  sku: string;
  moment: string;
}

export interface LectureMaster {
  fiches: FicheMaster[];
  fichesIgnorees: LigneIgnoree[];
  routines: RoutineMaster[];
  routinesIgnorees: LigneIgnoree[];
  liaisons: LiaisonMaster[];
  liaisonsIgnorees: LigneIgnoree[];
}

// ---- Aides pures (testées sans fichier ni base) ------------------------------

/** Index nom de colonne → position, à partir de la ligne d'en-têtes. */
export function indexerEntetes(entetes: Row): Record<string, number> {
  const index: Record<string, number> = {};
  entetes.forEach((valeur, i) => {
    if (typeof valeur === "string" && valeur.trim()) index[valeur.trim()] = i;
  });
  return index;
}

/** Valeur d'une colonne nommée sur une ligne — `undefined` si la colonne est absente. */
function cellule(index: Record<string, number>, ligne: Row, colonne: string): CellValue | null | undefined {
  const i = index[colonne];
  return i === undefined ? undefined : ligne[i];
}

/** Texte nettoyé : `null`/`undefined` deviennent une chaîne vide, jamais "null" ou "undefined". */
function texte(valeur: CellValue | null | undefined): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "string") return valeur.trim();
  if (valeur instanceof Date) return valeur.toISOString();
  return String(valeur).trim();
}

/**
 * Entier positif tolérant à la saisie tableur : un nombre déjà typé, ou un
 * texte du type « 18 000 FCFA » — espaces et lettres retirés avant conversion.
 * Rend `null` pour tout ce qui ne se réduit pas à un entier strictement positif.
 */
function versEntierPositif(valeur: CellValue | null | undefined): number | null {
  if (typeof valeur === "number") {
    return Number.isInteger(valeur) && valeur > 0 ? valeur : null;
  }
  if (typeof valeur === "string") {
    const nettoye = valeur.replace(/[^\d.-]/g, "");
    if (!nettoye) return null;
    const n = Number(nettoye);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/** Vrai si toutes les cellules de la ligne sont vides — un séparateur visuel du tableur. */
function ligneVide(ligne: Row): boolean {
  return ligne.every((c) => c === null || c === undefined || (typeof c === "string" && c.trim() === ""));
}

// ---- Analyse d'une ligne, par feuille ---------------------------------------

export function analyserLigneFiche(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { fiche: FicheMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const sku = texte(cellule(index, ligne, "SKU"));
  if (!sku) return { ignoree: { ligne: numero, raison: "SKU manquant" } };

  const prixFcfa = versEntierPositif(cellule(index, ligne, "Prix_FCFA"));
  if (prixFcfa === null) {
    return { ignoree: { ligne: numero, raison: `prix invalide pour le SKU ${sku}` } };
  }

  const benefices = [
    texte(cellule(index, ligne, "Benefice_1")),
    texte(cellule(index, ligne, "Benefice_2")),
    texte(cellule(index, ligne, "Benefice_3")),
  ].filter((b) => b !== "");

  return {
    fiche: {
      ligne: numero,
      sku,
      ean: texte(cellule(index, ligne, "EAN_UPC")),
      marque: texte(cellule(index, ligne, "Marque")),
      nom: texte(cellule(index, ligne, "Nom_Produit")),
      prixFcfa,
      categorie: texte(cellule(index, ligne, "Categorie")),
      shortDescription: texte(cellule(index, ligne, "Solution_Courte")),
      benefices,
      problemeAccroche: texte(cellule(index, ligne, "Probleme_Accroche")),
      idealPour: texte(cellule(index, ligne, "Ideal_Pour")),
      usageMatin: texte(cellule(index, ligne, "Usage_Matin")),
      usageSoir: texte(cellule(index, ligne, "Usage_Soir")),
      frequence: texte(cellule(index, ligne, "Frequence")),
      conseilKossKoss: texte(cellule(index, ligne, "Conseil_KossKoss")),
      precautions: texte(cellule(index, ligne, "Precautions")),
      actifsCles: texte(cellule(index, ligne, "Actifs_Cles")),
      statutPublication: texte(cellule(index, ligne, "Statut_Publication")),
      donneesAConfirmer: texte(cellule(index, ligne, "Donnees_A_Confirmer")),
      besoinPrincipal: texte(cellule(index, ligne, "Besoin_Principal")),
    },
  };
}

export function analyserLigneRoutine(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { routine: RoutineMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const code = texte(cellule(index, ligne, "Routine_ID"));
  if (!code) return { ignoree: { ligne: numero, raison: "code de routine manquant" } };

  const niveauBrut = texte(cellule(index, ligne, "Niveau"));
  const niveau = niveauBrut.toLowerCase();
  if (!estNiveau(niveau)) {
    return {
      ignoree: {
        ligne: numero,
        raison: `niveau « ${niveauBrut || "(vide)"} » non reconnu pour la routine ${code}`,
      },
    };
  }

  return {
    routine: {
      ligne: numero,
      code,
      niveau,
      besoin: texte(cellule(index, ligne, "Besoin")),
      nom: texte(cellule(index, ligne, "Nom_Routine")),
      promesse: texte(cellule(index, ligne, "Promesse")),
      profilCible: texte(cellule(index, ligne, "Profil_Cible")),
      usageMatin: texte(cellule(index, ligne, "Usage_Matin")),
      usageSoir: texte(cellule(index, ligne, "Usage_Soir")),
      badge: texte(cellule(index, ligne, "Badge")),
      noteKossKoss: texte(cellule(index, ligne, "Note_KossKoss")),
    },
  };
}

export function analyserLigneLiaison(
  index: Record<string, number>,
  ligne: Row,
  numero: number,
): { liaison: LiaisonMaster } | { ignoree: LigneIgnoree } {
  if (ligneVide(ligne)) return { ignoree: { ligne: numero, raison: "ligne vide" } };

  const routineCode = texte(cellule(index, ligne, "Routine_ID"));
  if (!routineCode) return { ignoree: { ligne: numero, raison: "code de routine manquant" } };

  const sku = texte(cellule(index, ligne, "SKU"));
  if (!sku) {
    return { ignoree: { ligne: numero, raison: `SKU manquant pour la routine ${routineCode}` } };
  }

  const etape = versEntierPositif(cellule(index, ligne, "Etape"));
  if (etape === null) {
    return {
      ignoree: { ligne: numero, raison: `étape invalide pour ${routineCode} / ${sku}` },
    };
  }

  return {
    liaison: {
      ligne: numero,
      routineCode,
      etape,
      role: texte(cellule(index, ligne, "Role")),
      sku,
      moment: texte(cellule(index, ligne, "Moment")),
    },
  };
}

// ---- Lecture du classeur (impure : accès disque) -----------------------------

function analyserFeuille<T extends { ligne: number }>(
  rows: Row[],
  analyser: (index: Record<string, number>, ligne: Row, numero: number) => { valeur: T } | { ignoree: LigneIgnoree },
): { valeurs: T[]; ignorees: LigneIgnoree[] } {
  const index = indexerEntetes(rows[0] ?? []);
  const valeurs: T[] = [];
  const ignorees: LigneIgnoree[] = [];
  for (let i = 1; i < rows.length; i++) {
    // Ligne 1 = en-têtes ; la ligne de donnée d'indice tableau `i` est la
    // ligne `i + 1` du classeur, tel qu'un utilisateur l'y lirait.
    const resultat = analyser(index, rows[i], i + 1);
    if ("ignoree" in resultat) ignorees.push(resultat.ignoree);
    else valeurs.push(resultat.valeur);
  }
  return { valeurs, ignorees };
}

/** Lit et valide les trois onglets du master. N'écrit rien en base. */
export async function lireMaster(chemin: string = CHEMIN_MASTER_PAR_DEFAUT): Promise<LectureMaster> {
  const [ficheRows, routineRows, liaisonRows] = await Promise.all([
    readSheet(chemin, FEUILLE_FICHES),
    readSheet(chemin, FEUILLE_ROUTINES),
    readSheet(chemin, FEUILLE_LIAISONS),
  ]);

  const fiches = analyserFeuille(ficheRows, (index, ligne, numero) => {
    const resultat = analyserLigneFiche(index, ligne, numero);
    return "fiche" in resultat ? { valeur: resultat.fiche } : resultat;
  });
  const routines = analyserFeuille(routineRows, (index, ligne, numero) => {
    const resultat = analyserLigneRoutine(index, ligne, numero);
    return "routine" in resultat ? { valeur: resultat.routine } : resultat;
  });
  const liaisons = analyserFeuille(liaisonRows, (index, ligne, numero) => {
    const resultat = analyserLigneLiaison(index, ligne, numero);
    return "liaison" in resultat ? { valeur: resultat.liaison } : resultat;
  });

  return {
    fiches: fiches.valeurs,
    fichesIgnorees: fiches.ignorees,
    routines: routines.valeurs,
    routinesIgnorees: routines.ignorees,
    liaisons: liaisons.valeurs,
    liaisonsIgnorees: liaisons.ignorees,
  };
}

// ---- Import des fiches produits (tâche 2) ------------------------------------

/**
 * Le master vérifie déjà, produit par produit, que sa colonne `Categorie`
 * correspond à la catégorie du site (Nettoyant 16, Toner 6, Traitement 20,
 * Hydratant 15, Protection 3, Corps 8, Hygiène 3 = 71). Cette table est donc
 * un CONTRÔLE, jamais une réaffectation : déplacer un produit de rayon est une
 * décision de merchandising, pas une correction que cet import doit prendre à
 * la place du commerçant — vider un rayon en silence serait pire que signaler
 * un écart qu'un humain tranche.
 */
export const CATEGORIE_MASTER_VERS_SLUG: Record<string, string> = {
  Nettoyant: "nettoyants",
  Toner: "toniques",
  Traitement: "traitements",
  Hydratant: "hydratants",
  Protection: "solaires",
  Corps: "corps",
  "Hygiène": "hygiene",
};

/**
 * `Besoin_Principal` (onglet FICHES_PRODUITS) → tag de préoccupation
 * (`ProductTag`, famille « preoccupation »). Relevé sur les 71 fiches du
 * master, la colonne porte quinze valeurs distinctes ; seules celles qui
 * désignent une VRAIE préoccupation de peau figurent ci-dessous.
 *
 * Volontairement ABSENTES de cette table, donc jamais transformées en tag de
 * préoccupation :
 *  - « Homme essentiel » (9 fiches) — un segment client, pas une
 *    préoccupation ; les produits concernés portent déjà le tag `homme`
 *    (famille « categorie »), posé ailleurs (installation du quiz client) ;
 *  - « Démaquillage » (4), « Nettoyage » (3) — un geste de routine, pas une
 *    préoccupation ;
 *  - « Protection solaire » (2) — un geste, déjà couvert par le tag `solaire` ;
 *  - « Hydratation corps » (4), « Fermeté corps » (3), « Hygiène corps » (1),
 *    « Protection solaire corps » (1), « Taches corps » (1) — le rayon corps,
 *    pas le visage : même une valeur qui contient « Taches » désigne ici un
 *    soin corps, pas la préoccupation « taches » du visage.
 *
 * « Sensibilité / Barrière » (7 fiches) pointe vers `apaisant`, PAS vers un
 * nouveau tag `sensibilite` : ce tag existe déjà (27 produits actifs) et
 * porte déjà, à la date de cet ajout, les sept produits que le master range
 * sous « Sensibilité / Barrière » — un second tag pour la même idée créerait
 * deux vocabulaires là où un seul suffit.
 *
 * Une valeur de `Besoin_Principal` absente de cette table (ou vide) n'ajoute
 * simplement aucun tag — le champ reste purement descriptif pour elle, comme
 * avant cet import.
 */
export const BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION: Record<string, string> = {
  "Hydratation / Confort": "hydratation",
  "Boutons / Imperfections": "imperfections",
  "Taches / Teint": "taches",
  "Sensibilité / Barrière": "apaisant",
  "Glow / Éclat": "eclat",
  "Anti-Âge": "anti_age",
};

/**
 * Le tag de préoccupation à ajouter aux tags déjà portés par le produit,
 * d'après son `Besoin_Principal` — `null` si la valeur ne désigne aucune
 * préoccupation (voir `BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION`) ou si le tag
 * visé est déjà présent. Fonction pure : AJOUTE, ne retire jamais — les tags
 * déjà posés à la main peuvent porter une intention que le master ignore.
 */
export function tagPreoccupationAAjouter(
  besoinPrincipal: string,
  tagsActuels: string[],
): string | null {
  const tag = BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION[besoinPrincipal];
  if (!tag) return null;
  if (tagsActuels.includes(tag)) return null;
  return tag;
}

export interface PreoccupationAjoutee {
  sku: string;
  nom: string;
  /** Tag de préoccupation posé (voir `BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION`). */
  tag: string;
}

export interface PrixModifie {
  sku: string;
  nom: string;
  ancienFcfa: number;
  nouveauFcfa: number;
}

export interface GtinModifie {
  sku: string;
  ancien: string | null;
  nouveau: string;
}

export interface DivergenceCategorie {
  sku: string;
  nom: string;
  categorieMaster: string;
  categorieSite: string;
}

export interface FicheReperee {
  sku: string;
  nom: string;
}

export interface CompteRenduFiches {
  /** Fiches dont au moins un champ de contenu (les 8 du lot 7A + shortDescription + bullets) a changé. */
  misesAJour: FicheReperee[];
  /** Fiches rapprochées, mais dont rien n'a changé — preuve d'idempotence. */
  inchangees: FicheReperee[];
  /** Chaque prix modifié, avec l'ancienne et la nouvelle valeur — jamais en silence. */
  prixModifies: PrixModifie[];
  /** GTIN écrits, avec l'ancienne et la nouvelle valeur. */
  gtinModifies: GtinModifie[];
  /** EAN_UPC présent mais dont la clé de contrôle ne passe pas `isValidGtin` — non écrit. */
  gtinInvalides: { sku: string; ean: string }[];
  /** SKU du master introuvable en base — SIGNALÉ, jamais créé. */
  skusInconnus: { ligne: number; sku: string; nom: string }[];
  /** SKU du master rapproché à PLUS D'UN produit en base — ambigu, aucune écriture. */
  skusAmbigus: { sku: string; nombreDeProduits: number }[];
  /** Produit en base dont le SKU n'apparaît dans aucune ligne du master — SIGNALÉ, jamais supprimé. */
  produitsHorsMaster: FicheReperee[];
  /** Catégorie du master différente de la catégorie du site pour ce SKU — jamais corrigée automatiquement. */
  categoriesDivergentes: DivergenceCategorie[];
  /** Tags de préoccupation posés à partir de `Besoin_Principal` — chaque produit
   *  nouvellement tagué est nommé, avec le tag posé. Ne contient jamais un tag
   *  retiré : cette liste ne fait qu'ajouter (voir `tagPreoccupationAAjouter`). */
  preoccupationsAjoutees: PreoccupationAjoutee[];
  /** Lignes du master écartées à la lecture (voir `lireMaster`). */
  lignesIgnorees: LigneIgnoree[];
}

type ProduitActuel = Awaited<ReturnType<typeof chargerProduitsActuels>>[number];

function chargerProduitsActuels() {
  return prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      gtin: true,
      category: { select: { slug: true } },
      tags: true,
      shortDescription: true,
      bullets: true,
      problemeAccroche: true,
      idealPour: true,
      usageMatin: true,
      usageSoir: true,
      frequence: true,
      conseilKossKoss: true,
      precautions: true,
      actifsCles: true,
      statutPublication: true,
      donneesAConfirmer: true,
    },
  });
}

/**
 * Différence entre les huit champs de contenu du lot 7A + `shortDescription`
 * et `bullets`, et ce que porte la fiche du master. `costCents` n'apparaît
 * jamais ici — voir la remarque en tête de fichier : il vient des bons de
 * commande, jamais du master.
 */
export function champsContenuDifferents(actuel: ProduitActuel, fiche: FicheMaster): Record<string, string> {
  const paires: [string, string, string][] = [
    ["shortDescription", actuel.shortDescription, fiche.shortDescription],
    ["bullets", actuel.bullets, JSON.stringify(fiche.benefices)],
    ["problemeAccroche", actuel.problemeAccroche, fiche.problemeAccroche],
    ["idealPour", actuel.idealPour, fiche.idealPour],
    ["usageMatin", actuel.usageMatin, fiche.usageMatin],
    ["usageSoir", actuel.usageSoir, fiche.usageSoir],
    ["frequence", actuel.frequence, fiche.frequence],
    ["conseilKossKoss", actuel.conseilKossKoss, fiche.conseilKossKoss],
    ["precautions", actuel.precautions, fiche.precautions],
    ["actifsCles", actuel.actifsCles, fiche.actifsCles],
    ["statutPublication", actuel.statutPublication, fiche.statutPublication],
    ["donneesAConfirmer", actuel.donneesAConfirmer, fiche.donneesAConfirmer],
  ];
  const patch: Record<string, string> = {};
  for (const [champ, valeurActuelle, valeurAttendue] of paires) {
    if (valeurActuelle !== valeurAttendue) patch[champ] = valeurAttendue;
  }
  return patch;
}

/**
 * Rapproche les 71 fiches du master aux produits en base par SKU, met à jour
 * ce qui a changé, et NOMME chaque écriture — en particulier chaque prix
 * modifié, avec son ancienne et sa nouvelle valeur (règle 5 des contraintes
 * globales). N'écrit jamais un SKU inconnu, ne supprime jamais un produit
 * absent du master, et ne déplace jamais un produit de catégorie.
 */
export async function importerFichesMaster(lecture: LectureMaster): Promise<CompteRenduFiches> {
  const produits = await chargerProduitsActuels();

  const parSku = new Map<string, ProduitActuel[]>();
  for (const produit of produits) {
    const liste = parSku.get(produit.sku) ?? [];
    liste.push(produit);
    parSku.set(produit.sku, liste);
  }

  const compteRendu: CompteRenduFiches = {
    misesAJour: [],
    inchangees: [],
    prixModifies: [],
    gtinModifies: [],
    gtinInvalides: [],
    skusInconnus: [],
    skusAmbigus: [],
    produitsHorsMaster: [],
    categoriesDivergentes: [],
    preoccupationsAjoutees: [],
    lignesIgnorees: lecture.fichesIgnorees,
  };

  const skusDuMaster = new Set(lecture.fiches.map((f) => f.sku));
  const skusAmbigusDejaSignales = new Set<string>();

  for (const fiche of lecture.fiches) {
    const candidats = parSku.get(fiche.sku) ?? [];

    if (candidats.length === 0) {
      compteRendu.skusInconnus.push({ ligne: fiche.ligne, sku: fiche.sku, nom: fiche.nom });
      continue;
    }

    if (candidats.length > 1) {
      if (!skusAmbigusDejaSignales.has(fiche.sku)) {
        compteRendu.skusAmbigus.push({ sku: fiche.sku, nombreDeProduits: candidats.length });
        skusAmbigusDejaSignales.add(fiche.sku);
      }
      continue;
    }

    const actuel = candidats[0];
    const patch: Record<string, unknown> = champsContenuDifferents(actuel, fiche);
    const contenuChange = Object.keys(patch).length > 0;

    // Prix : jamais réécrit sans le dire — chaque changement est nommé avec
    // l'ancienne ET la nouvelle valeur.
    if (fiche.prixFcfa !== actuel.priceCents) {
      compteRendu.prixModifies.push({
        sku: fiche.sku,
        nom: actuel.name,
        ancienFcfa: actuel.priceCents,
        nouveauFcfa: fiche.prixFcfa,
      });
      patch.priceCents = fiche.prixFcfa;
    }

    // GTIN : un EAN_UPC vide ne détruit jamais une valeur déjà en base — le
    // master ne renseigne pas systématiquement cette colonne. Un EAN présent
    // mais dont la clé de contrôle échoue n'est jamais écrit non plus.
    const eanNettoye = fiche.ean.replace(/[\s-]/g, "");
    if (eanNettoye) {
      if (isValidGtin(eanNettoye)) {
        if (eanNettoye !== actuel.gtin) {
          compteRendu.gtinModifies.push({ sku: fiche.sku, ancien: actuel.gtin, nouveau: eanNettoye });
          patch.gtin = eanNettoye;
        }
      } else {
        compteRendu.gtinInvalides.push({ sku: fiche.sku, ean: fiche.ean });
      }
    }

    // Catégorie : signalement seul, jamais de réaffectation automatique — voir
    // le commentaire de `CATEGORIE_MASTER_VERS_SLUG`.
    const slugAttendu = CATEGORIE_MASTER_VERS_SLUG[fiche.categorie];
    if (!slugAttendu || slugAttendu !== actuel.category.slug) {
      compteRendu.categoriesDivergentes.push({
        sku: fiche.sku,
        nom: actuel.name,
        categorieMaster: fiche.categorie,
        categorieSite: actuel.category.slug,
      });
    }

    // Préoccupation issue de Besoin_Principal : AJOUTE un tag, n'en retire
    // jamais — voir `tagPreoccupationAAjouter` et le commentaire de
    // `BESOIN_PRINCIPAL_VERS_TAG_PREOCCUPATION`. Les tags posés à la main
    // restent tous en place, y compris ceux qu'aucun Besoin_Principal ne
    // couvre.
    let tagsActuels: string[];
    try {
      tagsActuels = JSON.parse(actuel.tags || "[]");
    } catch {
      tagsActuels = [];
    }
    const tagAAjouter = tagPreoccupationAAjouter(fiche.besoinPrincipal, tagsActuels);
    if (tagAAjouter) {
      patch.tags = JSON.stringify([...tagsActuels, tagAAjouter]);
      compteRendu.preoccupationsAjoutees.push({ sku: fiche.sku, nom: actuel.name, tag: tagAAjouter });
    }

    if (Object.keys(patch).length === 0) {
      compteRendu.inchangees.push({ sku: fiche.sku, nom: actuel.name });
      continue;
    }

    await prisma.product.update({ where: { id: actuel.id }, data: patch });
    if (contenuChange) {
      // Le contenu éditorial a changé : la fiche apparaît dans cette
      // section. Si seuls le prix et/ou le GTIN ont bougé, ils restent
      // nommés dans leurs listes dédiées (`prixModifies`, `gtinModifies`)
      // sans qu'il soit besoin de répéter le SKU ici — cette section ne
      // décrit que le contenu éditorial.
      compteRendu.misesAJour.push({ sku: fiche.sku, nom: actuel.name });
    }
  }

  for (const produit of produits) {
    if (!skusDuMaster.has(produit.sku)) {
      compteRendu.produitsHorsMaster.push({ sku: produit.sku, nom: produit.name });
    }
  }

  return compteRendu;
}

// ---- Import des routines et de leurs gestes (tâche 3) ------------------------

export interface RoutineReperee {
  code: string;
  nom: string;
}

export interface RoutineAnnulee {
  code: string;
  ligne: number;
  raison: string;
}

export interface GestesRemplaces {
  code: string;
  nom: string;
  /** Nombre de gestes avant remplacement (0 pour une routine nouvellement créée). */
  avant: number;
  apres: number;
}

export interface RoutineHorsMaster {
  slug: string;
  nom: string;
}

export interface CompteRenduRoutines {
  creees: RoutineReperee[];
  /** Routines rapprochées dont au moins un champ de contenu a changé. */
  misesAJour: RoutineReperee[];
  /** Routines rapprochées, contenu ET gestes identiques — preuve d'idempotence. */
  inchangees: RoutineReperee[];
  /** Le master fait foi sur la composition et l'ordre des gestes : ce bloc
   *  nomme chaque routine dont les gestes ont été remplacés, avec le nombre
   *  de gestes avant et après — à lire attentivement quand `apres < avant`,
   *  un geste a disparu. */
  gestesRemplaces: GestesRemplaces[];
  /** Une routine dont au moins un geste pointe vers un SKU introuvable, ambigu
   *  ou dupliqué : import annulé EN ENTIER pour cette routine, jamais amputé. */
  routinesAnnulees: RoutineAnnulee[];
  /** Les 5 routines historiques, sans code du master — jamais touchées, à
   *  trancher par le client. */
  routinesHorsMaster: RoutineHorsMaster[];
  /** Un code déjà en base ne figure plus dans le master actuel — signalé,
   *  jamais supprimé. */
  routinesCodeesDisparuesDuMaster: RoutineReperee[];
  lignesIgnoreesRoutines: LigneIgnoree[];
  lignesIgnoreesLiaisons: LigneIgnoree[];
  /** Messages d'attention générale (ex. teinte/étiquette par défaut à régler
   *  manuellement sur les routines nouvellement créées). */
  avertissements: string[];
}

/** Rend un slug de routine unique, en suffixant -2, -3… en cas de collision. */
async function slugRoutineUnique(base: string): Promise<string> {
  const racine = base || "routine";
  let candidat = racine;
  let suffixe = 2;
  for (;;) {
    const existante = await prisma.routine.findUnique({ where: { slug: candidat } });
    if (!existante) return candidat;
    candidat = `${racine}-${suffixe}`;
    suffixe += 1;
  }
}

type GesteResolu = {
  position: number;
  role: string;
  moment: string;
  sku: string;
  productId: string;
};

/**
 * Vrai si deux listes de gestes, DÉJÀ DANS L'ORDRE D'AFFICHAGE, décrivent
 * exactement la même routine : même nombre de gestes, mêmes SKU, mêmes rôles,
 * mêmes moments, dans le même ordre. Un ordre différent avec les mêmes
 * produits n'est PAS considéré comme identique — le master fait foi sur
 * l'ordre autant que sur la composition.
 */
export function gestesIdentiques(
  actuels: { sku: string; role: string; moment: string }[],
  attendus: { sku: string; role: string; moment: string }[],
): boolean {
  return (
    actuels.length === attendus.length &&
    actuels.every((g, i) => g.sku === attendus[i].sku && g.role === attendus[i].role && g.moment === attendus[i].moment)
  );
}

/**
 * Rapproche les 14 routines du master aux routines en base par `code`, crée
 * celles qui manquent, met à jour les autres, et remplace en bloc les gestes
 * d'une routine dès que leur composition ou leur ordre change.
 *
 * ── CE QUE LE MASTER NE DONNE PAS ───────────────────────────────────────────
 *
 * `slug`, `tint`, `besoinTag` et `image` n'ont pas de colonne source dans le
 * master : une routine nouvellement créée reçoit un slug dérivé du nom (rendu
 * unique) et les valeurs par défaut du schéma pour le reste (`tint: "acne"`,
 * `besoinTag`/`image` vides). Les inventer autrement serait une décision de
 * merchandising que ce module ne doit pas prendre à la place du commerçant —
 * le compte rendu le rappelle (`avertissements`).
 *
 * `RoutineStep.label` (le « Geste » affiché aujourd'hui sur la page routine)
 * n'a pas non plus de colonne dédiée : il reprend la valeur de `Role`, seule
 * colonne du master qui joue ce rôle (« Nettoyer », « Corriger »…). `why`
 * n'a aucune source dans le master ; il reste vide et NE SURVIT PAS à un
 * remplacement de gestes — une valeur saisie à la main via l'écran de
 * traduction serait perdue si les gestes de sa routine changent au master.
 */
export async function importerRoutinesMaster(lecture: LectureMaster): Promise<CompteRenduRoutines> {
  const produits = await prisma.product.findMany({ select: { id: true, sku: true } });
  const produitsParSku = new Map<string, { id: string; sku: string }[]>();
  for (const produit of produits) {
    const liste = produitsParSku.get(produit.sku) ?? [];
    liste.push(produit);
    produitsParSku.set(produit.sku, liste);
  }

  const liaisonsParCode = new Map<string, LiaisonMaster[]>();
  for (const liaison of lecture.liaisons) {
    const liste = liaisonsParCode.get(liaison.routineCode) ?? [];
    liste.push(liaison);
    liaisonsParCode.set(liaison.routineCode, liste);
  }
  for (const liste of liaisonsParCode.values()) liste.sort((a, b) => a.etape - b.etape);

  const routinesExistantes = await prisma.routine.findMany({
    where: { code: { not: null } },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: { product: { select: { sku: true } } },
      },
    },
  });
  const existantesParCode = new Map(routinesExistantes.map((r) => [r.code as string, r]));

  const legacy = await prisma.routine.findMany({
    where: { code: null },
    select: { slug: true, name: true },
  });

  const compteRendu: CompteRenduRoutines = {
    creees: [],
    misesAJour: [],
    inchangees: [],
    gestesRemplaces: [],
    routinesAnnulees: [],
    routinesHorsMaster: legacy.map((r) => ({ slug: r.slug, nom: r.name })),
    routinesCodeesDisparuesDuMaster: [],
    lignesIgnoreesRoutines: lecture.routinesIgnorees,
    lignesIgnoreesLiaisons: lecture.liaisonsIgnorees,
    avertissements: [],
  };

  const codesDuMaster = new Set(lecture.routines.map((r) => r.code));

  for (const routine of lecture.routines) {
    const liaisons = liaisonsParCode.get(routine.code) ?? [];

    if (liaisons.length === 0) {
      compteRendu.routinesAnnulees.push({
        code: routine.code,
        ligne: routine.ligne,
        raison: "aucun geste trouvé dans PRODUITS_ROUTINES pour ce code",
      });
      continue;
    }

    // Résolution des SKU. Un SKU introuvable, ambigu (plusieurs produits du
    // même SKU) ou dupliqué DANS la routine annule TOUTE la routine — une
    // routine amputée d'une étape est pire qu'une routine absente.
    const skusIntrouvablesOuAmbigus = new Set<string>();
    const skusEnDouble = new Set<string>();
    const skusVus = new Set<string>();
    const gestesResolus: GesteResolu[] = [];

    for (const liaison of liaisons) {
      const candidats = produitsParSku.get(liaison.sku) ?? [];
      if (candidats.length !== 1) {
        skusIntrouvablesOuAmbigus.add(liaison.sku);
        continue;
      }
      if (skusVus.has(liaison.sku)) {
        skusEnDouble.add(liaison.sku);
        continue;
      }
      skusVus.add(liaison.sku);
      gestesResolus.push({
        position: liaison.etape,
        role: liaison.role,
        moment: liaison.moment,
        sku: liaison.sku,
        productId: candidats[0].id,
      });
    }

    if (skusIntrouvablesOuAmbigus.size > 0 || skusEnDouble.size > 0) {
      const raisons: string[] = [];
      if (skusIntrouvablesOuAmbigus.size > 0) {
        raisons.push(`SKU introuvable ou ambigu : ${[...skusIntrouvablesOuAmbigus].join(", ")}`);
      }
      if (skusEnDouble.size > 0) {
        raisons.push(`SKU répété dans la même routine : ${[...skusEnDouble].join(", ")}`);
      }
      compteRendu.routinesAnnulees.push({
        code: routine.code,
        ligne: routine.ligne,
        raison: raisons.join(" ; "),
      });
      continue;
    }

    const existante = existantesParCode.get(routine.code);

    if (!existante) {
      const slug = await slugRoutineUnique(slugify(routine.nom));
      const position = await prisma.routine.count();
      const cree = await prisma.routine.create({
        data: {
          code: routine.code,
          slug,
          name: routine.nom,
          claim: routine.promesse,
          niveau: routine.niveau,
          profilCible: routine.profilCible,
          usageMatin: routine.usageMatin,
          usageSoir: routine.usageSoir,
          badge: routine.badge,
          noteKossKoss: routine.noteKossKoss,
          position,
        },
      });
      await prisma.routineStep.createMany({
        data: gestesResolus.map((g) => ({
          routineId: cree.id,
          productId: g.productId,
          label: g.role,
          role: g.role,
          moment: g.moment,
          position: g.position,
        })),
      });
      compteRendu.creees.push({ code: routine.code, nom: routine.nom });
      compteRendu.gestesRemplaces.push({
        code: routine.code,
        nom: routine.nom,
        avant: 0,
        apres: gestesResolus.length,
      });
      continue;
    }

    const patchContenu: Record<string, string> = {};
    if (existante.name !== routine.nom) patchContenu.name = routine.nom;
    if (existante.claim !== routine.promesse) patchContenu.claim = routine.promesse;
    if (existante.niveau !== routine.niveau) patchContenu.niveau = routine.niveau;
    if (existante.profilCible !== routine.profilCible) patchContenu.profilCible = routine.profilCible;
    if (existante.usageMatin !== routine.usageMatin) patchContenu.usageMatin = routine.usageMatin;
    if (existante.usageSoir !== routine.usageSoir) patchContenu.usageSoir = routine.usageSoir;
    if (existante.badge !== routine.badge) patchContenu.badge = routine.badge;
    if (existante.noteKossKoss !== routine.noteKossKoss) patchContenu.noteKossKoss = routine.noteKossKoss;

    const gestesActuels = existante.steps.map((s) => ({ sku: s.product.sku, role: s.role, moment: s.moment }));
    const memesGestes = gestesIdentiques(gestesActuels, gestesResolus);

    if (Object.keys(patchContenu).length === 0 && memesGestes) {
      compteRendu.inchangees.push({ code: routine.code, nom: routine.nom });
      continue;
    }

    if (Object.keys(patchContenu).length > 0) {
      await prisma.routine.update({ where: { id: existante.id }, data: patchContenu });
      compteRendu.misesAJour.push({ code: routine.code, nom: routine.nom });
    }

    if (!memesGestes) {
      await prisma.$transaction([
        prisma.routineStep.deleteMany({ where: { routineId: existante.id } }),
        prisma.routineStep.createMany({
          data: gestesResolus.map((g) => ({
            routineId: existante.id,
            productId: g.productId,
            label: g.role,
            role: g.role,
            moment: g.moment,
            position: g.position,
          })),
        }),
      ]);
      compteRendu.gestesRemplaces.push({
        code: routine.code,
        nom: routine.nom,
        avant: gestesActuels.length,
        apres: gestesResolus.length,
      });
    }
  }

  for (const [code, existante] of existantesParCode) {
    if (!codesDuMaster.has(code)) {
      compteRendu.routinesCodeesDisparuesDuMaster.push({ code, nom: existante.name });
    }
  }

  if (compteRendu.creees.length > 0) {
    compteRendu.avertissements.push(
      `${compteRendu.creees.length} routine(s) créée(s) avec la teinte par défaut (« acne ») et une ` +
        "étiquette de besoin vide — le master ne fournit ni l'une ni l'autre. À régler manuellement.",
    );
  }

  return compteRendu;
}

// ---- Déclenchement complet (tâche 4) -----------------------------------------

export interface CompteRenduLecture {
  totalFiches: number;
  totalRoutines: number;
  totalLiaisons: number;
  fichesIgnorees: LigneIgnoree[];
  routinesIgnorees: LigneIgnoree[];
  liaisonsIgnorees: LigneIgnoree[];
}

export interface CompteRenduMaster {
  lecture: CompteRenduLecture;
  fiches: CompteRenduFiches;
  routines: CompteRenduRoutines;
}

/**
 * Lit le master puis lance les deux imports (fiches, routines) l'un après
 * l'autre — les routines dépendent des produits déjà à jour pour résoudre
 * leurs gestes par SKU. Point d'entrée unique appelé par la route du
 * back-office (`src/app/api/admin/master-import/route.ts`).
 */
export async function importerMaster(chemin: string = CHEMIN_MASTER_PAR_DEFAUT): Promise<CompteRenduMaster> {
  const lecture = await lireMaster(chemin);
  const fiches = await importerFichesMaster(lecture);
  const routines = await importerRoutinesMaster(lecture);

  return {
    lecture: {
      totalFiches: lecture.fiches.length,
      totalRoutines: lecture.routines.length,
      totalLiaisons: lecture.liaisons.length,
      fichesIgnorees: lecture.fichesIgnorees,
      routinesIgnorees: lecture.routinesIgnorees,
      liaisonsIgnorees: lecture.liaisonsIgnorees,
    },
    fiches,
    routines,
  };
}
