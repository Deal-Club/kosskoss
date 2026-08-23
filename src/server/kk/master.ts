import path from "node:path";
import { readSheet, type CellValue, type Row } from "read-excel-file/node";
import { estNiveau, type NiveauRoutine } from "@/lib/kk/routines-niveau";
import { isValidGtin } from "@/lib/gtin";
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
